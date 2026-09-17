import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { selectTtsProvider } from "./render.ts";

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
