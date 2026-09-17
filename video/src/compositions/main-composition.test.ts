import { describe, expect, it } from "vitest";

import { computeVideoMetadata, type MainCompositionProps } from "./main-composition.tsx";

const FPS = 30;

function scene(durationMs: number) {
  return { imageUrl: "a.png", imageWidth: 1920, imageHeight: 1080, audioUrl: "a.wav", durationMs };
}

/**
 * Contract-level EP/BVA matrix for the preset -> dimensions rule (task 009).
 *
 * | preset      | aspectRatio given | Expected                    |
 * | ----------- | ----------------- | --------------------------- |
 * | "tiktok"    | none              | 1080x1920 (preset default)  |
 * | "youtube"   | none              | 1920x1080 (preset default)  |
 * | "tiktok"    | "16:9" (conflict) | 1920x1080 (aspectRatio wins) |
 */
describe("computeVideoMetadata preset -> dimensions (task 009)", () => {
  it("tiktok preset alone resolves to 1080x1920", () => {
    const props: MainCompositionProps = { scenes: [], preset: "tiktok" };
    const metadata = computeVideoMetadata(props);
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
  });

  it("youtube preset alone resolves to 1920x1080", () => {
    const props: MainCompositionProps = { scenes: [], preset: "youtube" };
    const metadata = computeVideoMetadata(props);
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
  });

  it("an explicit aspectRatio WINS over a conflicting preset default", () => {
    const props: MainCompositionProps = { scenes: [], preset: "tiktok", aspectRatio: "16:9" };
    const metadata = computeVideoMetadata(props);
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
  });
});

/**
 * Contract-level EP/BVA matrix for computeVideoMetadata(props).
 *
 * | scenes (class)         | aspectRatio | Expected                                          |
 * | ------------------------ | ----------- | -------------------------------------------------- |
 * | empty                     | 16:9        | width/height/fps of 16:9, durationInFrames >= 1    |
 * | single scene              | 16:9        | duration = ceil(sec*fps), no transition added/subtracted |
 * | multiple scenes           | 9:16        | width/height of 9:16, transitions subtracted once  |
 */
describe("computeVideoMetadata", () => {
  it("returns at least 1 frame and 16:9 dimensions for an empty scene list", () => {
    const props: MainCompositionProps = { scenes: [], aspectRatio: "16:9", preset: "youtube" };
    const metadata = computeVideoMetadata(props);
    expect(metadata).toEqual({ width: 1920, height: 1080, fps: FPS, durationInFrames: 1 });
  });

  it("does not add or subtract any transition frames for a single scene", () => {
    const props: MainCompositionProps = {
      scenes: [scene(2000)],
      aspectRatio: "16:9",
      preset: "youtube",
    };
    const metadata = computeVideoMetadata(props);
    // The single (and only) scene gets 0 transition frames (sceneFramesForTimeline), and with 0
    // transitions between scenes there is nothing to subtract either.
    expect(metadata.durationInFrames).toBe(Math.ceil(2 * FPS));
  });

  it("uses 9:16 dimensions and subtracts one transition per join for multiple scenes", () => {
    const props: MainCompositionProps = {
      scenes: [scene(2000), scene(3000), scene(2500)],
      aspectRatio: "9:16",
      preset: "tiktok",
    };
    const metadata = computeVideoMetadata(props);
    expect(metadata.width).toBe(1080);
    expect(metadata.height).toBe(1920);
    expect(metadata.fps).toBe(FPS);

    // Every scene but the last carries +TRANSITION_FRAMES, then 2 joins subtract it back out —
    // net effect: the total is just the sum of each scene's own ceil'd audio-frame duration,
    // regardless of what TRANSITION_FRAMES actually is (the two occurrences cancel out).
    const expected = [2000, 3000, 2500]
      .map((ms) => Math.ceil((ms / 1000) * FPS))
      .reduce((sum, f) => sum + f, 0);
    expect(metadata.durationInFrames).toBe(expected);
  });
});
