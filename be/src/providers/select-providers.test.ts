import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveTtsOptionsForProject,
  selectImageProvider,
  selectTranscriptionProvider,
  selectTtsProvider,
} from "./select-providers.ts";

/**
 * Contract-level EP/BVA matrix for resolveTtsOptionsForProject(preset, ttsOptions).
 *
 * | preset      | ttsOptions.speed | Expected speed |
 * | ----------- | ---------------- | -------------- |
 * | "tiktok"    | undefined        | 0.95 (preset default) |
 * | "youtube"   | undefined        | 0.95 (preset default)  |
 * | "tiktok"    | 0.8 (explicit)   | 0.8 (explicit wins)   |
 */
describe("resolveTtsOptionsForProject", () => {
  it("falls back to the preset's own speed when the project sets none", () => {
    expect(resolveTtsOptionsForProject("tiktok", undefined).speed).toBe(0.95);
    expect(resolveTtsOptionsForProject("youtube", undefined).speed).toBe(0.95);
  });

  it("an explicit tts.speed WINS over the preset default", () => {
    expect(resolveTtsOptionsForProject("tiktok", { speed: 0.8 }).speed).toBe(0.8);
  });

  it("keeps every other ttsOptions field untouched", () => {
    const result = resolveTtsOptionsForProject("youtube", { bitrate: 64 });
    expect(result.bitrate).toBe(64);
    expect(result.speed).toBe(0.95);
  });
});

const server = setupServer();
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

/**
 * EP/BVA matrix for `selectTtsProvider(vbeeCredentials, assetsDir)`, proven by OBSERVABLE
 * behavior (network call made or not) rather than just checking the returned shape.
 *
 * | vbeeCredentials                                    | Expected                                       |
 * | ------------------------------------------------------ | --------------------------------------------------- |
 * | undefined (no VBEE_APP_ID/VBEE_TOKEN configured)          | writes a fake WAV, never calls api.vbee.vn            |
 * | {appId, token, webhookUrl} present                          | attempts a real POST to api.vbee.vn/v1/tts             |
 */
describe("selectTtsProvider", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-select-tts-"));
  });

  it("picks FakeTtsProvider when no credentials are configured (no network call at all)", async () => {
    // onUnhandledRequest: "error" above means ANY outbound fetch this test doesn't explicitly
    // handle would fail the test — so completing successfully here already proves no HTTP call
    // was attempted, which is the real (network-based) provider's signature behavior.
    const provider = selectTtsProvider(undefined, dir);

    const result = await provider.synthesize("Xin chao", {
      projectId: "p1",
      sceneIndex: 0,
      voice: "v",
    });

    expect(result.file).toBe("audio/000.wav");
    const bytes = await fs.readFile(path.join(dir, result.file));
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  });

  it("picks VbeeTtsProvider when credentials are present (attempts a real Vbee HTTP call)", async () => {
    const submitCalled = vi.fn();
    server.use(
      http.post("https://api.vbee.vn/v1/tts", () => {
        submitCalled();
        return HttpResponse.json({ requestId: "req-1", status: "PROCESSING" }, { status: 201 });
      }),
      http.get("https://api.vbee.vn/v1/tts/requests/req-1", () =>
        HttpResponse.json({
          requestId: "req-1",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-1/abc",
        }),
      ),
      http.get(
        "https://vbee.vn/s/req-1/abc",
        () => new HttpResponse(Buffer.concat([Buffer.from("ID3", "ascii"), Buffer.alloc(16)])),
      ),
    );

    const provider = selectTtsProvider(
      { appId: "app-1", token: "token-1", webhookUrl: "https://vbee-callback.invalid/noop" },
      dir,
    );

    // measureAudioDurationMs would shell out to ffprobe on a non-decodable fake fixture; this
    // test only needs to prove WHICH provider was selected, not the full download pipeline
    // (vbee-tts-provider.test.ts already covers that end to end with a real ffprobe run), so it
    // asserts on the submit call happening rather than awaiting a result that needs a real MP3.
    await provider
      .synthesize("Xin chao", { projectId: "p1", sceneIndex: 0, voice: "v" })
      .catch(() => undefined);

    expect(submitCalled).toHaveBeenCalledTimes(1);
  });
});

/**
 * EP/BVA matrix for `selectImageProvider(mode, chromeOptions, assetsDir)`.
 *
 * | mode        | chromeOptions | Expected                                                    |
 * | ------------- | --------------- | --------------------------------------------------------------- |
 * | undefined       | undefined         | FakeImageProvider: writes a real PNG, no network call at all  |
 * | "real"            | undefined         | throws synchronously (misconfiguration guard)               |
 * | "real"              | present             | attempts a real CDP connection (observable network call)  |
 */
describe("selectImageProvider", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-select-image-"));
  });

  it("picks FakeImageProvider when mode is not 'real' (no network call at all)", async () => {
    const provider = selectImageProvider(undefined, undefined, dir);

    const result = await provider.generateImage("a sunny beach", {
      projectId: "p1",
      sceneIndex: 0,
      aspectRatio: "16:9",
    });

    expect(result.file).toBe("images/000-0.png");
    const bytes = await fs.readFile(path.join(dir, result.file));
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it("throws synchronously when mode is 'real' but no chromeOptions were given", () => {
    expect(() => selectImageProvider("real", undefined, dir)).toThrow();
  });

  it("picks FlowImageProvider when mode is 'real' (attempts a real CDP connection)", async () => {
    const cdpProbed = vi.fn();
    server.use(
      http.get("http://127.0.0.1:19222/json/version", () => {
        cdpProbed();
        // Deliberately missing webSocketDebuggerUrl: makes Playwright's own connectOverCDP fail
        // fast while parsing this response, instead of attempting a real WebSocket handshake
        // (which msw cannot intercept). This test only needs to prove the connection was
        // ATTEMPTED, not that it fully succeeds — a real Chrome is out of scope for a unit test.
        return HttpResponse.json({});
      }),
    );

    const provider = selectImageProvider(
      "real",
      { userDataDir: dir, cdpPort: 19222 },
      path.join(dir, "assets"),
    );

    await provider
      .generateImage("a sunny beach", { projectId: "p1", sceneIndex: 0, aspectRatio: "16:9" })
      .catch(() => undefined);

    expect(cdpProbed).toHaveBeenCalled();
  });
});

/**
 * EP/BVA matrix for `selectTranscriptionProvider(mode, whisperOptions, assetsDir)`. The
 * "whisper" branch is checked only for its SYNCHRONOUS selection behavior — actually calling
 * `.transcribe()` would install whisper.cpp and download a real multilingual model (hundreds of
 * MB), which this unit suite must never trigger unattended (../../.claude/rules/testing.md's
 * e2e scope reserves a real whisper.cpp run for an explicit, asked-for smoke test, the same way
 * task 004/005 gated their own first real external call).
 *
 * | mode          | whisperOptions | Expected                                                  |
 * | --------------- | ---------------- | ----------------------------------------------------------- |
 * | undefined         | undefined          | FakeTranscriptionProvider: writes real captions JSON        |
 * | "whisper"           | undefined          | throws synchronously (misconfiguration guard)              |
 * | "whisper"             | present              | returns a provider WITHOUT installing anything (lazy)     |
 */
describe("selectTranscriptionProvider", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-select-transcription-"));
  });

  it("picks FakeTranscriptionProvider when mode is not 'whisper'", async () => {
    const provider = selectTranscriptionProvider(undefined, undefined, dir);

    const result = await provider.transcribe("audio/000.mp3", {
      projectId: "p1",
      sceneIndex: 0,
      narration: "Xin chao",
      durationMs: 1000,
    });

    expect(result.file).toBe("captions/000.json");
    const raw = await fs.readFile(path.join(dir, result.file), "utf8");
    expect(JSON.parse(raw)).toHaveLength(2);
  });

  it("throws synchronously when mode is 'whisper' but no whisperOptions were given", () => {
    expect(() => selectTranscriptionProvider("whisper", undefined, dir)).toThrow();
  });

  it("selects WhisperTranscriptionProvider without installing anything (lazy on first transcribe)", () => {
    expect(() =>
      selectTranscriptionProvider(
        "whisper",
        { cacheDir: path.join(dir, "whisper.cpp"), model: "small", whisperCppVersion: "1.5.5" },
        dir,
      ),
    ).not.toThrow();
  });
});
