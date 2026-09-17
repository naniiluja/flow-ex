import { describe, expect, it } from "vitest";

import { SAMPLE_SCENE_FIXTURES } from "@flow-ex/video";

import { buildSamplePreviewProps } from "./project-preview-page";

/** Acceptance criterion 5 of task 002: "Player preview khớp file render, cùng danh sách asset,
 * cùng props" — this asserts the exact props object the Player mounts matches the fixtures the
 * backend's render integration test (be/src/render/render-video.test.ts) renders `output.mp4`
 * from, so a regression in either place is caught here instead of only visually. */
describe("buildSamplePreviewProps", () => {
  it("uses 16:9 and one scene per sample fixture, in order", () => {
    const props = buildSamplePreviewProps();
    expect(props.aspectRatio).toBe("16:9");
    expect(props.scenes).toHaveLength(SAMPLE_SCENE_FIXTURES.length);
  });

  it("builds each scene's asset URLs and duration from the matching fixture", () => {
    const props = buildSamplePreviewProps();
    props.scenes.forEach((scene, index) => {
      const fixture = SAMPLE_SCENE_FIXTURES[index];
      if (!fixture) {
        throw new Error(`expected a sample fixture at index ${String(index)}`);
      }
      expect(scene.imageUrl).toBe(`/api/samples/${fixture.filename}.png`);
      expect(scene.audioUrl).toBe(`/api/samples/${fixture.filename}.wav`);
      expect(scene.durationMs).toBe(fixture.durationMs);
      expect(scene.imageWidth).toBe(fixture.imageWidth);
      expect(scene.imageHeight).toBe(fixture.imageHeight);
    });
  });
});
