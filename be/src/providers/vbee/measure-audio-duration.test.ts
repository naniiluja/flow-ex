import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeToneWav } from "../fake/synthetic-media.ts";
import { measureAudioDurationMs } from "./measure-audio-duration.ts";

/**
 * EP/BVA matrix for `measureAudioDurationMs(filePath)`.
 *
 * | file duration (real, via ffprobe) | Expected                                  |
 * | ------------------------------------ | ---------------------------------------------- |
 * | 1500ms tone (typical)                  | measured duration within 20ms of 1500          |
 * | 50ms tone (boundary: very short)         | measured duration within 20ms of 50           |
 */
describe("measureAudioDurationMs", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-measure-duration-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("measures a ~1500ms audio file within tolerance", async () => {
    const filePath = path.join(dir, "a.wav");
    await fs.writeFile(filePath, makeToneWav(1500));

    const durationMs = await measureAudioDurationMs(filePath);

    expect(Math.abs(durationMs - 1500)).toBeLessThanOrEqual(20);
  });

  it("measures a very short (50ms) audio file within tolerance (boundary)", async () => {
    const filePath = path.join(dir, "b.wav");
    await fs.writeFile(filePath, makeToneWav(50));

    const durationMs = await measureAudioDurationMs(filePath);

    expect(Math.abs(durationMs - 50)).toBeLessThanOrEqual(20);
  });
});
