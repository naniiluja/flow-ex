import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "../../domain/app-error.ts";
import type { AudioGenerationContext, TtsProvider } from "../../domain/providers.ts";
import { makeToneWav } from "./synthetic-media.ts";

const DEFAULT_DURATION_MS = 1500;

export interface FakeTtsProviderOptions {
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`); WAVs are written
   * under its `audio/` subfolder and `GeneratedAudio.file` is returned relative to THIS root
   * (e.g. "audio/000.wav"), matching what `GET /api/projects/:id/assets/*` serves. */
  assetsDir: string;
  /** sceneIndex -> how many transient AppErrors to throw before succeeding. */
  transientFailuresBeforeSuccess?: Record<number, number>;
  /** sceneIndex -> an AppError to throw on every call for that scene (never succeeds). */
  alwaysFail?: Record<number, AppError>;
  /** Overrides the fixed default duration for a given scene, e.g. to exercise timing edge cases. */
  durationMsForScene?: Record<number, number>;
}

/** Test/dev-only `TtsProvider` (../../.claude/rules/architecture.md provider/strategy pattern):
 * writes a real, decodable WAV tone instead of calling the Vbee API, so the pipeline and the real
 * render step (task 002) can be exercised end to end without a live TTS call. Replaced by
 * `VbeeTtsProvider` in task 004. */
export function createFakeTtsProvider(options: FakeTtsProviderOptions): TtsProvider {
  const callCounts = new Map<number, number>();

  async function synthesize(
    _text: string,
    context: AudioGenerationContext,
  ): Promise<{ file: string; durationMs: number }> {
    const alwaysFailError = options.alwaysFail?.[context.sceneIndex];
    if (alwaysFailError) {
      throw alwaysFailError;
    }

    const priorCalls = callCounts.get(context.sceneIndex) ?? 0;
    callCounts.set(context.sceneIndex, priorCalls + 1);
    const failuresRemaining = options.transientFailuresBeforeSuccess?.[context.sceneIndex] ?? 0;
    if (priorCalls < failuresRemaining) {
      throw new AppError({
        code: "FAKE_TTS_TRANSIENT_FAILURE",
        errorKind: "transient",
        message: `fake tts provider: simulated transient failure ${String(priorCalls + 1)}/${String(failuresRemaining)} for scene ${String(context.sceneIndex)}`,
        context: { projectId: context.projectId, sceneIndex: context.sceneIndex },
      });
    }

    const durationMs = options.durationMsForScene?.[context.sceneIndex] ?? DEFAULT_DURATION_MS;
    const fileName = `${String(context.sceneIndex).padStart(3, "0")}.wav`;
    const audioDir = path.join(options.assetsDir, "audio");
    await fs.mkdir(audioDir, { recursive: true });
    await fs.writeFile(path.join(audioDir, fileName), makeToneWav(durationMs));

    return { file: `audio/${fileName}`, durationMs };
  }

  return { synthesize };
}
