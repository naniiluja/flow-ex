import { describe, expect, it } from "vitest";

import { computeSafeViewport, kenBurnsViewport } from "./safe-viewport.ts";
import { sceneFramesForTimeline, totalTimelineDurationInFrames } from "./scene-duration.ts";

describe("Codex images and narration pauses", () => {
  it.each([0, 0.5, 1])(
    "keeps an uncropped centered image at progress %s when no Flow logo exists",
    (progress) => {
      const safe = computeSafeViewport(
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 },
        null,
      );
      const viewport = kenBurnsViewport(safe, progress);
      expect(safe.minZoom).toBe(1);
      expect(viewport.x).toBeCloseTo((1 - viewport.width) / 2);
      expect(viewport.y).toBeCloseTo((1 - viewport.height) / 2);
      expect(viewport.width).toBeGreaterThan(0.94);
    },
  );
  it.each([
    [900, 1600],
    [1600, 900],
  ])("fits mismatched source %s x %s without distorting", (width, height) => {
    const safe = computeSafeViewport({ width, height }, { width: 1080, height: 1920 }, null);
    const view = kenBurnsViewport(safe, 0);
    expect((width * view.width) / (height * view.height)).toBeCloseTo(1080 / 1920);
    expect(view.x).toBeGreaterThanOrEqual(0);
    expect(view.y).toBeGreaterThanOrEqual(0);
  });
  it("inserts 600ms of silence before the next scene, without padding the final scene", () => {
    const frames = sceneFramesForTimeline(
      [
        { durationMs: 1000, pauseAfterMs: 600 },
        { durationMs: 1000, pauseAfterMs: 600 },
      ],
      30,
      15,
    );
    expect(frames).toEqual([63, 30]);
    expect(totalTimelineDurationInFrames(frames, [15])).toBe(78);
    expect((frames[0] ?? 0) - 15 - 30).toBe(18);
  });
});
