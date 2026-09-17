import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
// Deep-imported rather than from the `@flow-ex/video` barrel: the barrel also re-exports values
// backed by `.tsx` files, and this file's import shape is the exact pattern that once broke a
// real `node` runtime import elsewhere in `be/` (pass 2's FAIL). Vitest would transform either
// form fine, so keep the deep path here as the one that stays copy-paste safe.
import { SAMPLE_SCENE_FIXTURES } from "@flow-ex/video/src/sample-fixtures.ts";
import type { MainCompositionProps } from "@flow-ex/video";
import { springTiming } from "@remotion/transitions";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { createProjectStore } from "../store/project-store.ts";
import { renderVideo } from "./render-video.ts";

const execFileAsync = promisify(execFile);

function defined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

/** The fixture colors baked into be/src/render/fixtures/generate-fixtures.mjs — kept here as the
 * independent expectation a pixel sample is checked against. */
const FIXTURE_COLORS = [
  { r: 220, g: 60, b: 60 }, // sample-1
  { r: 60, g: 160, b: 90 }, // sample-2
  { r: 60, g: 100, b: 220 }, // sample-3
];

async function samplePixel(videoPath: string, timestampSec: number, x: number, y: number) {
  // ffmpeg's `crop` filter rounds its output size DOWN to an even number by default (chroma
  // subsampling compatibility), which silently turns a requested `1:1` crop into `0:0` and
  // fails outright — crop a small even block instead and read its first pixel.
  const { stdout } = await execFileAsync(
    ffmpegPath,
    [
      "-v",
      "error",
      "-ss",
      String(timestampSec),
      "-i",
      videoPath,
      "-vf",
      `crop=2:2:${String(x)}:${String(y)}`,
      "-vframes",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { encoding: "buffer" },
  );
  return {
    r: defined(stdout[0], "ffmpeg produced no pixel bytes"),
    g: defined(stdout[1], "ffmpeg produced no pixel bytes"),
    b: defined(stdout[2], "ffmpeg produced no pixel bytes"),
  };
}

/** Integration test for task 002's gate: render the 3 sample scenes through the real
 * bundle -> selectComposition -> renderMedia pipeline (no fakes), then verify BOTH the frame
 * count (via ffprobe) and the actual pixel content (via ffmpeg) — a frame-count match alone is
 * NOT sufficient proof, since `renderMedia` always emits exactly the `durationInFrames` its own
 * `calculateMetadata` declared regardless of whether the composition's actual content is that
 * long (this project's `/ccf:check` review caught exactly that gap: a broken transition once
 * rendered fully black frames, and a duration mismatch once left ~1s of trailing black/silence,
 * and BOTH still passed a frame-count-only version of this test). */
describe("renderVideo (integration)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let baseUrl: string;
  let outputDir: string;

  beforeAll(async () => {
    const storeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-render-store-"));
    app = buildApp({ store: createProjectStore(storeRoot) });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected a bound TCP address");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
    outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-render-output-"));
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(outputDir, { recursive: true, force: true });
  });

  it("renders 3 sample scenes to an MP4 with the right frame count and real scene content", async () => {
    const scenes: MainCompositionProps["scenes"] = SAMPLE_SCENE_FIXTURES.map((fixture) => ({
      imageUrl: `${baseUrl}/api/samples/${fixture.filename}.png`,
      imageWidth: fixture.imageWidth,
      imageHeight: fixture.imageHeight,
      audioUrl: `${baseUrl}/api/samples/${fixture.filename}.wav`,
      durationMs: fixture.durationMs,
    }));

    const outputLocation = path.join(outputDir, "output.mp4");

    await renderVideo({ scenes, aspectRatio: "16:9", outputLocation });

    const stat = await fs.stat(outputLocation);
    expect(stat.size).toBeGreaterThan(0);

    // Count actual VIDEO-stream frames rather than reading the container's `format=duration`:
    // the container duration also covers the muxed AAC audio track, which pads to a 1024-sample
    // frame boundary and can shift the reported seconds by more than 1 video frame even when
    // the video stream itself has the exact expected frame count.
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_read_frames",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      outputLocation,
    ]);
    const actualFrames = Number.parseInt(stdout.trim(), 10);

    // Independent expectation: the transition frame count added to every non-last scene is
    // always exactly cancelled back out by the (n-1) transitions subtracted from the total
    // (see video/src/compositions/main-composition.test.ts), so the true total is simply the
    // sum of each scene's own ceil'd audio-frame duration — with NO transition constant
    // involved at all, unlike the actual computeVideoMetadata implementation.
    const FPS = 30;
    const expectedFrames = SAMPLE_SCENE_FIXTURES.map((fixture) =>
      Math.ceil((fixture.durationMs / 1000) * FPS),
    ).reduce((sum, f) => sum + f, 0);

    expect(actualFrames).toBe(expectedFrames);

    // Content check: sample the center pixel mid-way through scene 1 and mid-way through
    // scene 3 (the FIRST and LAST scenes' content windows, well clear of any transition), and
    // confirm each shows that scene's fixture color rather than black (a broken transition) or
    // the wrong scene's color (a duration/frame-assignment bug).
    const firstScene = defined(scenes[0], "expected at least 1 scene");
    const lastScene = defined(scenes.at(-1), "expected at least 1 scene");
    const scene1MidSec = firstScene.durationMs / 1000 / 2; // 1s into a 2s scene 1
    const totalContentSec = expectedFrames / FPS;
    const scene3MidSec = totalContentSec - lastScene.durationMs / 1000 / 2;

    const centerX = 960;
    const centerY = 540;

    const pixelInScene1 = await samplePixel(outputLocation, scene1MidSec, centerX, centerY);
    const pixelInScene3 = await samplePixel(outputLocation, scene3MidSec, centerX, centerY);

    const expectedColor1 = defined(FIXTURE_COLORS[0], "expected a color for scene 1");
    const expectedColor3 = defined(FIXTURE_COLORS.at(-1), "expected a color for the last scene");
    const TOLERANCE = 25; // h264 is lossy; allow modest compression drift per channel

    expect(Math.abs(pixelInScene1.r - expectedColor1.r)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(pixelInScene1.g - expectedColor1.g)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(pixelInScene1.b - expectedColor1.b)).toBeLessThanOrEqual(TOLERANCE);

    expect(Math.abs(pixelInScene3.r - expectedColor3.r)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(pixelInScene3.g - expectedColor3.g)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(pixelInScene3.b - expectedColor3.b)).toBeLessThanOrEqual(TOLERANCE);

    // Also sample INSIDE the first crossfade (scene 1 -> scene 2), roughly centered on the
    // transition's own frame window — this is the specific spot a broken canvas/WebGL transition
    // (this project's built-in `crossZoom` bug) renders fully black, which the two content checks
    // above never visit since they deliberately sample well clear of any transition.
    //
    // `TransitionSeries` starts sequence B's transition `transitionFrames` BEFORE sequence A's
    // own `durationInFrames` (== firstJoinContentFrame + transitionFrames) ends, so the real
    // transition window is [firstJoinContentFrame, firstJoinContentFrame + transitionFrames).
    // Sample the MIDPOINT of that window by ADDING half the transition length, never subtracting
    // it (subtracting lands back inside scene 1's own steady content, before the join even starts,
    // which made this assertion pass even when the transition itself rendered fully black).
    const transitionFrames = springTiming({ config: { damping: 200 } }).getDurationInFrames({
      fps: FPS,
    });
    const firstJoinContentFrame = Math.ceil((firstScene.durationMs / 1000) * FPS);
    const transitionMidFrame = firstJoinContentFrame + Math.round(transitionFrames / 2);
    const transitionMidSec = Math.max(0, transitionMidFrame / FPS);

    const pixelInTransition = await samplePixel(outputLocation, transitionMidSec, centerX, centerY);
    const isNearBlack =
      pixelInTransition.r < 15 && pixelInTransition.g < 15 && pixelInTransition.b < 15;
    expect(isNearBlack).toBe(false);
  }, 120_000);
});
