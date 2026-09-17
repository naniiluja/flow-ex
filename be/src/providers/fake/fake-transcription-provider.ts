import fs from "node:fs/promises";
import path from "node:path";

import { AppError } from "../../domain/app-error.ts";
import type {
  GeneratedCaptions,
  TranscriptionContext,
  TranscriptionProvider,
} from "../../domain/providers.ts";

export interface FakeTranscriptionProviderOptions {
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`); the captions JSON
   * is written under its `captions/` subfolder, matching `FakeTtsProvider`'s own `audio/`
   * convention (../../.claude/rules/data-layer.md). */
  assetsDir: string;
  /** sceneIndex -> an AppError to throw on every call for that scene (never succeeds). */
  alwaysFail?: Record<number, AppError>;
}

/** Test/dev-only `TranscriptionProvider` (../../.claude/rules/architecture.md provider/strategy
 * pattern): fabricates one caption token per whitespace-delimited word in the scene's OWN
 * narration text, spread evenly across `durationMs`, instead of running whisper.cpp on the real
 * audio. This lets the pipeline and the render step be exercised end to end (task 007) without
 * installing/downloading any real whisper.cpp model. Replaced by `WhisperTranscriptionProvider`
 * when `TRANSCRIBE_PROVIDER=whisper`. */
export function createFakeTranscriptionProvider(
  options: FakeTranscriptionProviderOptions,
): TranscriptionProvider {
  async function transcribe(
    _audioFile: string,
    context: TranscriptionContext,
  ): Promise<GeneratedCaptions> {
    const alwaysFailError = options.alwaysFail?.[context.sceneIndex];
    if (alwaysFailError) {
      throw alwaysFailError;
    }

    const words = context.narration.split(/\s+/).filter((word) => word.length > 0);
    const perTokenMs = words.length === 0 ? 0 : context.durationMs / words.length;
    const captions = words.map((word, index) => {
      const startMs = Math.round(index * perTokenMs);
      const endMs = Math.round((index + 1) * perTokenMs);
      return {
        text: index === 0 ? word : ` ${word}`,
        startMs,
        endMs,
        timestampMs: Math.round((startMs + endMs) / 2),
        confidence: 1,
      };
    });

    const fileName = `${String(context.sceneIndex).padStart(3, "0")}.json`;
    const captionsDir = path.join(options.assetsDir, "captions");
    await fs.mkdir(captionsDir, { recursive: true });
    await fs.writeFile(path.join(captionsDir, fileName), JSON.stringify(captions));

    return { file: `captions/${fileName}` };
  }

  return { transcribe };
}
