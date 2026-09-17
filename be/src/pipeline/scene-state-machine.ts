import type { SceneStatus } from "@flow-ex/shared-schemas";

export type SceneEvent =
  "begin_image" | "image_succeeded" | "image_failed" | "audio_succeeded" | "audio_failed";

const TRANSITIONS: Record<SceneStatus, Partial<Record<SceneEvent, SceneStatus>>> = {
  pending: { begin_image: "generating_image" },
  generating_image: { image_succeeded: "generating_audio", image_failed: "failed" },
  generating_audio: { audio_succeeded: "ready_for_render", audio_failed: "failed" },
  ready_for_render: {},
  failed: {},
};

/**
 * Pure per-scene state transition: pending -> generating_image -> generating_audio ->
 * ready_for_render, or failed at either generation step (see ../../.claude/rules/video.md and
 * ../../.claude/rules/error-handling.md). Throws on any event that does not apply to the current
 * status, since that always means a caller bug (e.g. re-driving an already-finished scene), never
 * a recoverable business error.
 */
export function advanceScene(current: SceneStatus, event: SceneEvent): SceneStatus {
  const next = TRANSITIONS[current][event];
  if (next === undefined) {
    throw new Error(`scene-state-machine: event "${event}" does not apply to status "${current}"`);
  }
  return next;
}
