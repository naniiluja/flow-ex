import fs from "node:fs/promises";
import path from "node:path";

import type { Logger } from "pino";
import type { Browser, BrowserContext, Page } from "playwright";

import { AppError } from "../../domain/app-error.ts";
import type {
  GeneratedImage,
  ImageGenerationContext,
  ImageProvider,
} from "../../domain/providers.ts";
import { connectToFlowChrome } from "./chrome-connection.ts";
import {
  configureAspectRatioAndBatch,
  ensureAgentModeOff,
  ensureLoggedIn,
  submitAndWaitForImage,
  typeIntoPromptBox,
} from "./flow-automation.ts";

const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const DEFAULT_EXTENSION = "png";

export interface FlowImageProviderOptions {
  userDataDir: string;
  cdpPort: number;
  chromeExecutablePath?: string;
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`), matching every
   * other provider's convention (see `FakeImageProvider`/`VbeeTtsProvider`). Error artifacts
   * (screenshot + page HTML) go one level up, under `<projectRoot>/logs/flow-errors/`. */
  assetsDir: string;
}

/** Wraps any error that isn't already a domain `AppError` (e.g. a raw Playwright TimeoutError
 * from a UI element never appearing) as `transient` — a UI hiccup or a slow Flow response may
 * resolve on the shared retry schedule (../../.claude/rules/error-handling.md). An `AppError`
 * `ensureLoggedIn`/etc. already threw (e.g. `needs_user`) passes through unchanged. */
export function toDomainError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError({
    code: "FLOW_AUTOMATION_ERROR",
    errorKind: "transient",
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/** On ANY error inside this provider, saves a screenshot + `page.content()` as run artifacts
 * BEFORE rethrowing (../../.claude/rules/logging.md, flow-automation.md) — the single most useful
 * evidence for diagnosing a Flow UI change or a stuck selector after the fact. Best-effort: a
 * failure while capturing the artifact itself never masks the original error. */
export async function captureErrorArtifacts(
  page: Page,
  assetsDir: string,
  sceneIndex: number,
  logger: Logger | undefined,
): Promise<string | undefined> {
  try {
    const projectRoot = path.dirname(assetsDir);
    const artifactsDir = path.join(projectRoot, "logs", "flow-errors");
    const stamp = `${String(sceneIndex).padStart(3, "0")}-${String(Date.now())}`;
    await fs.mkdir(artifactsDir, { recursive: true });
    await page.screenshot({ path: path.join(artifactsDir, `${stamp}.png`) });
    await fs.writeFile(path.join(artifactsDir, `${stamp}.html`), await page.content());
    return artifactsDir;
  } catch (captureError) {
    // Best-effort only; the ORIGINAL error is what matters and is rethrown by the caller — never
    // rethrow this one instead. This catches EVERYTHING in the function body (not just the
    // awaited calls) on purpose: a bad `assetsDir` from a misbehaving caller must not itself
    // become the error that surfaces. Still logged (error-handling.md's "No silent catch" — a
    // caught error must be logged or rethrown, never dropped silently either way).
    logger?.warn(
      { sceneIndex, err: { message: String(captureError) } },
      "flow.image.artifact_capture.error",
    );
    return undefined;
  }
}

export async function downloadImage(
  context: BrowserContext,
  src: string,
): Promise<{ buffer: Buffer; extension: string }> {
  const response = await context.request.get(src);
  if (!response.ok()) {
    throw new AppError({
      code: "FLOW_IMAGE_DOWNLOAD_FAILED",
      errorKind: "transient",
      message: `downloading the generated image returned HTTP ${String(response.status())}`,
      context: { status: response.status() },
    });
  }
  const contentType = response.headers()["content-type"]?.split(";")[0]?.trim();
  const extension =
    (contentType !== undefined ? CONTENT_TYPE_EXTENSION[contentType] : undefined) ??
    DEFAULT_EXTENSION;
  return { buffer: await response.body(), extension };
}

/** Real `ImageProvider` (../../.claude/rules/architecture.md provider/strategy pattern) driving
 * Google Flow through a real, dedicated Chrome profile over CDP. Replaces `FakeImageProvider`
 * (task 003) when wired in. Connects lazily on first use and reuses the SAME browser/page across
 * calls (`pipeline-engine.ts` only ever calls one scene's image step at a time, so no
 * concurrency guard is needed — the same reasoning `vbee-tts.md` recorded for Vbee). Never calls
 * `browser.close()`: the dedicated Chrome window is the user's to watch/close, and closing a
 * CDP-attached browser can terminate the underlying process. */
export function createFlowImageProvider(options: FlowImageProviderOptions): ImageProvider {
  let connection: Promise<{ browser: Browser; context: BrowserContext; page: Page }> | undefined;

  async function getConnection(): Promise<{
    browser: Browser;
    context: BrowserContext;
    page: Page;
  }> {
    if (connection === undefined) {
      // `attempt` is captured by the closures below BEFORE `connection` is assigned to it a few
      // lines later — safe because neither closure runs until after an `await`/async event, by
      // which point the assignment has long since completed synchronously.
      const attempt: Promise<{ browser: Browser; context: BrowserContext; page: Page }> =
        (async () => {
          const browser = await connectToFlowChrome({
            userDataDir: options.userDataDir,
            cdpPort: options.cdpPort,
            chromeExecutablePath: options.chromeExecutablePath,
          });
          // If the user closes this Chrome window (or it crashes), the CACHED connection would
          // otherwise keep looking "connected" forever; dropping the cache lets the NEXT call
          // reconnect/relaunch instead of failing indefinitely against a dead browser. Only
          // clears `connection` if it is STILL this exact attempt — an event delivered late for
          // an already-superseded browser must not discard a newer, healthy connection some
          // other call already established in the meantime.
          browser.on("disconnected", () => {
            if (connection === attempt) {
              connection = undefined;
            }
          });
          const context = browser.contexts()[0] ?? (await browser.newContext());
          const page = context.pages()[0] ?? (await context.newPage());
          if (page.url() === "about:blank") {
            await page.goto("https://flow.google.com/");
          }
          return { browser, context, page };
        })().catch((error: unknown) => {
          // A rejected promise assigned to `connection` would otherwise stay cached forever
          // (only re-running the initializer when `connection` is `undefined`), turning every
          // future call into an instant repeat of the SAME stale failure — defeating the outer
          // `retryWithSchedule`'s whole point of trying again later (e.g. once the user has
          // logged in, or Chrome has finished starting up).
          if (connection === attempt) {
            connection = undefined;
          }
          throw error;
        });
      connection = attempt;
    }
    return connection;
  }

  async function generateImage(
    prompt: string,
    ctx: ImageGenerationContext,
  ): Promise<GeneratedImage> {
    const logFields = { projectId: ctx.projectId, sceneIndex: ctx.sceneIndex };
    ctx.logger?.info(logFields, "flow.image.generate");
    let page: Page | undefined;
    try {
      const connected = await getConnection();
      page = connected.page;
      const { context } = connected;
      await ensureLoggedIn(page);
      await ensureAgentModeOff(page);
      await configureAspectRatioAndBatch(page, ctx.aspectRatio);
      await typeIntoPromptBox(page, prompt);
      const generated = await submitAndWaitForImage(page);

      const { buffer, extension } = await downloadImage(context, generated.src);
      // Flow's own generation UUID (unique per submit, flow-automation.md) makes the file name
      // unique per call — required so a "Sinh lại" regenerate (task 006) never overwrites a prior
      // variant under the same path; a bare `<sceneIndex>.<ext>` name would silently collapse
      // every variant of one scene onto a single file on disk.
      const fileName = `${String(ctx.sceneIndex).padStart(3, "0")}-${generated.uuid}.${extension}`;
      const imagesDir = path.join(options.assetsDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });
      await fs.writeFile(path.join(imagesDir, fileName), buffer);

      ctx.logger?.info(logFields, "flow.image.generate.success");
      return { file: `images/${fileName}`, width: generated.width, height: generated.height };
    } catch (error) {
      const domainError = toDomainError(error);
      // `page` is still `undefined` if `getConnection()` itself failed (no browser ever opened);
      // there's nothing to screenshot in that case, so artifact capture is skipped rather than
      // called with a missing page.
      const artifactsDir =
        page !== undefined
          ? await captureErrorArtifacts(page, options.assetsDir, ctx.sceneIndex, ctx.logger)
          : undefined;
      ctx.logger?.error(
        {
          ...logFields,
          err: { code: domainError.code, message: domainError.message },
          artifactsDir,
        },
        "flow.image.generate.error",
      );
      throw domainError;
    }
  }

  return { generateImage };
}
