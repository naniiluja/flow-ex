import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "../../domain/app-error.ts";
import { createFakeTranscriptionProvider } from "./fake-transcription-provider.ts";

/**
 * EP/BVA matrix for `createFakeTranscriptionProvider(options).transcribe(audioFile, context)`.
 *
 * | narration           | durationMs | alwaysFail | Expected                                      |
 * | -------------------- | ---------- | ---------- | ----------------------------------------------- |
 * | "Xin chao ban"        | 1500       | unset      | 3 tokens, increasing non-overlapping timestamps |
 * | "" (empty)            | 1000       | unset      | [] (no tokens to time)                          |
 * | "Mot" (1 word)        | 500        | unset      | 1 token spanning the full duration               |
 * | any                   | any        | set        | always throws the configured AppError            |
 */
describe("createFakeTranscriptionProvider", () => {
  let assetsDir: string;

  beforeEach(async () => {
    assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-fake-transcription-"));
  });

  afterEach(async () => {
    await fs.rm(assetsDir, { recursive: true, force: true });
  });

  it("writes a captions JSON file with one token per word, in increasing order", async () => {
    const provider = createFakeTranscriptionProvider({ assetsDir });
    const result = await provider.transcribe("audio/000.mp3", {
      projectId: "p1",
      sceneIndex: 0,
      narration: "Xin chao ban",
      durationMs: 1500,
    });

    expect(result.file).toBe("captions/000.json");
    const raw = await fs.readFile(path.join(assetsDir, result.file), "utf8");
    const captions = JSON.parse(raw) as { text: string; startMs: number; endMs: number }[];
    expect(captions).toHaveLength(3);
    expect(captions[0]?.text).toBe("Xin");
    expect(captions[1]?.text).toBe(" chao");
    expect(captions[2]?.text).toBe(" ban");
    for (let i = 1; i < captions.length; i++) {
      expect(captions[i]?.startMs).toBeGreaterThanOrEqual(captions[i - 1]?.endMs ?? 0);
    }
    expect(captions.at(-1)?.endMs).toBeLessThanOrEqual(1500);
  });

  it("writes an empty captions array for empty narration (boundary)", async () => {
    const provider = createFakeTranscriptionProvider({ assetsDir });
    const result = await provider.transcribe("audio/001.mp3", {
      projectId: "p1",
      sceneIndex: 1,
      narration: "",
      durationMs: 1000,
    });

    const raw = await fs.readFile(path.join(assetsDir, result.file), "utf8");
    expect(JSON.parse(raw)).toEqual([]);
  });

  it("spans the full duration for a single-word narration (boundary)", async () => {
    const provider = createFakeTranscriptionProvider({ assetsDir });
    const result = await provider.transcribe("audio/002.mp3", {
      projectId: "p1",
      sceneIndex: 2,
      narration: "Mot",
      durationMs: 500,
    });

    const raw = await fs.readFile(path.join(assetsDir, result.file), "utf8");
    const captions = JSON.parse(raw) as { startMs: number; endMs: number }[];
    expect(captions).toEqual([
      { startMs: 0, endMs: 500, text: "Mot", timestampMs: 250, confidence: 1 },
    ]);
  });

  it("always throws the configured error when alwaysFail is set for that scene", async () => {
    const configuredError = new AppError({
      code: "TRANSCRIBE_UNAVAILABLE",
      errorKind: "transient",
      message: "simulated whisper failure",
    });
    const provider = createFakeTranscriptionProvider({
      assetsDir,
      alwaysFail: { 0: configuredError },
    });

    await expect(
      provider.transcribe("audio/000.mp3", {
        projectId: "p1",
        sceneIndex: 0,
        narration: "text",
        durationMs: 1000,
      }),
    ).rejects.toBe(configuredError);
  });
});
