import { describe, expect, it } from "vitest";

import {
  sceneDurationInFrames,
  sceneFramesForTimeline,
  totalTimelineDurationInFrames,
} from "./scene-duration.ts";

/**
 * Contract-level EP/BVA matrix for sceneDurationInFrames(audioSec, fps, transitionFrames).
 *
 * | audioSec (class)         | fps | transitionFrames | Expected                              |
 * | ------------------------ | --- | ----------------- | -------------------------------------- |
 * | 0.001 (near-zero edge)   | 30  | 0                  | ceil(0.03) + 0 = 1                     |
 * | exact integer (2)        | 30  | 0                  | ceil(60) + 0 = 60 (no rounding drift)  |
 * | fractional (2.5)         | 30  | 0                  | ceil(75) + 0 = 75                      |
 * | fractional needing ceil  | 30  | 0                  | 1.001s -> ceil(30.03)=31               |
 * | with transition frames   | 30  | 15                 | ceil(90)+15 = 105                      |
 */
describe("sceneDurationInFrames", () => {
  it("rounds a near-zero duration up to at least 1 frame", () => {
    expect(sceneDurationInFrames(0.001, 30, 0)).toBe(1);
  });

  it("does not introduce drift for an exact integer number of frames", () => {
    expect(sceneDurationInFrames(2, 30, 0)).toBe(60);
  });

  it("rounds a fractional frame count up (never truncates)", () => {
    expect(sceneDurationInFrames(2.5, 30, 0)).toBe(75);
    expect(sceneDurationInFrames(1.001, 30, 0)).toBe(31);
  });

  it("adds the transition frame count on top of the audio-derived frames", () => {
    expect(sceneDurationInFrames(3, 30, 15)).toBe(105);
  });
});

describe("totalTimelineDurationInFrames", () => {
  it("subtracts every transition's overlap from the sum of scene durations", () => {
    // 3 scenes of 90 frames each, 2 transitions of 15 frames between them.
    expect(totalTimelineDurationInFrames([90, 90, 90], [15, 15])).toBe(240);
  });

  it("equals the single scene's duration when there is no transition", () => {
    expect(totalTimelineDurationInFrames([90], [])).toBe(90);
  });

  it("returns 0 for an empty timeline", () => {
    expect(totalTimelineDurationInFrames([], [])).toBe(0);
  });
});

/**
 * Contract-level matrix for sceneFramesForTimeline(scenes, fps, transitionFrames): this is the
 * single source of truth both `computeVideoMetadata` and `MainComposition`'s JSX must call, so
 * the two can never assign a different per-scene duration than the other (a real drift bug this
 * project already hit once).
 *
 * | scenes (class) | Expected                                                      |
 * | -------------- | -------------------------------------------------------------- |
 * | empty          | []                                                              |
 * | single         | [ceil(sec*fps) + 0] — last (and only) scene gets NO transition |
 * | multiple       | every scene but the last gets +transitionFrames                |
 */
describe("sceneFramesForTimeline", () => {
  it("returns an empty array for no scenes", () => {
    expect(sceneFramesForTimeline([], 30, 15)).toEqual([]);
  });

  it("gives the single scene no transition frames (nothing follows it)", () => {
    expect(sceneFramesForTimeline([{ durationMs: 2000 }], 30, 15)).toEqual([60]);
  });

  it("adds transition frames to every scene except the last", () => {
    expect(
      sceneFramesForTimeline(
        [{ durationMs: 2000 }, { durationMs: 3000 }, { durationMs: 2500 }],
        30,
        15,
      ),
    ).toEqual([75, 105, 75]);
  });
});
