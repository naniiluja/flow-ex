import path from "node:path";

import type { WhisperModel } from "@remotion/install-whisper-cpp";
import type { Logger } from "pino";

import { resolveNarrationOptions, type Preset, type TtsOptions } from "@flow-ex/shared-schemas";

import type { ImageProvider, TranscriptionProvider, TtsProvider } from "../domain/providers.ts";
import { createFakeImageProvider } from "./fake/fake-image-provider.ts";
import { createFakeTranscriptionProvider } from "./fake/fake-transcription-provider.ts";
import { createFakeTtsProvider } from "./fake/fake-tts-provider.ts";
import { createFlowImageProvider } from "./flow/flow-image-provider.ts";
import { createVbeeTtsProvider } from "./vbee/vbee-tts-provider.ts";
import { createWhisperTranscriptionProvider } from "./whisper/whisper-transcription-provider.ts";

export interface VbeeCredentials {
  appId: string;
  token: string;
  webhookUrl: string;
}

export interface FlowChromeOptions {
  userDataDir: string;
  cdpPort: number;
  chromeExecutablePath?: string;
}

export interface WhisperOptions {
  cacheDir: string;
  model: WhisperModel;
  whisperCppVersion: string;
}

/** Picks the real `FlowImageProvider` only when explicitly opted into via `mode: "real"`
 * (../.claude/rules/flow-automation.md) — its own pure function so the SELECTION itself is unit
 * testable without a real Chrome. Shared by `routes/render.ts` and `routes/scenes.ts` (task 006)
 * via `createImageProviderFactory` below, never imported route-to-route
 * (../.claude/rules/architecture.md's one-way dependency direction). */
export function selectImageProvider(
  mode: "fake" | "real" | undefined,
  chromeOptions: FlowChromeOptions | undefined,
  assetsDir: string,
): ImageProvider {
  if (mode === "real") {
    if (chromeOptions === undefined) {
      throw new Error(
        "selectImageProvider: flowImageProviderMode is 'real' but no flowChromeOptions were given",
      );
    }
    return createFlowImageProvider({ ...chromeOptions, assetsDir });
  }
  return createFakeImageProvider({ assetsDir });
}

/** Task 009: the project's own explicit `tts.speed` WINS; only an UNSET `speed` falls back to the
 * project's preset default (`PRESETS[preset].ttsSpeed`, `@flow-ex/shared-schemas`'s
 * `resolveTtsSpeed`) — same "explicit wins over preset" rule as `resolveAspectRatio`
 * (../../.claude/rules/video.md). A pure function so `be/src/routes/render.ts` can stay a thin
 * handler (../.claude/rules/backend-conventions.md) and this resolution is unit-testable on its
 * own, without spinning up the whole app. */
export function resolveTtsOptionsForProject(
  preset: Preset,
  ttsOptions: TtsOptions | undefined,
): TtsOptions {
  return resolveNarrationOptions(preset, ttsOptions);
}

/** Picks the real `VbeeTtsProvider` when credentials are configured, else `FakeTtsProvider` —
 * its own pure function for the same unit-testability reason as `selectImageProvider`. */
export function selectTtsProvider(
  vbeeCredentials: VbeeCredentials | undefined,
  assetsDir: string,
  logger?: Logger,
  ttsOptions?: TtsOptions,
): TtsProvider {
  return vbeeCredentials
    ? createVbeeTtsProvider({ ...vbeeCredentials, assetsDir, logger, ttsOptions })
    : createFakeTtsProvider({ assetsDir });
}

/** Picks the real `WhisperTranscriptionProvider` only when explicitly opted into via
 * `mode: "whisper"` (task 007's `TRANSCRIBE_PROVIDER` env, mirroring `FLOW_IMAGE_PROVIDER`'s own
 * explicit opt-in switch) — default/absent -> `FakeTranscriptionProvider`, so local dev/tests
 * never trigger a real whisper.cpp install/model download. Constructing the real provider does
 * NOT itself install anything: `createWhisperTranscriptionProvider`'s install+download only runs
 * lazily on the first `transcribe()` call, so selecting it here has no side effect. */
export function selectTranscriptionProvider(
  mode: "fake" | "whisper" | undefined,
  whisperOptions: WhisperOptions | undefined,
  assetsDir: string,
  logger?: Logger,
): TranscriptionProvider {
  if (mode === "whisper") {
    if (whisperOptions === undefined) {
      throw new Error(
        "selectTranscriptionProvider: mode is 'whisper' but no whisperOptions were given",
      );
    }
    return createWhisperTranscriptionProvider({
      assetsDir,
      whisperCacheDir: whisperOptions.cacheDir,
      model: whisperOptions.model,
      whisperCppVersion: whisperOptions.whisperCppVersion,
      logger,
    });
  }
  return createFakeTranscriptionProvider({ assetsDir });
}

/** Returns a per-project `ImageProvider`, constructed ONCE per `projectId` and reused after that
 * (../.claude/rules/backend-conventions.md). `FlowImageProvider` caches its own Chrome/CDP
 * connection in closure and never closes it (flow-automation.md's "connection reuse"); building a
 * FRESH provider on every call — the app used to do this on every `POST /render` and, before this
 * fix, on every task 006 "Sinh lại" click too — opened a new, never-closed CDP connection each
 * time. One factory shared by `render.ts` and `scenes.ts` keeps exactly one live connection per
 * project instead. */
export function createImageProviderFactory(
  mode: "fake" | "real" | undefined,
  chromeOptions: FlowChromeOptions | undefined,
  projectsRoot: string,
): (projectId: string) => ImageProvider {
  const providersByProjectId = new Map<string, ImageProvider>();
  return (projectId: string): ImageProvider => {
    const existing = providersByProjectId.get(projectId);
    if (existing !== undefined) {
      return existing;
    }
    const assetsDir = path.join(projectsRoot, projectId, "assets");
    const provider = selectImageProvider(mode, chromeOptions, assetsDir);
    providersByProjectId.set(projectId, provider);
    return provider;
  };
}
