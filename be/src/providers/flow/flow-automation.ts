import type { AspectRatio } from "@flow-ex/shared-schemas";
import type { Page } from "playwright";

import { AppError } from "../../domain/app-error.ts";

// Selectors verified live against a real open https://flow.google.com/project/<uuid> page
// (../../.claude/rules/flow-automation.md); re-run the preflight check (./preflight.ts) if
// Flow's UI has changed.
//
// `.ProseMirror` is intentionally UNSCOPED to any outer tag. Flow swaps the entire wrapping
// custom element based on the agent-mode toggle's OWN state: `flow-creative-agent-prompt-box`
// while agent mode is ON, `flow-prompt-box` once it's OFF — verified live 2026-09-17 by watching
// the SAME editor's ancestor chain change after clicking the agent-mode chip. Scoping this
// selector to either tag name breaks the moment the OTHER state is active; `.ProseMirror` alone
// was confirmed unique on the page in both states, so it is the only stable anchor.
// `agent-mode-chip`/`settings-trigger-button` are unchanged from the 2026-09-16 survey.
const PROMPT_EDITOR_SELECTOR = ".ProseMirror";
const AGENT_MODE_CHIP_SELECTOR = "button.agent-mode-chip";
const SETTINGS_TRIGGER_SELECTOR = "button.settings-trigger-button";
const GENERATE_BUTTON_SELECTOR = "button.generate-icon-button";

const LOGIN_CHECK_TIMEOUT_MS = 5_000;
const IMAGE_GENERATION_TIMEOUT_MS = 90_000; // observed ~25-30s live; wide margin for slow runs

const ASPECT_RATIO_ICON: Record<AspectRatio, string> = {
  "16:9": "crop_16_9",
  "9:16": "crop_9_16",
};

export interface GeneratedImageRef {
  src: string;
  uuid: string;
  width: number;
  height: number;
}

/** Throws `needs_user` if the prompt box never appears within a short budget — the ONLY reliable
 * "not logged in" signal available (../../.claude/rules/flow-automation.md), since a
 * not-logged-in page shows a Google sign-in flow instead. `timeoutMs` is injectable so a test can
 * shrink the wait budget instead of the real 5s default. */
export async function ensureLoggedIn(
  page: Page,
  timeoutMs = LOGIN_CHECK_TIMEOUT_MS,
): Promise<void> {
  const found = await page
    .locator(PROMPT_EDITOR_SELECTOR)
    .first()
    .waitFor({ state: "attached", timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
  if (!found) {
    throw new AppError({
      code: "FLOW_NOT_LOGGED_IN",
      errorKind: "needs_user",
      message:
        "Flow's prompt box never appeared; either the dedicated Chrome profile needs a manual " +
        "Google sign-in, or its Flow tab is not sitting on an actual open project " +
        "(https://flow.google.com/project/<uuid> — the home/project-list page has no prompt box)",
    });
  }
}

/** Agent mode must be OFF to generate an image directly instead of routing through an agent
 * flow (../../.claude/rules/flow-automation.md). */
export async function ensureAgentModeOff(page: Page): Promise<void> {
  const chip = page.locator(AGENT_MODE_CHIP_SELECTOR).first();
  const pressed = await chip.getAttribute("aria-pressed");
  if (pressed === "true") {
    await chip.click();
  }
}

/** Opens the settings overlay, selects the aspect ratio matching `project.json`'s
 * `aspectRatio` and a single-image batch count (x1 — this pipeline consumes exactly one image
 * per scene), then closes the overlay by clicking `SETTINGS_TRIGGER_SELECTOR` again (a toggle
 * click on the same trigger, per its observed live behavior), rather than a blind click at a
 * guessed "empty" page coordinate: flow-automation.md notes Escape does not reliably close the
 * overlay, but a fixed coordinate risks landing on real chrome (the top nav/logo) since the
 * overlay's own footprint shifts with viewport size. Deliberately leaves the MODEL choice
 * untouched: `project.json` carries no per-project model field, so whatever the account's
 * current default is stays in effect (scope decision for this thin slice). */
export async function configureAspectRatioAndBatch(
  page: Page,
  aspectRatio: AspectRatio,
): Promise<void> {
  const settingsTrigger = page.locator(SETTINGS_TRIGGER_SELECTOR).first();
  await settingsTrigger.click();
  const iconName = ASPECT_RATIO_ICON[aspectRatio];
  await page.locator("mat-button-toggle", { hasText: iconName }).first().click();
  await page.locator("mat-button-toggle", { hasText: /^x1$/ }).first().click();
  await settingsTrigger.click();
}

/** Types `prompt` into the ProseMirror editor, asserting focus BEFORE typing — skipping this
 * assertion risks firing the page's own keyboard shortcuts instead of entering text
 * (../../.claude/rules/flow-automation.md's critical gotcha). */
export async function typeIntoPromptBox(page: Page, prompt: string): Promise<void> {
  const editor = page.locator(PROMPT_EDITOR_SELECTOR).first();
  await editor.click();
  await editor.waitFor({ state: "visible" });
  const isFocused = await editor.evaluate((el) => el === document.activeElement);
  if (!isFocused) {
    throw new AppError({
      code: "FLOW_PROMPT_BOX_NOT_FOCUSED",
      errorKind: "transient",
      message: "the Flow prompt editor did not receive focus after clicking it",
    });
  }
  // Clears any leftover text from a prior failed attempt on this SAME retry cycle (the page is
  // reused across `retryWithSchedule` attempts, ../../.claude/rules/error-handling.md) — without
  // this, a retry after a failed submit would append onto the old prompt instead of replacing it.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await editor.pressSequentially(prompt);
}

function extractUuid(src: string): string | undefined {
  const uuid = new URL(src).pathname.split("/").pop();
  return uuid === undefined || uuid.length === 0 ? undefined : uuid;
}

const TILE_SELECTOR = "flow-image-tile";

export interface PendingSubmission {
  /** The DOM index (0-based) of the `flow-image-tile` this submit just created, per
   * `../../.claude/rules/flow-automation.md`'s "Tile identity" note: a `generate-icon-button`
   * click synchronously APPENDS a new `flow-image-tile` to the tile list before any async decode
   * work happens, so the tile at `tileCountBefore` (captured right before the click) is
   * deterministically the one THIS submit created, regardless of how many OTHER submits are
   * interleaved on the same page — each one reads its own count immediately before its own click,
   * while holding the submit mutex, so no two submits can ever read the same index. */
  tileIndex: number;
}

/** Task 014: replaces the old UUID-diffing approach (kept only in git history). Two concurrent
 * `generateImage` calls sharing one `Page` used to snapshot "existing UUIDs" and race each other
 * for whichever `<img>` appeared first, silently swapping scenes' images. This function must be
 * called while holding the caller's submit mutex (`./submit-mutex.ts`) — it does the ONE part of
 * a submission that touches shared page state (the click + reading the tile list), and hands back
 * a `tileIndex` cheap enough to identify without any further shared-state reads. The 25-30s decode
 * wait (`waitForImageAtTile`) is deliberately NOT part of this function, so it can run OUTSIDE the
 * mutex — multiple scenes' decode waits proceed in parallel once each has its own tile handle. */
export async function submitImage(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<PendingSubmission> {
  const tileCountBefore = await page.locator(TILE_SELECTOR).count();
  await page.locator(GENERATE_BUTTON_SELECTOR).click({ timeout: timeoutMs });
  await page
    .locator(TILE_SELECTOR)
    .nth(tileCountBefore)
    .waitFor({ state: "attached", timeout: timeoutMs });
  return { tileIndex: tileCountBefore };
}

/** Polls the SPECIFIC tile at `tileIndex` (never any other tile, so it can run concurrently with
 * other scenes' own `waitForImageAtTile` calls against the same page without any shared-state
 * race) until its `<img>` has finished decoding, mirroring the same "both `complete` AND
 * `naturalWidth/Height` positive" check the old implementation used
 * (../../.claude/rules/flow-automation.md's stale-image guard doc). */
export async function waitForImageAtTile(
  page: Page,
  tileIndex: number,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<GeneratedImageRef> {
  const deadline = Date.now() + timeoutMs;
  const imgLocator = page.locator(TILE_SELECTOR).nth(tileIndex).locator("img");

  let result: { src: string; width: number; height: number } | undefined;
  while (result === undefined) {
    if (Date.now() > deadline) {
      throw new AppError({
        code: "FLOW_IMAGE_GENERATION_TIMEOUT",
        errorKind: "transient",
        message: `no generated image appeared at tile ${String(tileIndex)} within ${String(timeoutMs)}ms`,
      });
    }
    const count = await imgLocator.count();
    if (count > 0) {
      const candidate = await imgLocator.first().evaluate((img) => {
        const el = img as HTMLImageElement;
        return {
          src: el.src,
          width: el.naturalWidth,
          height: el.naturalHeight,
          decoded: el.complete && el.naturalWidth > 0 && el.naturalHeight > 0,
        };
      });
      if (candidate.decoded) {
        result = candidate;
      }
    }
    if (result === undefined) {
      await page.waitForTimeout(500);
    }
  }

  const uuid = extractUuid(result.src);
  if (uuid === undefined) {
    throw new AppError({
      code: "FLOW_IMAGE_URL_UNEXPECTED",
      errorKind: "transient",
      message: "the generated image's src did not contain the expected UUID path segment",
      context: { src: result.src },
    });
  }
  return { src: result.src, uuid, width: result.width, height: result.height };
}

/** Composition of `submitImage` + `waitForImageAtTile` for a SINGLE caller driving a page alone
 * (fixture tests, and any single-scene caller with no concurrency to guard against). A caller
 * running MULTIPLE scenes concurrently on one page must instead call `submitImage` inside its own
 * submit mutex and `waitForImageAtTile` outside it — see `flow-image-provider.ts`. */
export async function submitAndWaitForImage(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<GeneratedImageRef> {
  const { tileIndex } = await submitImage(page, timeoutMs);
  return waitForImageAtTile(page, tileIndex, timeoutMs);
}
