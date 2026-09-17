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
 * | generating_image     | image_failed     | failed                                     |
 * | generating_audio     | audio_succeeded  | ready_for_render                           |
 * | generating_audio     | audio_failed     | failed                                     |
 * | ready_for_render     | begin_image      | throws (invalid: already finished)         |
 * | failed               | audio_succeeded  | throws (invalid: wrong event for status)   |
 */
describe("advanceScene", () => {
  it.each<[SceneStatus, SceneEvent, SceneStatus]>([
    ["pending", "begin_image", "generating_image"],
    ["generating_image", "image_succeeded", "generating_audio"],
    ["generating_image", "image_failed", "failed"],
    ["generating_audio", "audio_succeeded", "ready_for_render"],
    ["generating_audio", "audio_failed", "failed"],
  ])("advances %s + %s -> %s", (current, event, expected) => {
    expect(advanceScene(current, event)).toBe(expected);
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
});
