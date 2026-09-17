import { describe, expect, it } from "vitest";

import type { SceneStatus } from "@flow-ex/shared-schemas";

import { advanceScene, type SceneEvent } from "./scene-state-machine.ts";

/**
 * Decision table for `advanceScene(status, event)` (video pipeline's per-scene lifecycle:
 * pending -> generating_image -> generating_audio -> ready_for_render, or failed).
 *
 * | current status     | event            | Expected                                  |
 * | ------------------- | ---------------- | ------------------------------------------ |
 * | pending              | begin_image      | generating_image                           |
 * | generating_image     | image_succeeded  | generating_audio                           |
 * | generating_image     | image_needs_review | awaiting_review (task 006, review gate on) |
 * | generating_image     | image_failed     | failed                                     |
 * | awaiting_review      | scene_approved   | generating_audio (task 006)                |
 * | generating_audio     | audio_succeeded  | transcribing (task 007)                    |
 * | generating_audio     | audio_failed     | failed                                     |
 * | transcribing          | captions_succeeded | ready_for_render (task 007)              |
 * | transcribing          | captions_failed  | failed (task 007)                          |
 * | ready_for_render     | begin_image      | throws (invalid: already finished)         |
 * | failed               | audio_succeeded  | throws (invalid: wrong event for status)   |
 */
describe("advanceScene", () => {
  it.each<[SceneStatus, SceneEvent, SceneStatus]>([
    ["pending", "begin_image", "generating_image"],
    ["generating_image", "image_succeeded", "generating_audio"],
    ["generating_image", "image_needs_review", "awaiting_review"],
    ["generating_image", "image_failed", "failed"],
    ["awaiting_review", "scene_approved", "generating_audio"],
    ["generating_audio", "audio_succeeded", "transcribing"],
    ["generating_audio", "audio_failed", "failed"],
    ["transcribing", "captions_succeeded", "ready_for_render"],
    ["transcribing", "captions_failed", "failed"],
  ])("advances %s + %s -> %s", (current, event, expected) => {
    expect(advanceScene(current, event)).toBe(expected);
  });

  it("throws on scene_approved applied to a status other than awaiting_review", () => {
    expect(() => advanceScene("generating_image", "scene_approved")).toThrow();
  });

  it("throws on an event that does not apply to a terminal ready_for_render status", () => {
    expect(() => advanceScene("ready_for_render", "begin_image")).toThrow();
  });

  it("throws on an event that does not apply to a terminal failed status", () => {
    expect(() => advanceScene("failed", "audio_succeeded")).toThrow();
  });

  it("throws on an event that skips a step (pending -> audio_succeeded)", () => {
    expect(() => advanceScene("pending", "audio_succeeded")).toThrow();
  });

  it("throws on captions_succeeded applied before transcribing (generating_audio)", () => {
    expect(() => advanceScene("generating_audio", "captions_succeeded")).toThrow();
  });
});
