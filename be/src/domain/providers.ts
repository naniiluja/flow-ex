import type { Logger } from "pino";

import type { AspectRatio, Project } from "@flow-ex/shared-schemas";

/** Provider/strategy interfaces (../../.claude/rules/architecture.md): the pipeline depends on
 * these, never on a concrete provider (Flow/Vbee/fake) directly, so a provider can be swapped or
 * faked in tests without touching pipeline code. */

export interface ImageGenerationContext {
  projectId: string;
  sceneIndex: number;
  /** From `project.json`'s `aspectRatio` (task 005's `FlowImageProvider` selects the matching
   * Flow settings toggle from this); a stateless provider like `FakeImageProvider` ignores it. */
  aspectRatio: AspectRatio;
  /** Per-run child logger (`{projectId, runId, stage: "image"}`), same rationale as
   * `AudioGenerationContext.logger`'s own doc comment below (pino output only, not the NDJSON
   * run-log file or the SSE stream). `FlowImageProvider` uses it for `flow.image.generate`'s
   * entry/exit; a stateless provider like `FakeImageProvider` ignores it. */
  logger?: Logger;
  /** Absolute filesystem paths to already-generated reference images (task 013/015's
   * `references[]`/`referenceIds`) this scene should stay visually consistent with. Attached by
   * UPLOADING the file directly into Flow's "+" picker
   * (../../.claude/rules/flow-automation.md's reference-image section) rather than searching by
   * name — Flow's own by-name search in that picker was verified live NOT to actually filter the
   * result list, and the separate "Nhân vật" (character) creation route it would otherwise require
   * proved fragile in practice (viewport-dependent selectors, a rename step that silently failed
   * to persist). Empty/undefined means the scene has no reference to attach; `FakeImageProvider`
   * ignores it (a stateless fake has no Flow picker to drive). */
  referenceImageFiles?: string[];
}

export interface ReferenceGenerationContext {
  projectId: string;
  /** The `references[].id` this generation is for — used only for logging/artifact file naming. */
  referenceId: string;
  logger?: Logger;
}

export interface GeneratedImage {
  /** Path relative to the project's assets folder, e.g. "images/000.png". */
  file: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  generateImage(prompt: string, context: ImageGenerationContext): Promise<GeneratedImage>;
  /** Generates a project-level "Nhân vật"/"Cảnh" reference image ONCE (pipeline-engine.ts's phase
   * 0, before any scene's own image step) from a plain text description — the same plain
   * generate-and-download flow as a normal scene image, no separate character-creation route and
   * no in-Flow rename/save step needed. `name` is kept for logging only; the generated file is
   * later reattached to scenes by FILE UPLOAD (`ImageGenerationContext.referenceImageFiles`), not
   * by name lookup. Optional: a provider with no reference-generation capability (a minimal stub
   * `ImageProvider` in a test that never uses `references[]`) simply omits it; `pipeline-engine.ts`'s
   * phase 0 throws a clear `fatal` `AppError` if a real project ever needs it from a provider that
   * lacks it, rather than silently skipping reference generation. */
  generateReferenceImage?(
    prompt: string,
    name: string,
    context: ReferenceGenerationContext,
  ): Promise<GeneratedImage>;
}

export interface ExistingAudioRequest {
  requestId: string;
  submittedAt: string;
}

export interface AudioGenerationContext {
  projectId: string;
  sceneIndex: number;
  voice: string;
  /** A prior submission for this exact scene, if the pipeline has one persisted (task 004's
   * `VbeeTtsProvider`: resume by polling the SAME request instead of re-submitting after a
   * crash). `undefined` for a fresh scene or a stateless provider (e.g. the fake one). */
  existingRequest?: ExistingAudioRequest;
  /** A stateful provider calls this the moment it successfully SUBMITS a new generation request,
   * BEFORE polling — the pipeline persists it atomically so a crash mid-poll can resume from the
   * SAME request rather than re-submitting (and re-spending credit). The provider itself never
   * touches `project.json` directly (architecture.md: providers stay store-agnostic). */
  onRequestSubmitted?: (request: ExistingAudioRequest) => Promise<void>;
  /** Per-run child logger (`{projectId, runId, stage: "audio"}`, ../../.claude/rules/logging.md's
   * required correlation fields), so a stateful provider's own cross-boundary log lines carry the
   * SAME correlation fields as the rest of this run's pino output, instead of only reaching the
   * provider's own construction-time logger (which predates `runId`, since the provider is built
   * before `engine.run` generates one). This is pino output only: neither this logger nor
   * `pipeline-engine.ts`'s own `logAndEmit` route a `VbeeTtsProvider` log line into
   * `logs/run-<runId>.ndjson` or the SSE `log` stream — only `pipeline-engine.ts`'s own
   * `pipeline.scene.audio.*` lines reach those (`../.claude/rules/logging.md`'s "Known gap"). */
  logger?: Logger;
}

export interface GeneratedAudio {
  /** Path relative to the project's assets folder, e.g. "audio/000.wav". */
  file: string;
  durationMs: number;
}

export interface TtsProvider {
  synthesize(text: string, context: AudioGenerationContext): Promise<GeneratedAudio>;
}

export interface TranscriptionContext {
  projectId: string;
  sceneIndex: number;
  /** The scene's already-measured audio duration (`ProjectScene.audioDurationMs`). A real
   * whisper provider ignores it and derives timing from the audio itself; a stateless fake
   * provider uses it to fabricate evenly-spaced timestamps without decoding real audio. */
  durationMs: number;
  /** The scene's narration text. A real whisper provider ignores it (it transcribes the actual
   * audio); a fake provider tokenizes it directly, the same way `FakeImageProvider`/
   * `FakeTtsProvider` use their own scene inputs to fabricate a deterministic result. */
  narration: string;
  /** Per-run child logger (`{projectId, runId, stage: "captions"}`), same rationale as
   * `AudioGenerationContext.logger`'s own doc comment (pino output only, not the NDJSON run-log
   * file or the SSE stream). */
  logger?: Logger;
}

export interface GeneratedCaptions {
  /** Path relative to the project's assets folder, e.g. "captions/000.json". */
  file: string;
}

export interface TranscriptionProvider {
  transcribe(audioFile: string, context: TranscriptionContext): Promise<GeneratedCaptions>;
}

/** Renders a project whose scenes are all `ready_for_render` into a real MP4 (task 002's
 * `renderVideo`, wrapped by `be/src/render/create-remotion-video-renderer.ts`). Kept behind this
 * interface, not imported directly by the pipeline engine, so a test/CLI can inject a no-op
 * renderer without loading Remotion's bundler/Chrome dependency chain at all — the exact class of
 * coupling that caused the `.tsx`-via-barrel bug recorded in `../../.claude/rules/debugging.md`. */
export interface VideoRenderer {
  render(project: Project, outputLocation: string): Promise<void>;
}
