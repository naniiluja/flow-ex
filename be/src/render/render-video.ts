import path from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, type RenderMediaOnProgress } from "@remotion/renderer";
import type { MainCompositionProps } from "@flow-ex/video";
// A direct deep import into the ONE plain-.ts file that defines this constant, bypassing
// @flow-ex/video's package barrel (video/src/index.ts) — that barrel also re-exports value
// bindings from .tsx files, and Node's native TypeScript type-stripping (this package's runtime
// mode, per tech-stack.md) cannot load a .tsx file at all. `import type` above is erased entirely
// before module resolution runs, so it never touches that problem; a plain `import` would.
import { MAIN_COMPOSITION_ID } from "@flow-ex/video/src/composition-id.ts";
import type { Logger } from "pino";

import { AppError } from "../domain/app-error.ts";

// video/ and be/ are sibling packages in this monorepo; the bundler needs the ENTRY FILE that
// calls registerRoot(), not the package's public `src/index.ts` export surface.
const VIDEO_ENTRY_POINT = fileURLToPath(new URL("../../../video/src/entry.ts", import.meta.url));

/** `bundle()` is expensive (a full esbuild pass); reuse the same bundle for every render in this
 * process instead of re-bundling per call (video.md). */
let bundleLocationPromise: Promise<string> | null = null;

function getBundleLocation(): Promise<string> {
  bundleLocationPromise ??= bundle({ entryPoint: VIDEO_ENTRY_POINT });
  return bundleLocationPromise;
}

export interface RenderVideoOptions {
  scenes: MainCompositionProps["scenes"];
  aspectRatio: MainCompositionProps["aspectRatio"];
  /** Task 009: drives caption style (font size/weight/padding/token-combine window) via
   * `@flow-ex/shared-schemas`'s `PRESETS` table; defaults to "youtube" so a caller that still
   * only passes `aspectRatio` (e.g. an older test) keeps rendering with a sane caption style. */
  preset?: MainCompositionProps["preset"];
  outputLocation: string;
  /** Optional so this can be called from a plain script/test with no logger wired up yet
   * (task 003's pipeline will always pass one, with `projectId`/`runId` already on its child). */
  logger?: Logger;
  onProgress?: RenderMediaOnProgress;
}

export async function renderVideo(options: RenderVideoOptions): Promise<void> {
  const inputProps: MainCompositionProps = {
    scenes: options.scenes,
    aspectRatio: options.aspectRatio,
    preset: options.preset ?? "youtube",
  };
  const logContext = { stage: "render", sceneCount: options.scenes.length };
  const startedAt = Date.now();
  options.logger?.info(logContext, "render.media.start");

  try {
    // Headless Chrome on this machine has no hardware GPU context; force the ANGLE-over-
    // SwiftShader software renderer so any canvas/WebGL-backed effect still has a GL context to
    // draw into (Remotion's documented fallback for a GPU-less headless environment).
    const chromiumOptions = { gl: "swangle" } as const;

    const serveUrl = await getBundleLocation();
    const composition = await selectComposition({
      serveUrl,
      id: MAIN_COMPOSITION_ID,
      inputProps,
      chromiumOptions,
    });
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: path.resolve(options.outputLocation),
      inputProps,
      chromiumOptions,
      onProgress: options.onProgress,
    });

    options.logger?.info(
      { ...logContext, durationMs: Date.now() - startedAt },
      "render.media.success",
    );
  } catch (cause) {
    options.logger?.error(
      { ...logContext, durationMs: Date.now() - startedAt, err: cause },
      "render.media.error",
    );
    throw new AppError({
      code: "RENDER_FAILED",
      errorKind: "fatal",
      message: "Rendering the composition to a video file failed",
      cause,
      context: { outputLocation: options.outputLocation, sceneCount: options.scenes.length },
    });
  }
}
