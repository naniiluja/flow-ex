import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { Logger } from "pino";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveNarrationOptions } from "@flow-ex/shared-schemas";

import { AppError } from "../../domain/app-error.ts";
import type { AudioGenerationContext } from "../../domain/providers.ts";
import { createVbeeTtsProvider, type VbeeTtsProviderOptions } from "./vbee-tts-provider.ts";

const BASE = "https://api.vbee.vn/v1/tts";
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => {
  server.close();
});

const FAKE_MP3 = Buffer.concat([Buffer.from("ID3", "ascii"), Buffer.alloc(64, 1)]);

function makeContext(overrides: Partial<AudioGenerationContext> = {}): AudioGenerationContext {
  return {
    projectId: "p1",
    sceneIndex: 0,
    voice: "hn_female_ngochuyen_full_48k-fhg",
    ...overrides,
  };
}

function buildProvider(assetsDir: string, overrides: Partial<VbeeTtsProviderOptions> = {}) {
  return createVbeeTtsProvider({
    appId: "app-1",
    token: "token-1",
    webhookUrl: "https://vbee-callback.invalid/noop",
    assetsDir,
    pollTimeoutMs: 200, // short in tests; overridden per-test when a timeout IS the thing tested
    measureDurationMs: () => Promise.resolve(1234),
    ...overrides,
  });
}

/**
 * Integration matrix for `createVbeeTtsProvider(options).synthesize(text, context)`, per the
 * verified contract in ../../.claude/rules/vbee-tts.md.
 *
 * | scenario                                              | Expected                                    |
 * | -------------------------------------------------------- | ------------------------------------------------ |
 * | 201 submit -> PROCESSING -> COMPLETED                       | success, real MP3 file + measured durationMs      |
 * | audioLink 302s to a real body (S3 redirect)                  | success, follows the redirect transparently       |
 * | audioLink expired (403), fresh link fetched via re-poll          | success after one retry                         |
 * | submit 401 (HTML body)                                             | rejects, errorKind needs_user                   |
 * | submit 400 credit message                                            | rejects, errorKind needs_user                   |
 * | submit 400 unrelated (bad voiceCode)                                    | rejects, errorKind fatal                        |
 * | submit 429                                                                | rejects, errorKind transient                    |
 * | submit 500                                                                  | rejects, errorKind transient                    |
 * | polling never completes before pollTimeoutMs                                 | rejects, errorKind transient (VBEE_POLL_TIMEOUT) |
 * | resume: existingRequest < 3 days old                                            | GETs only, never re-POSTs                        |
 * | resume: existingRequest >= 3 days old                                             | re-POSTs a fresh request                        |
 * | poll returns "Request is not found"                                                 | re-POSTs a fresh request, then continues polling |
 */
describe("createVbeeTtsProvider", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-vbee-"));
  });

  it("submits, polls through PROCESSING, then downloads on COMPLETED", async () => {
    let pollCount = 0;
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-1", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-1`, () => {
        pollCount += 1;
        if (pollCount < 2) {
          return HttpResponse.json({ requestId: "req-1", status: "PROCESSING" });
        }
        return HttpResponse.json({
          requestId: "req-1",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-1/abc",
        });
      }),
      http.get("https://vbee.vn/s/req-1/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const provider = buildProvider(dir, { pollTimeoutMs: 30_000 });
    const onRequestSubmitted = vi.fn().mockResolvedValue(undefined);
    const result = await provider.synthesize("Xin chao", makeContext({ onRequestSubmitted }));

    expect(result.file).toBe("audio/000.mp3");
    expect(result.durationMs).toBe(1234);
    expect(onRequestSubmitted).toHaveBeenCalledTimes(1);
    const submittedArg = onRequestSubmitted.mock.calls[0]?.[0] as
      { requestId: string; submittedAt: string } | undefined;
    expect(submittedArg?.requestId).toBe("req-1");
    expect(typeof submittedArg?.submittedAt).toBe("string");
    const written = await fs.readFile(path.join(dir, "audio", "000.mp3"));
    expect(written).toEqual(FAKE_MP3);
  });

  it("puts the resolved clientPause in the real POST body, minus the two excluded fields (task 022)", async () => {
    let submittedBody: Record<string, unknown> | undefined;
    server.use(
      http.post(BASE, async ({ request }) => {
        submittedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ requestId: "req-pause", status: "PROCESSING" }, { status: 201 });
      }),
      http.get(`${BASE}/requests/req-pause`, () =>
        HttpResponse.json({
          requestId: "req-pause",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-pause/abc",
        }),
      ),
      http.get("https://vbee.vn/s/req-pause/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const provider = buildProvider(dir, {
      pollTimeoutMs: 30_000,
      // An explicit emphasisIntensity here proves it is dropped even when a script asks for it,
      // not merely absent because the defaults no longer supply one.
      ttsOptions: { ...resolveNarrationOptions("tiktok"), emphasisIntensity: 60 },
    });
    await provider.synthesize("Hết câu. Nghỉ một nhịp.", makeContext());

    expect(submittedBody).toMatchObject({
      clientPause: {
        mediumBreak: 0.2,
        majorBreak: 0.3,
        sentenceBreak: 0.4,
        paragraphBreak: 1.4,
      },
    });
    expect(submittedBody).not.toHaveProperty("scenePauseMs");
    expect(submittedBody).not.toHaveProperty("emphasisIntensity");
  });

  it("follows a real redirect (302) transparently when downloading the audio", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-2", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-2`, () =>
        HttpResponse.json({
          requestId: "req-2",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-2/xyz",
        }),
      ),
      http.get("https://vbee.vn/s/req-2/xyz", () =>
        HttpResponse.redirect("https://s3.example.com/real-file.mp3", 302),
      ),
      http.get("https://s3.example.com/real-file.mp3", () => new HttpResponse(FAKE_MP3)),
    );

    const provider = buildProvider(dir);
    const result = await provider.synthesize("Xin chao", makeContext());

    expect(result.file).toBe("audio/000.mp3");
  });

  it("re-fetches a fresh audioLink and retries once when the first link has expired", async () => {
    let downloadAttempts = 0;
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-3", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-3`, () =>
        HttpResponse.json({
          requestId: "req-3",
          status: "COMPLETED",
          audioLink: `https://vbee.vn/s/req-3/link-${String(downloadAttempts)}`,
        }),
      ),
      http.get(/https:\/\/vbee\.vn\/s\/req-3\/link-\d/, () => {
        downloadAttempts += 1;
        if (downloadAttempts === 1) {
          return new HttpResponse(null, { status: 403 });
        }
        return new HttpResponse(FAKE_MP3);
      }),
    );

    const provider = buildProvider(dir);
    const result = await provider.synthesize("Xin chao", makeContext());

    expect(result.file).toBe("audio/000.mp3");
    expect(downloadAttempts).toBe(2);
  });

  it("rejects with errorKind needs_user for a 401 (HTML body) on submit", async () => {
    server.use(http.post(BASE, () => new HttpResponse("<html>401</html>", { status: 401 })));

    const provider = buildProvider(dir);
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "needs_user",
    );
  });

  it("rejects with errorKind needs_user for a 400 credit-related submit error", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { error: { code: "BAD_REQUEST", message: "insufficient credit" } },
          { status: 400 },
        ),
      ),
    );

    const provider = buildProvider(dir);
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "needs_user",
    );
  });

  it("rejects with errorKind fatal for a 400 unrelated to credit (bad voiceCode)", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { error: { code: "BAD_REQUEST", message: "unknown voiceCode" } },
          { status: 400 },
        ),
      ),
    );

    const provider = buildProvider(dir);
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "fatal",
    );
  });

  it("rejects with errorKind transient for a 429 on submit", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { error: { code: "TTS_CCR_MAX_LIMIT_REACHED", message: "too many" } },
          { status: 429 },
        ),
      ),
    );

    const provider = buildProvider(dir);
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "transient",
    );
  });

  it("rejects with errorKind transient for a 500 on submit", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { error: { code: "TTS_SPEND_CREDITS_FAILED", message: "oops" } },
          { status: 500 },
        ),
      ),
    );

    const provider = buildProvider(dir);
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "transient",
    );
  });

  it("rejects with errorKind transient (VBEE_POLL_TIMEOUT) when polling never completes in time", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-4", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-4`, () =>
        HttpResponse.json({ requestId: "req-4", status: "PROCESSING" }),
      ),
    );

    const provider = buildProvider(dir, { pollTimeoutMs: 10 });
    await expect(provider.synthesize("x", makeContext())).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof AppError &&
        error.errorKind === "transient" &&
        error.code === "VBEE_POLL_TIMEOUT",
    );
  });

  it("resumes an existingRequest under 3 days old by polling only, never re-submitting", async () => {
    const submit = vi.fn();
    server.use(
      http.post(BASE, () => {
        submit();
        return HttpResponse.json(
          { requestId: "should-not-be-used", status: "PROCESSING" },
          { status: 201 },
        );
      }),
      http.get(`${BASE}/requests/req-existing`, () =>
        HttpResponse.json({
          requestId: "req-existing",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-existing/abc",
        }),
      ),
      http.get("https://vbee.vn/s/req-existing/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const provider = buildProvider(dir);
    const result = await provider.synthesize(
      "x",
      makeContext({ existingRequest: { requestId: "req-existing", submittedAt: oneHourAgo } }),
    );

    expect(submit).not.toHaveBeenCalled();
    expect(result.file).toBe("audio/000.mp3");
  });

  it("re-submits a fresh request when the existingRequest is 3+ days old", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-fresh", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-fresh`, () =>
        HttpResponse.json({
          requestId: "req-fresh",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-fresh/abc",
        }),
      ),
      http.get("https://vbee.vn/s/req-fresh/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const onRequestSubmitted = vi.fn().mockResolvedValue(undefined);
    const provider = buildProvider(dir);
    const result = await provider.synthesize(
      "x",
      makeContext({
        existingRequest: { requestId: "req-stale", submittedAt: fourDaysAgo },
        onRequestSubmitted,
      }),
    );

    expect(onRequestSubmitted).toHaveBeenCalledTimes(1);
    const submittedArg = onRequestSubmitted.mock.calls[0]?.[0] as
      { requestId: string; submittedAt: string } | undefined;
    expect(submittedArg?.requestId).toBe("req-fresh");
    expect(typeof submittedArg?.submittedAt).toBe("string");
    expect(result.file).toBe("audio/000.mp3");
  });

  it('re-submits a fresh request when polling reports "Request is not found"', async () => {
    let requestsSeen = 0;
    server.use(
      http.post(BASE, () => {
        requestsSeen += 1;
        return HttpResponse.json(
          { requestId: `req-${String(requestsSeen)}`, status: "PROCESSING" },
          { status: 201 },
        );
      }),
      http.get(`${BASE}/requests/req-1`, () =>
        HttpResponse.json(
          { error: { code: "BAD_REQUEST", message: "Request is not found" } },
          { status: 400 },
        ),
      ),
      http.get(`${BASE}/requests/req-2`, () =>
        HttpResponse.json({
          requestId: "req-2",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-2/abc",
        }),
      ),
      http.get("https://vbee.vn/s/req-2/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const provider = buildProvider(dir, { pollTimeoutMs: 30_000 });
    const result = await provider.synthesize(
      "x",
      makeContext({
        existingRequest: { requestId: "req-1", submittedAt: new Date().toISOString() },
      }),
    );

    expect(requestsSeen).toBe(2);
    expect(result.file).toBe("audio/000.mp3");
  });

  it("logs vbee.request.submit for a fresh scene and vbee.request.resubmit for a stale one (logging.md)", async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json({ requestId: "req-log", status: "PROCESSING" }, { status: 201 }),
      ),
      http.get(`${BASE}/requests/req-log`, () =>
        HttpResponse.json({
          requestId: "req-log",
          status: "COMPLETED",
          audioLink: "https://vbee.vn/s/req-log/abc",
        }),
      ),
      http.get("https://vbee.vn/s/req-log/abc", () => new HttpResponse(FAKE_MP3)),
    );

    const info = vi.fn();
    const logger = { info, warn: vi.fn(), error: vi.fn() } as unknown as Logger;

    const freshProvider = buildProvider(dir, { logger });
    await freshProvider.synthesize("x", makeContext());
    expect(info).toHaveBeenCalledWith(expect.anything(), "vbee.request.submit");
    expect(info).not.toHaveBeenCalledWith(expect.anything(), "vbee.request.resubmit");

    info.mockClear();
    const staleSubmittedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const staleProvider = buildProvider(dir, { logger });
    await staleProvider.synthesize(
      "x",
      makeContext({ existingRequest: { requestId: "req-stale", submittedAt: staleSubmittedAt } }),
    );
    expect(info).toHaveBeenCalledWith(expect.anything(), "vbee.request.resubmit");
    expect(info).not.toHaveBeenCalledWith(expect.anything(), "vbee.request.submit");
  });
});
