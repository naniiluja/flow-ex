import fs from "node:fs/promises";
import path from "node:path";

import type { Logger } from "pino";

import type { TtsOptions } from "@flow-ex/shared-schemas";

import { AppError } from "../../domain/app-error.ts";
import type {
  AudioGenerationContext,
  GeneratedAudio,
  TtsProvider,
} from "../../domain/providers.ts";
import { classifyVbeeHttpError, isRequestNotFound } from "./classify-vbee-error.ts";
import { measureAudioDurationMs } from "./measure-audio-duration.ts";
import { vbeePollingResponseSchema, vbeeSubmitResponseSchema } from "./vbee-schema.ts";
import { prepareNarration, vbeeNarrationOptions } from "./narration-request.ts";

const VBEE_BASE_URL = "https://api.vbee.vn/v1/tts";
const POLL_INTERVAL_FIRST_MS = 2000;
const POLL_INTERVAL_LATER_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;
const REQUEST_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_EXPIRED_LINK_RETRIES = 2;
const MP3_MAGIC_BYTES = Buffer.from("ID3", "ascii");

export interface VbeeTtsProviderOptions {
  appId: string;
  token: string;
  webhookUrl: string;
  /** Absolute directory for the PROJECT's assets root (`projects/<id>/assets`); the downloaded
   * MP3 is written under its `audio/` subfolder (matches `FakeTtsProvider`'s own convention). */
  assetsDir: string;
  ttsOptions?: TtsOptions;
  /** Injectable clock, so a test can control the 3-day resume window and the 5-minute poll
   * timeout deterministically instead of waiting on real time. */
  now?: () => Date;
  pollTimeoutMs?: number;
  /** Defaults to the real ffprobe-backed `measureAudioDurationMs`; injectable so integration
   * tests can use a fake, non-decodable MP3 fixture (real bytes needed only for the ID3
   * magic-byte check, not a fully playable file) without shelling out to ffprobe. */
  measureDurationMs?: (filePath: string) => Promise<number>;
  /** Fallback logger, used only when a call's `AudioGenerationContext.logger` is absent (e.g. a
   * test that builds the provider directly). `pipeline-engine.ts` normally supplies a per-run
   * `{projectId, runId, stage: "audio"}` child via the context on every `synthesize` call, which
   * `log()` prefers, so these pino lines carry `runId`/`stage`
   * (../../.claude/rules/logging.md's required correlation fields) rather than only here — this
   * is pino output only, not the NDJSON run-log file or the SSE `log` stream (see
   * `AudioGenerationContext.logger`'s own doc comment for that gap).
   * Logs entry/exit of each cross-boundary Vbee call ("Each cross-boundary call... logs both
   * entry and exit with timing"): `vbee.request.submit` / `vbee.request.resubmit`
   * (distinguishing a genuinely fresh submission from one triggered by a stale/not-found existing
   * request) and `vbee.audio.download`, each with a `.success`/`.error` suffix. The repeated
   * poll-while-PROCESSING calls are deliberately NOT logged individually — every 2-5s for up to 5
   * minutes would flood the log for no diagnostic gain; the overall outcome is already covered by
   * `pipeline-engine.ts`'s generic `pipeline.scene.audio.*`. */
  logger?: Logger;
}

interface LoggableError {
  code: string;
  message: string;
}

function toLoggableError(error: unknown): LoggableError {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "VBEE_UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOrTransientError(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new AppError({
      code: "VBEE_NETWORK_ERROR",
      errorKind: "transient",
      message: `network error calling Vbee: ${cause instanceof Error ? cause.message : String(cause)}`,
      cause,
    });
  }
}

async function parseJsonOrTransientError(response: Response, context: string): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new AppError({
      code: "VBEE_UNEXPECTED_RESPONSE",
      errorKind: "transient",
      message: `Vbee's ${context} response was not valid JSON`,
      cause,
    });
  }
}

/** Real `TtsProvider` (../../.claude/rules/architecture.md provider/strategy pattern) against the
 * verified contract in `../../.claude/rules/vbee-tts.md`. Replaces `FakeTtsProvider` (task 003). */
export function createVbeeTtsProvider(options: VbeeTtsProviderOptions): TtsProvider {
  const now = options.now ?? ((): Date => new Date());
  const pollTimeoutMs = options.pollTimeoutMs ?? POLL_TIMEOUT_MS;
  const measureDurationMs = options.measureDurationMs ?? measureAudioDurationMs;

  /** Prefers the per-call `context.logger` (../../domain/providers.ts: a `{projectId, runId,
   * stage}` child built fresh by `pipeline-engine.ts` for the run in progress) over the
   * construction-time `options.logger`, so these lines carry the SAME correlation fields as the
   * rest of this run's pino output instead of only the provider's own logger, which predates
   * `runId`. Pino output only (see `AudioGenerationContext.logger`'s own doc comment): this does
   * NOT route the line into `logs/run-<runId>.ndjson` or the SSE `log` stream. */
  function log(
    context: AudioGenerationContext,
    level: "info" | "warn" | "error",
    fields: Record<string, unknown>,
    msg: string,
  ): void {
    (context.logger ?? options.logger)?.[level](fields, msg);
  }

  function headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${options.token}`,
      "App-Id": options.appId,
      "Content-Type": "application/json",
    };
  }

  async function submitRequest(text: string, voiceCode: string): Promise<string> {
    const body = {
      text: prepareNarration(text),
      mode: "async" as const,
      webhookUrl: options.webhookUrl,
      voiceCode,
      ...vbeeNarrationOptions(options.ttsOptions),
    };
    const response = await fetchOrTransientError(VBEE_BASE_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw classifyVbeeHttpError({ status: response.status, rawBody: await response.text() });
    }
    const json = await parseJsonOrTransientError(response, "submit");
    const parsed = vbeeSubmitResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError({
        code: "VBEE_UNEXPECTED_RESPONSE",
        errorKind: "transient",
        message: "Vbee's submit response did not match the documented contract",
        context: { issues: parsed.error.issues },
      });
    }
    return parsed.data.requestId;
  }

  type PollResult =
    { kind: "processing" } | { kind: "completed"; audioLink: string } | { kind: "not_found" };

  async function pollOnce(requestId: string): Promise<PollResult> {
    const response = await fetchOrTransientError(`${VBEE_BASE_URL}/requests/${requestId}`, {
      headers: headers(),
    });
    if (!response.ok) {
      const rawBody = await response.text();
      if (isRequestNotFound({ status: response.status, rawBody })) {
        return { kind: "not_found" };
      }
      throw classifyVbeeHttpError({ status: response.status, rawBody });
    }
    const json = await parseJsonOrTransientError(response, "polling");
    const parsed = vbeePollingResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError({
        code: "VBEE_UNEXPECTED_RESPONSE",
        errorKind: "transient",
        message: "Vbee's polling response did not match the documented contract",
        context: { issues: parsed.error.issues },
      });
    }
    if (parsed.data.status === "COMPLETED") {
      return { kind: "completed", audioLink: parsed.data.audioLink };
    }
    return { kind: "processing" };
  }

  async function downloadAudio(
    audioLink: string,
    context: AudioGenerationContext,
  ): Promise<Buffer> {
    const logFields = { projectId: context.projectId, sceneIndex: context.sceneIndex };
    log(context, "info", logFields, "vbee.audio.download");
    let response: Response;
    try {
      response = await fetchOrTransientError(audioLink);
      if (!response.ok) {
        throw new AppError({
          code: "VBEE_AUDIO_LINK_EXPIRED",
          errorKind: "transient",
          message: `audioLink returned HTTP ${String(response.status)} (the link may have expired)`,
          context: { status: response.status },
        });
      }
    } catch (error) {
      log(
        context,
        "error",
        { ...logFields, err: toLoggableError(error) },
        "vbee.audio.download.error",
      );
      throw error;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.subarray(0, MP3_MAGIC_BYTES.length).equals(MP3_MAGIC_BYTES)) {
      const error = new AppError({
        code: "VBEE_AUDIO_NOT_MP3",
        errorKind: "transient",
        message: "downloaded audio does not start with the MP3 ID3 magic bytes",
      });
      log(
        context,
        "error",
        { ...logFields, err: toLoggableError(error) },
        "vbee.audio.download.error",
      );
      throw error;
    }
    log(context, "info", logFields, "vbee.audio.download.success");
    return buffer;
  }

  /** Follows `audioLink`, retrying with a FRESH link (re-polled) up to
   * `MAX_EXPIRED_LINK_RETRIES` times if the link itself has already expired
   * (../../.claude/rules/vbee-tts.md: a link is only valid for 3 minutes). */
  async function downloadWithFreshLinkRetry(
    requestId: string,
    firstLink: string,
    context: AudioGenerationContext,
  ): Promise<Buffer> {
    let currentLink = firstLink;
    for (let attempt = 0; ; attempt++) {
      try {
        return await downloadAudio(currentLink, context);
      } catch (error) {
        if (attempt >= MAX_EXPIRED_LINK_RETRIES) {
          throw error;
        }
        const poll = await pollOnce(requestId);
        if (poll.kind !== "completed") {
          throw error; // the request itself regressed/disappeared; surface the download error
        }
        currentLink = poll.audioLink;
      }
    }
  }

  async function submitFresh(
    text: string,
    context: AudioGenerationContext,
    isResubmit: boolean,
  ): Promise<{ requestId: string }> {
    const eventName = isResubmit ? "vbee.request.resubmit" : "vbee.request.submit";
    const logFields = { projectId: context.projectId, sceneIndex: context.sceneIndex };
    log(context, "info", logFields, eventName);
    let requestId: string;
    try {
      requestId = await submitRequest(text, context.voice);
    } catch (error) {
      log(context, "error", { ...logFields, err: toLoggableError(error) }, `${eventName}.error`);
      throw error;
    }
    log(context, "info", { ...logFields, requestId }, `${eventName}.success`);
    await context.onRequestSubmitted?.({ requestId, submittedAt: now().toISOString() });
    return { requestId };
  }

  async function synthesize(
    text: string,
    context: AudioGenerationContext,
  ): Promise<GeneratedAudio> {
    const existing = context.existingRequest;
    const existingIsFresh =
      existing !== undefined &&
      now().getTime() - Date.parse(existing.submittedAt) < REQUEST_MAX_AGE_MS;
    const isResubmit = existing !== undefined && !existingIsFresh;

    let requestId = existingIsFresh
      ? existing.requestId
      : (await submitFresh(text, context, isResubmit)).requestId;

    const deadline = now().getTime() + pollTimeoutMs;
    let isFirstPoll = true;
    let completedAudioLink: string | undefined;

    while (completedAudioLink === undefined) {
      if (now().getTime() > deadline) {
        throw new AppError({
          code: "VBEE_POLL_TIMEOUT",
          errorKind: "transient",
          message: `polling for Vbee request ${requestId} exceeded ${String(pollTimeoutMs)}ms`,
          context: { requestId },
        });
      }

      const poll = await pollOnce(requestId);
      if (poll.kind === "completed") {
        completedAudioLink = poll.audioLink;
        break;
      }
      if (poll.kind === "not_found") {
        requestId = (await submitFresh(text, context, true)).requestId;
        isFirstPoll = true;
        continue;
      }
      await sleep(isFirstPoll ? POLL_INTERVAL_FIRST_MS : POLL_INTERVAL_LATER_MS);
      isFirstPoll = false;
    }

    const audioBuffer = await downloadWithFreshLinkRetry(requestId, completedAudioLink, context);

    const fileName = `${String(context.sceneIndex).padStart(3, "0")}.mp3`;
    const audioDir = path.join(options.assetsDir, "audio");
    await fs.mkdir(audioDir, { recursive: true });
    const filePath = path.join(audioDir, fileName);
    await fs.writeFile(filePath, audioBuffer);

    const durationMs = await measureDurationMs(filePath);
    return { file: `audio/${fileName}`, durationMs };
  }

  return { synthesize };
}
