import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "../../domain/app-error.ts";
import type { ImageGenerationContext, ImageProvider } from "../../domain/providers.ts";
import { makeSolidColorPng, type RgbColor } from "./synthetic-media.ts";

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_COLORS: readonly RgbColor[] = [
  { r: 220, g: 60, b: 60 },
  { r: 60, g: 160, b: 90 },
  { r: 60, g: 100, b: 220 },
  { r: 200, g: 170, b: 60 },
];

export interface FakeImageProviderOptions {
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`); PNGs are written
   * under its `images/` subfolder and `GeneratedImage.file` is returned relative to THIS root
   * (e.g. "images/000.png"), matching what `GET /api/projects/:id/assets/*` serves. */
  assetsDir: string;
  /** sceneIndex -> how many transient AppErrors to throw before succeeding. Lets a test drive
   * the retry schedule deterministically without a real flaky network call. */
  transientFailuresBeforeSuccess?: Record<number, number>;
  /** sceneIndex -> an AppError to throw on every call for that scene (never succeeds). */
  alwaysFail?: Record<number, AppError>;
  /** sceneIndex -> milliseconds to wait (real timer, no IO otherwise) before writing the file.
   * Used ONLY to open a deterministic window for the process-kill resume test
   * (pipeline-resume-process-kill.test.ts) to land its SIGKILL mid-step; not used in normal
   * pipeline runs. */
  delayMsForScene?: Record<number, number>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Test/dev-only `ImageProvider` (../../.claude/rules/architecture.md provider/strategy pattern):
 * writes a real, decodable solid-color PNG instead of calling Google Flow, so the pipeline and
 * the real render step (task 002) can be exercised end to end without Playwright or Flow
 * credits. Replaced by `FlowImageProvider` in task 005. */
export function createFakeImageProvider(options: FakeImageProviderOptions): ImageProvider {
  const callCounts = new Map<number, number>();

  async function generateImage(
    _prompt: string,
    context: ImageGenerationContext,
  ): Promise<{ file: string; width: number; height: number }> {
    const alwaysFailError = options.alwaysFail?.[context.sceneIndex];
    if (alwaysFailError) {
      throw alwaysFailError;
    }

    const priorCalls = callCounts.get(context.sceneIndex) ?? 0;
    callCounts.set(context.sceneIndex, priorCalls + 1);
    const failuresRemaining = options.transientFailuresBeforeSuccess?.[context.sceneIndex] ?? 0;
    if (priorCalls < failuresRemaining) {
      throw new AppError({
        code: "FAKE_IMAGE_TRANSIENT_FAILURE",
        errorKind: "transient",
        message: `fake image provider: simulated transient failure ${String(priorCalls + 1)}/${String(failuresRemaining)} for scene ${String(context.sceneIndex)}`,
        context: { projectId: context.projectId, sceneIndex: context.sceneIndex },
      });
    }

    const delayMs = options.delayMsForScene?.[context.sceneIndex];
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }

    const color = DEFAULT_COLORS[context.sceneIndex % DEFAULT_COLORS.length];
    if (color === undefined) {
      throw new Error("fake-image-provider: unreachable, modulo index is always in range");
    }
    // `priorCalls` (already tracked above for the transient-failure simulation) doubles as a
    // per-scene call counter here, so each call gets a UNIQUE file name — same reasoning as
    // `FlowImageProvider`'s own UUID-based name: a "Sinh lại" regenerate (task 006) must produce
    // a genuinely new variant on disk, not overwrite the previous one under the same path.
    const fileName = `${String(context.sceneIndex).padStart(3, "0")}-${String(priorCalls)}.png`;
    const imagesDir = path.join(options.assetsDir, "images");
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.writeFile(
      path.join(imagesDir, fileName),
      makeSolidColorPng(DEFAULT_WIDTH, DEFAULT_HEIGHT, color),
    );

    return { file: `images/${fileName}`, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  return { generateImage };
}
