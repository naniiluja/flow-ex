import type { SceneStatus } from "@flow-ex/shared-schemas";

export type SceneEvent =
  | "begin_image"
  | "image_succeeded"
  | "image_needs_review"
  | "image_failed"
  | "scene_approved"
  | "audio_succeeded"
  | "audio_failed"
  | "captions_succeeded"
  | "captions_failed";

const TRANSITIONS: Record<SceneStatus, Partial<Record<SceneEvent, SceneStatus>>> = {
  pending: { begin_image: "generating_image" },
  generating_image: {
    image_succeeded: "generating_audio",
    // Task 006: taken instead of `image_succeeded` only when the project's `reviewEnabled`
    // switch is on (be/.claude/rules/flow-automation.md's review-gate design) — the pipeline
    // engine picks which of the two events to fire, this machine just encodes both destinations.
    image_needs_review: "awaiting_review",
    image_failed: "failed",
  },
  awaiting_review: { scene_approved: "generating_audio" },
  // Task 007: `audio_succeeded` now lands on `transcribing`, not `ready_for_render` directly —
  // whisper.cpp still owes this scene its word-level caption timestamps
  // (../../.claude/rules/video.md's Captions section) before it is truly render-ready.
  generating_audio: { audio_succeeded: "transcribing", audio_failed: "failed" },
  transcribing: { captions_succeeded: "ready_for_render", captions_failed: "failed" },
  ready_for_render: {},
  failed: {},
};

/**
 * Pure per-scene state transition: pending -> generating_image -> (optionally awaiting_review) ->
 * generating_audio -> transcribing -> ready_for_render, or failed at any generation step (see
 * ../../.claude/rules/video.md and ../../.claude/rules/error-handling.md). Throws on any event
 * that does not apply to the current status, since that always means a caller bug (e.g.
 * re-driving an already-finished scene), never a recoverable business error.
 */
export function advanceScene(current: SceneStatus, event: SceneEvent): SceneStatus {
  const next = TRANSITIONS[current][event];
  if (next === undefined) {
    throw new Error(`scene-state-machine: event "${event}" does not apply to status "${current}"`);
  }
  return next;
}
