import fs from "node:fs/promises";
import path from "node:path";

import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
  type WhisperModel,
} from "@remotion/install-whisper-cpp";
import type { Logger } from "pino";

import { AppError } from "../../domain/app-error.ts";
import type {
  GeneratedCaptions,
  TranscriptionContext,
  TranscriptionProvider,
} from "../../domain/providers.ts";
import { alignCaptionsToNarration } from "./align-captions-to-narration.ts";
import { convertToWav16kMono } from "./convert-to-wav.ts";

export interface WhisperTranscriptionProviderOptions {
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`); captions JSON is
   * written under its `captions/` subfolder, matching every other provider's convention
   * (../../.claude/rules/data-layer.md). */
  assetsDir: string;
  /** Where whisper.cpp itself (the binary) plus its downloaded model are cached — shared across
   * every project/request in this process, never per-project, since the binary+model are large
   * (hundreds of MB to a few GB) and installing/downloading is idempotent
   * (`installWhisperCpp`/`downloadWhisperModel` both report `alreadyExisted` and skip the work). */
  whisperCacheDir: string;
  /** A MULTILINGUAL model (no `.en` suffix, video.md's Captions rule) — Vietnamese narration
   * needs the multilingual weights; an English-only model has no Vietnamese vocabulary at all. */
  model: WhisperModel;
  whisperCppVersion: string;
  logger?: Logger;
}

/** Real `TranscriptionProvider` (task 007, ../../.claude/rules/architecture.md provider/strategy
 * pattern): converts the scene's Vbee-generated MP3 to a 16kHz mono WAV, runs it through
 * whisper.cpp forced to `language: 'vi'` with token-level timestamps, and writes the resulting
 * `Caption[]` (`@remotion/captions`' own shape, task 007) to `captions/<sceneIndex>.json`. The
 * install+model download is lazy and runs at most ONCE per process (not per scene, not per
 * project), the first time `transcribe` is actually called. */
export function createWhisperTranscriptionProvider(
  options: WhisperTranscriptionProviderOptions,
): TranscriptionProvider {
  let readyPromise: Promise<void> | undefined;

  function ensureReady(): Promise<void> {
    readyPromise ??= (async () => {
      await installWhisperCpp({ to: options.whisperCacheDir, version: options.whisperCppVersion });
      await downloadWhisperModel({ folder: options.whisperCacheDir, model: options.model });
    })();
    return readyPromise;
  }

  async function transcribeScene(
    audioFile: string,
    context: TranscriptionContext,
  ): Promise<GeneratedCaptions> {
    const logger = context.logger ?? options.logger;
    const absoluteAudioPath = path.join(options.assetsDir, audioFile);
    const wavPath = `${absoluteAudioPath}.16k.wav`;
    const logFields = { projectId: context.projectId, sceneIndex: context.sceneIndex };

    logger?.info(logFields, "whisper.transcribe.start");
    try {
      await ensureReady();
      await convertToWav16kMono(absoluteAudioPath, wavPath);

      const whisperOutput = await transcribe({
        inputPath: wavPath,
        whisperPath: options.whisperCacheDir,
        whisperCppVersion: options.whisperCppVersion,
        model: options.model,
        tokenLevelTimestamps: true,
        language: "vi",
      });
      const { captions: whisperCaptions } = toCaptions({ whisperCppOutput: whisperOutput });
      // Whisper transcribes the AUDIO, so a word Vbee's voice pronounced ambiguously can come
      // back misheard/misspelled; the pipeline already knows the exact script it sent to Vbee,
      // so prefer that text and keep only whisper's real per-word timing (see
      // align-captions-to-narration.ts's own doc comment for the exact-count-only guard).
      const captions = alignCaptionsToNarration(whisperCaptions, context.narration);

      const fileName = `${String(context.sceneIndex).padStart(3, "0")}.json`;
      const captionsDir = path.join(options.assetsDir, "captions");
      await fs.mkdir(captionsDir, { recursive: true });
      await fs.writeFile(path.join(captionsDir, fileName), JSON.stringify(captions));

      logger?.info(logFields, "whisper.transcribe.success");
      return { file: `captions/${fileName}` };
    } catch (cause) {
      logger?.error({ ...logFields, err: cause }, "whisper.transcribe.error");
      // A whisper.cpp/ffmpeg process failure is almost always environmental (disk full, a
      // corrupt download, an unreadable audio file) rather than input the pipeline could ever
      // fix by itself — `transient` lets the shared retry schedule (error-handling.md) give a
      // one-off hiccup a chance to clear before the scene is marked failed.
      throw new AppError({
        code: "WHISPER_TRANSCRIBE_FAILED",
        errorKind: "transient",
        message: "Transcribing the scene's audio with whisper.cpp failed",
        cause,
        context: logFields,
      });
    } finally {
      // Best-effort cleanup of the temporary 16kHz WAV; never let a cleanup failure mask the
      // real result/error above, but still log it (error-handling.md's "No silent catch" cuts
      // both ways — same pattern as flow-image-provider.ts's captureErrorArtifacts).
      await fs.unlink(wavPath).catch((cleanupError: unknown) => {
        logger?.warn({ ...logFields, err: cleanupError }, "whisper.wav_cleanup.error");
      });
    }
  }

  return { transcribe: transcribeScene };
}
