import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../../domain/app-error.ts";

const installWhisperCpp = vi.fn<(...args: unknown[]) => Promise<{ alreadyExisted: boolean }>>();
const downloadWhisperModel = vi.fn<(...args: unknown[]) => Promise<{ alreadyExisted: boolean }>>();
const transcribe = vi.fn<(...args: unknown[]) => Promise<{ transcription: unknown[] }>>();
const toCaptions = vi.fn<(...args: unknown[]) => { captions: unknown[] }>();
installWhisperCpp.mockResolvedValue({ alreadyExisted: false });
downloadWhisperModel.mockResolvedValue({ alreadyExisted: false });
transcribe.mockResolvedValue({ transcription: [] });
toCaptions.mockReturnValue({
  captions: [{ text: "Xin", startMs: 0, endMs: 300, timestampMs: 150, confidence: 1 }],
});

vi.mock("@remotion/install-whisper-cpp", () => ({
  installWhisperCpp: (...args: unknown[]): unknown => installWhisperCpp(...args),
  downloadWhisperModel: (...args: unknown[]): unknown => downloadWhisperModel(...args),
  transcribe: (...args: unknown[]): unknown => transcribe(...args),
  toCaptions: (...args: unknown[]): unknown => toCaptions(...args),
}));

const convertToWav16kMono = vi.fn<(...args: unknown[]) => Promise<void>>();
convertToWav16kMono.mockResolvedValue(undefined);
vi.mock("./convert-to-wav.ts", () => ({
  convertToWav16kMono: (...args: unknown[]): unknown => convertToWav16kMono(...args),
}));

const { createWhisperTranscriptionProvider } = await import("./whisper-transcription-provider.ts");

/**
 * EP/BVA matrix for `createWhisperTranscriptionProvider(options).transcribe(audioFile, context)`,
 * with `@remotion/install-whisper-cpp` and `convertToWav16kMono` mocked out — no real download,
 * no real ffmpeg/whisper.cpp binary. Real-binary behavior is proven once by the real smoke run
 * (task 007's own acceptance criterion), not by this unit suite.
 *
 * | transcribe() outcome | prior calls this process | Expected                                   |
 * | ----------------------- | --------------------------- | --------------------------------------------- |
 * | resolves                  | 0 (first call)                 | installs+downloads once, writes captions JSON |
 * | resolves                  | 1 (second call, same process)  | does NOT install/download again (lazy+shared) |
 * | rejects                    | any                              | throws AppError WHISPER_TRANSCRIBE_FAILED, transient |
 */
describe("createWhisperTranscriptionProvider", () => {
  let assetsDir: string;
  let whisperCacheDir: string;

  beforeEach(async () => {
    assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-whisper-assets-"));
    whisperCacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-whisper-cache-"));
    installWhisperCpp.mockClear();
    downloadWhisperModel.mockClear();
    transcribe.mockClear().mockResolvedValue({ transcription: [] });
    toCaptions.mockClear();
    convertToWav16kMono.mockClear();
  });

  afterEach(async () => {
    await fs.rm(assetsDir, { recursive: true, force: true });
    await fs.rm(whisperCacheDir, { recursive: true, force: true });
  });

  it("writes the mocked captions to captions/<sceneIndex>.json and installs/downloads exactly once across two calls", async () => {
    const provider = createWhisperTranscriptionProvider({
      assetsDir,
      whisperCacheDir,
      model: "small",
      whisperCppVersion: "1.5.5",
    });
    await fs.mkdir(path.join(assetsDir, "audio"), { recursive: true });
    await fs.writeFile(path.join(assetsDir, "audio/000.mp3"), Buffer.from("fake"));
    await fs.writeFile(path.join(assetsDir, "audio/001.mp3"), Buffer.from("fake"));

    const result0 = await provider.transcribe("audio/000.mp3", {
      projectId: "p1",
      sceneIndex: 0,
      narration: "Xin chao",
      durationMs: 1000,
    });
    const result1 = await provider.transcribe("audio/001.mp3", {
      projectId: "p1",
      sceneIndex: 1,
      narration: "Tam biet",
      durationMs: 1000,
    });

    expect(result0.file).toBe("captions/000.json");
    expect(result1.file).toBe("captions/001.json");
    const raw = await fs.readFile(path.join(assetsDir, result0.file), "utf8");
    expect(JSON.parse(raw)).toEqual([
      { text: "Xin", startMs: 0, endMs: 300, timestampMs: 150, confidence: 1 },
    ]);
    expect(installWhisperCpp).toHaveBeenCalledTimes(1);
    expect(downloadWhisperModel).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledTimes(2);
  });

  it("wraps a transcribe() failure as a transient AppError", async () => {
    transcribe.mockRejectedValue(new Error("whisper.cpp process exited with code 1"));
    const provider = createWhisperTranscriptionProvider({
      assetsDir,
      whisperCacheDir,
      model: "small",
      whisperCppVersion: "1.5.5",
    });
    await fs.mkdir(path.join(assetsDir, "audio"), { recursive: true });
    await fs.writeFile(path.join(assetsDir, "audio/000.mp3"), Buffer.from("fake"));

    await expect(
      provider.transcribe("audio/000.mp3", {
        projectId: "p1",
        sceneIndex: 0,
        narration: "Xin chao",
        durationMs: 1000,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "WHISPER_TRANSCRIBE_FAILED" &&
        error.errorKind === "transient",
    );
  });
});
