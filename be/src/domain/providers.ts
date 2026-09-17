import type { Logger } from "pino";

import type { Project } from "@flow-ex/shared-schemas";

/** Provider/strategy interfaces (../../.claude/rules/architecture.md): the pipeline depends on
 * these, never on a concrete provider (Flow/Vbee/fake) directly, so a provider can be swapped or
 * faked in tests without touching pipeline code. */

export interface ImageGenerationContext {
  projectId: string;
  sceneIndex: number;
}

export interface GeneratedImage {
  /** Path relative to the project's assets folder, e.g. "images/000.png". */
  file: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  generateImage(prompt: string, context: ImageGenerationContext): Promise<GeneratedImage>;
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

/** Renders a project whose scenes are all `ready_for_render` into a real MP4 (task 002's
 * `renderVideo`, wrapped by `be/src/render/create-remotion-video-renderer.ts`). Kept behind this
 * interface, not imported directly by the pipeline engine, so a test/CLI can inject a no-op
 * renderer without loading Remotion's bundler/Chrome dependency chain at all — the exact class of
 * coupling that caused the `.tsx`-via-barrel bug recorded in `../../.claude/rules/debugging.md`. */
export interface VideoRenderer {
  render(project: Project, outputLocation: string): Promise<void>;
}
