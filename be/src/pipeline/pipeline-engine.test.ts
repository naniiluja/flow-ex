import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import pino, { type Logger } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScriptInput } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import type {
  ImageProvider,
  TranscriptionProvider,
  TtsProvider,
  VideoRenderer,
} from "../domain/providers.ts";
import { createProjectStore, type ProjectStore } from "../store/project-store.ts";
import { createPipelineEngine } from "./pipeline-engine.ts";
import type { PipelineEvent, PipelineEventBus } from "./pipeline-events.ts";

const SILENT_LOGGER = pino({ level: "silent" });
const NO_JITTER = (delayMs: number): number => delayMs;

const SCRIPT_2_SCENES: ScriptInput = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  preset: "youtube",
  references: [],
  reviewEnabled: false,
  scenes: [
    { narration: "Xin chao", imagePrompt: "a sunny beach", referenceIds: [] },
    { narration: "Tam biet", imagePrompt: "a quiet evening", referenceIds: [] },
  ],
};

const NOOP_RENDERER: VideoRenderer = { render: () => Promise.resolve(undefined) };

/** Default fake `TranscriptionProvider` for tests that don't care about the captions step itself
 * (most of this file predates task 007's transcribing status) — succeeds immediately with a
 * fixed file, so `runCaptionStep` still exercises the real transcribing -> ready_for_render
 * transition without every existing test needing its own transcription double. */
const DEFAULT_TRANSCRIPTION_PROVIDER: TranscriptionProvider = {
  transcribe: () => Promise.resolve({ file: "captions/000.json" }),
};

/** A spy `Logger` where every `.child(...)` call (pipeline-engine.ts creates a fresh child per
 * log line) returns the SAME mocked child, so `.info`/`.warn`/`.error` calls across the whole run
 * accumulate on one place a test can assert against. */
function makeSpyLogger(): {
  logger: Logger;
  child: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
} {
  const child = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const logger = { child: vi.fn(() => child) };
  return { logger: logger as unknown as Logger, child };
}

function buildEngine(
  store: ProjectStore,
  imageProvider: ImageProvider,
  ttsProvider: TtsProvider,
  overrides: {
    scheduleMs?: readonly number[];
    videoRenderer?: VideoRenderer;
    eventBus?: PipelineEventBus;
    baseLogger?: Logger;
    transcriptionProvider?: TranscriptionProvider;
    imageConcurrency?: number;
    signal?: AbortSignal;
  } = {},
) {
  return createPipelineEngine({
    store,
    imageProvider,
    ttsProvider,
    transcriptionProvider: overrides.transcriptionProvider ?? DEFAULT_TRANSCRIPTION_PROVIDER,
    baseLogger: overrides.baseLogger ?? SILENT_LOGGER,
    retryScheduleMs: overrides.scheduleMs ?? [1, 1, 1],
    jitter: NO_JITTER,
    videoRenderer: overrides.videoRenderer ?? NOOP_RENDERER,
    eventBus: overrides.eventBus,
    imageConcurrency: overrides.imageConcurrency,
    signal: overrides.signal,
  });
}

/**
 * Contract-level matrix for `createPipelineEngine(options).run(projectId)`.
 *
 * | scene provider behavior                          | Expected                                          |
 * | -------------------------------------------------- | --------------------------------------------------- |
 * | all scenes succeed on the first try                 | runStatus completed, every scene ready_for_render   |
 * | scene 0's image fails twice (transient) then succeeds | retries via the schedule, run still completes     |
 * | scene 0's image always fails (transient, exhausted)   | run rejects, scene 0 failed, scene 1 never touched |
 * | scene 0 already ready_for_render, scene 1 mid-flight  | resume: scene 0's provider never called again      |
 */
describe("createPipelineEngine", () => {
  let root: string;
  let store: ProjectStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-pipeline-engine-"));
    store = createProjectStore(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("drives every scene to ready_for_render, then renders and completes the run", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });
    const render = vi.fn<VideoRenderer["render"]>().mockResolvedValue(undefined);

    const result = await buildEngine(
      store,
      { generateImage },
      { synthesize },
      { videoRenderer: { render } },
    ).run(project.id);

    expect(result.runStatus).toBe("completed");
    expect(result.outputFile).toBe("output.mp4");
    for (const scene of result.scenes) {
      expect(scene.status).toBe("ready_for_render");
      expect(scene.imageFile).toBe("img.png");
      expect(scene.audioFile).toBe("audio.wav");
    }
    expect(generateImage).toHaveBeenCalledTimes(2);
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("emits a scene SSE event for every real status transition, in order (acceptance criterion 5)", async () => {
    const project = await store.create({
      ...SCRIPT_2_SCENES,
      scenes: [SCRIPT_2_SCENES.scenes[0] ?? { narration: "x", imagePrompt: "y", referenceIds: [] }],
    });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });

    const received: PipelineEvent[] = [];
    const eventBus: PipelineEventBus = {
      emit: (_projectId, event) => {
        received.push(event);
      },
      subscribe: () => () => undefined,
    };

    await buildEngine(store, { generateImage }, { synthesize }, { eventBus }).run(project.id);

    const sceneStatuses = received
      .filter((event) => event.type === "scene")
      .map((event) => event.status);
    expect(sceneStatuses).toEqual([
      "generating_image",
      "generating_audio",
      "transcribing",
      "ready_for_render",
    ]);
  });

  it("writes an NDJSON run log with the required correlation fields (acceptance criterion 6)", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });

    const finished = await buildEngine(store, { generateImage }, { synthesize }).run(project.id);

    const finishedRunId = finished.runId;
    if (finishedRunId === undefined) throw new Error("expected the finished run to have a runId");
    const logPath = path.join(root, project.id, "logs", `run-${finishedRunId}.ndjson`);
    const lines = (await fs.readFile(logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => {
        return JSON.parse(line) as Record<string, unknown>;
      });
    expect(lines.length).toBeGreaterThan(0);

    // At least one line is scene-scoped (carries a sceneIndex and an attempt count) and every
    // line carries the run-wide correlation fields (logging.md).
    const sceneScoped = lines.find((line) => "sceneIndex" in line && "attempt" in line);
    expect(sceneScoped).toBeDefined();
    for (const line of lines) {
      expect(line).toHaveProperty("projectId", project.id);
      expect(line).toHaveProperty("runId", finishedRunId);
      expect(line).toHaveProperty("stage");
    }
  });

  it("retries a transient image failure per the schedule, then completes", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    let imageCalls = 0;
    const generateImage = vi.fn<ImageProvider["generateImage"]>().mockImplementation(() => {
      imageCalls += 1;
      if (imageCalls <= 2) {
        throw new AppError({ code: "FLAKY", errorKind: "transient", message: "flaky" });
      }
      return Promise.resolve({ file: "img.png", width: 1920, height: 1080 });
    });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });

    const result = await buildEngine(store, { generateImage }, { synthesize }).run(project.id);

    expect(result.runStatus).toBe("completed");
    // Scene 0's image step took 3 calls (2 failures + 1 success); scene 1's took 1.
    const scene0 = result.scenes[0];
    if (scene0 === undefined) throw new Error("expected scene 0");
    expect(scene0.attempts).toBeGreaterThanOrEqual(3 + 1); // image attempts + 1 audio attempt
  });

  it("marks every scene and the run failed once retries are exhausted, and never starts audio", async () => {
    // Task 014: the image phase now runs every scene's image step CONCURRENTLY (default
    // concurrency 3, both scenes here fit in one batch), so a provider that always rejects fails
    // BOTH scenes' image steps (not just the first one it happens to reach) before the run is
    // marked failed — a real behavior change from the old strictly-sequential loop, where scene 1
    // was never even attempted. Audio never starts either way, since the whole image phase must
    // succeed before phase 2 begins.
    const project = await store.create(SCRIPT_2_SCENES);
    const persistentError = new AppError({
      code: "FLOW_DOWN",
      errorKind: "transient",
      message: "always fails",
    });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockRejectedValue(persistentError);
    const synthesize = vi.fn<TtsProvider["synthesize"]>();

    await expect(
      buildEngine(store, { generateImage }, { synthesize }).run(project.id),
    ).rejects.toBe(persistentError);

    const finalProject = await store.read(project.id);
    expect(finalProject.runStatus).toBe("failed");
    const scene0 = finalProject.scenes[0];
    if (scene0 === undefined) throw new Error("expected scene 0");
    expect(scene0.status).toBe("failed");
    expect(scene0.lastError).toEqual({ code: "FLOW_DOWN", message: "always fails" });
    const scene1 = finalProject.scenes[1];
    if (scene1 === undefined) throw new Error("expected scene 1");
    expect(scene1.status).toBe("failed"); // also attempted, concurrently with scene 0
    expect(scene1.lastError).toEqual({ code: "FLOW_DOWN", message: "always fails" });
    expect(synthesize).not.toHaveBeenCalled();
  });

  it("logs a scene failure at pino's error level, not info (regression guard)", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const persistentError = new AppError({
      code: "FLOW_DOWN",
      errorKind: "transient",
      message: "always fails",
    });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockRejectedValue(persistentError);
    const synthesize = vi.fn<TtsProvider["synthesize"]>();
    const { logger, child } = makeSpyLogger();

    await expect(
      buildEngine(store, { generateImage }, { synthesize }, { baseLogger: logger }).run(project.id),
    ).rejects.toBe(persistentError);

    expect(child.error).toHaveBeenCalledWith(expect.anything(), "pipeline.scene.image.error");
    expect(child.error).toHaveBeenCalledWith(expect.anything(), "pipeline.run.error");
    // A logging-level regression (hardcoding `.info` regardless of the requested level) would
    // route these same two messages through `.info` instead — assert they never land there.
    expect(child.info).not.toHaveBeenCalledWith(expect.anything(), "pipeline.scene.image.error");
    expect(child.info).not.toHaveBeenCalledWith(expect.anything(), "pipeline.run.error");
  });

  it("resumes a project without re-running an already ready_for_render scene", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    // Seed state as if a previous process had finished scene 0 and was killed mid-image-step on
    // scene 1 (mirrors what a real SIGKILL leaves behind; see pipeline-resume-process-kill.test.ts
    // for the real subprocess-kill version of this scenario).
    await store.update(project.id, (p) => {
      const existingScene0 = p.scenes[0];
      const existingScene1 = p.scenes[1];
      if (existingScene0 === undefined || existingScene1 === undefined) {
        throw new Error("expected 2 seeded scenes");
      }
      const scenes = [...p.scenes];
      scenes[0] = {
        ...existingScene0,
        status: "ready_for_render",
        imageFile: "existing.png",
        audioFile: "existing.wav",
        audioDurationMs: 1200,
      };
      scenes[1] = { ...existingScene1, status: "generating_image" };
      return { ...p, scenes };
    });

    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "new.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "new.wav", durationMs: 1500 });

    const result = await buildEngine(store, { generateImage }, { synthesize }).run(project.id);

    expect(result.runStatus).toBe("completed");
    expect(generateImage).toHaveBeenCalledTimes(1);
    expect(generateImage).toHaveBeenCalledWith(
      "a quiet evening",
      expect.objectContaining({ sceneIndex: 1 }),
    );
    const scene0 = result.scenes[0];
    if (scene0 === undefined) throw new Error("expected scene 0");
    expect(scene0.imageFile).toBe("existing.png"); // untouched by this run
  });

  it("pauses at awaiting_review once every scene's image is generated, when reviewEnabled is on (task 006)", async () => {
    const project = await store.create({ ...SCRIPT_2_SCENES, reviewEnabled: true });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1376, height: 768 });
    const synthesize = vi.fn<TtsProvider["synthesize"]>();
    const render = vi.fn<VideoRenderer["render"]>();

    const result = await buildEngine(
      store,
      { generateImage },
      { synthesize },
      { videoRenderer: { render } },
    ).run(project.id);

    expect(result.runStatus).toBe("awaiting_review");
    for (const scene of result.scenes) {
      expect(scene.status).toBe("awaiting_review");
      expect(scene.imageVariants).toEqual([{ file: "img.png", width: 1376, height: 768 }]);
    }
    expect(synthesize).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("resumes past the review gate and completes once every scene is approved (task 006)", async () => {
    const project = await store.create({ ...SCRIPT_2_SCENES, reviewEnabled: true });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1376, height: 768 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });
    const render = vi.fn<VideoRenderer["render"]>().mockResolvedValue(undefined);
    const engine = buildEngine(
      store,
      { generateImage },
      { synthesize },
      { videoRenderer: { render } },
    );

    const paused = await engine.run(project.id);
    expect(paused.runStatus).toBe("awaiting_review");

    // Simulate the FE's approve action for every scene (be/src/routes/scenes.ts, task 006):
    // scene_approved moves each scene from awaiting_review to generating_audio directly.
    await store.update(project.id, (p) => ({
      ...p,
      scenes: p.scenes.map((scene) => ({ ...scene, status: "generating_audio" as const })),
    }));

    const finished = await engine.run(project.id);

    expect(finished.runStatus).toBe("completed");
    expect(finished.runId).toBe(paused.runId); // same logical run, one continuous NDJSON log
    expect(generateImage).toHaveBeenCalledTimes(2); // not re-generated on resume
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("never pauses when reviewEnabled is off (default), matching every prior task's behavior", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });

    const result = await buildEngine(store, { generateImage }, { synthesize }).run(project.id);

    expect(result.runStatus).toBe("completed");
    for (const scene of result.scenes) {
      expect(scene.status).toBe("ready_for_render");
    }
  });

  it("persists a stateful TTS provider's requestId before polling, so a retry resumes from it instead of resubmitting (task 004)", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });

    // Scene 0's FIRST audio attempt submits a request (persisted via onRequestSubmitted) then
    // fails transiently; its SECOND attempt must see that same requestId back as
    // `existingRequest`, proving `runAudioStep` re-reads project state fresh per retry attempt
    // instead of resubmitting (and re-spending real Vbee credit) — this is the exact mechanism
    // `pipeline-engine.ts:210-212`'s comment claims but that, until this test, no test proved.
    // Scene 1 has no prior request, so its one attempt must see `existingRequest` as `undefined`.
    const attemptsByScene = new Map<number, number>();
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockImplementation(async (_text, context) => {
        const attempt = (attemptsByScene.get(context.sceneIndex) ?? 0) + 1;
        attemptsByScene.set(context.sceneIndex, attempt);

        if (context.sceneIndex === 0 && attempt === 1) {
          expect(context.existingRequest).toBeUndefined();
          await context.onRequestSubmitted?.({
            requestId: "req-1",
            submittedAt: "2026-01-01T00:00:00.000Z",
          });
          throw new AppError({ code: "VBEE_TRANSIENT", errorKind: "transient", message: "flaky" });
        }
        if (context.sceneIndex === 0 && attempt === 2) {
          expect(context.existingRequest).toEqual({
            requestId: "req-1",
            submittedAt: "2026-01-01T00:00:00.000Z",
          });
        }
        if (context.sceneIndex === 1) {
          expect(context.existingRequest).toBeUndefined();
        }
        return { file: `audio-${String(context.sceneIndex)}.wav`, durationMs: 1500 };
      });

    const result = await buildEngine(store, { generateImage }, { synthesize }).run(project.id);

    expect(result.runStatus).toBe("completed");
    expect(attemptsByScene.get(0)).toBe(2); // 1 failed submit + 1 successful resume, never a 3rd
    const scene0 = result.scenes[0];
    if (scene0 === undefined) throw new Error("expected scene 0");
    expect(scene0.audioRequestId).toBe("req-1");
    expect(scene0.audioRequestSubmittedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("transcribes each scene's audio and persists captionsFile (task 007)", async () => {
    const project = await store.create(SCRIPT_2_SCENES);
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });
    const transcribe = vi
      .fn<TranscriptionProvider["transcribe"]>()
      .mockImplementation((_audioFile, context) =>
        Promise.resolve({ file: `captions/${String(context.sceneIndex)}.json` }),
      );

    const result = await buildEngine(
      store,
      { generateImage },
      { synthesize },
      {
        transcriptionProvider: { transcribe },
      },
    ).run(project.id);

    expect(result.runStatus).toBe("completed");
    expect(transcribe).toHaveBeenCalledTimes(2);
    expect(transcribe).toHaveBeenCalledWith(
      "audio.wav",
      expect.objectContaining({ sceneIndex: 0, durationMs: 1500, narration: "Xin chao" }),
    );
    for (const [index, scene] of result.scenes.entries()) {
      expect(scene.captionsFile).toBe(`captions/${String(index)}.json`);
    }
  });

  it("marks the scene and the run failed when transcription itself fails, without touching the audio already generated", async () => {
    const project = await store.create({
      ...SCRIPT_2_SCENES,
      scenes: [SCRIPT_2_SCENES.scenes[0] ?? { narration: "x", imagePrompt: "y", referenceIds: [] }],
    });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockResolvedValue({ file: "img.png", width: 1920, height: 1080 });
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1500 });
    const persistentError = new AppError({
      code: "WHISPER_DOWN",
      errorKind: "transient",
      message: "always fails",
    });
    const transcribe = vi
      .fn<TranscriptionProvider["transcribe"]>()
      .mockRejectedValue(persistentError);

    await expect(
      buildEngine(
        store,
        { generateImage },
        { synthesize },
        {
          transcriptionProvider: { transcribe },
        },
      ).run(project.id),
    ).rejects.toBe(persistentError);

    const finalProject = await store.read(project.id);
    expect(finalProject.runStatus).toBe("failed");
    const scene0 = finalProject.scenes[0];
    if (scene0 === undefined) throw new Error("expected scene 0");
    expect(scene0.status).toBe("failed");
    expect(scene0.audioFile).toBe("audio.wav"); // the already-generated audio is left in place
    expect(scene0.lastError).toEqual({ code: "WHISPER_DOWN", message: "always fails" });
  });
});

/**
 * Task 014: EP/BVA matrix for the concurrent image phase's own behavior (independent of any
 * particular `ImageProvider` implementation — the fake providers below stand in for
 * `FlowImageProvider`, whose own submit-mutex/tile-index behavior is covered separately in
 * `providers/flow/flow-automation.test.ts`).
 *
 * | Scenario                                                    | Expected                                |
 * | -------------------------------------------------------------- | -------------------------------------------- |
 * | concurrency 1 (BVA min)                                          | all scenes still complete, correctly assigned |
 * | concurrency 3 (default)                                            | wall time < sequential time; no cross-scene mixup |
 * | concurrency greater than scene count                                 | no crash, all scenes complete once           |
 * | one scene's image fails partway through the batch                       | the other scenes still complete normally  |
 * | AbortSignal fires mid-batch                                                | every in-flight image task stops, nothing hangs |
 */
describe("createPipelineEngine — concurrent image phase (task 014)", () => {
  let root: string;
  let store: ProjectStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-pipeline-concurrency-"));
    store = createProjectStore(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const SCRIPT_6_SCENES: ScriptInput = {
    title: "Sau canh",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    aspectRatio: "16:9",
    preset: "youtube",
    reviewEnabled: false,
    references: [],
    scenes: Array.from({ length: 6 }, (_, i) => ({
      narration: `Canh so ${String(i)}`,
      imagePrompt: `prompt ${String(i)}`,
      referenceIds: [],
    })),
  };

  // Large enough that the artificial delay dominates over real store.update()/disk I/O overhead
  // (write-file-atomic per scene transition), so the concurrency win is measured cleanly.
  const IMAGE_DELAY_MS = 300;

  /** Embeds `sceneIndex` into the returned file name (like `FakeImageProvider` really does) so a
   * test can assert each scene's PERSISTED `imageFile` matches ITS OWN sceneIndex, not a
   * neighbor's — the exact class of bug a concurrency race would produce. */
  function delayedImageProvider(): ImageProvider {
    return {
      generateImage: vi.fn<ImageProvider["generateImage"]>(async (_prompt, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
        return {
          file: `images/${String(ctx.sceneIndex)}-generated.png`,
          width: 1920,
          height: 1080,
        };
      }),
    };
  }

  it.each([1, 3, 10])(
    "with imageConcurrency %i, every scene completes and keeps its OWN image file",
    async (imageConcurrency) => {
      const project = await store.create(SCRIPT_6_SCENES);
      const imageProvider = delayedImageProvider();
      const synthesize = vi
        .fn<TtsProvider["synthesize"]>()
        .mockResolvedValue({ file: "audio.wav", durationMs: 1000 });

      const result = await buildEngine(
        store,
        imageProvider,
        { synthesize },
        { imageConcurrency },
      ).run(project.id);

      expect(result.runStatus).toBe("completed");
      result.scenes.forEach((scene, sceneIndex) => {
        expect(scene.status).toBe("ready_for_render");
        expect(scene.imageFile).toBe(`images/${String(sceneIndex)}-generated.png`);
      });
    },
  );

  it("with the default concurrency, wall time is well under the fully-sequential baseline", async () => {
    const project = await store.create(SCRIPT_6_SCENES);
    const imageProvider = delayedImageProvider();
    const synthesize = vi
      .fn<TtsProvider["synthesize"]>()
      .mockResolvedValue({ file: "audio.wav", durationMs: 1000 });

    const startedAt = Date.now();
    await buildEngine(store, imageProvider, { synthesize }, { imageConcurrency: 3 }).run(
      project.id,
    );
    const elapsedMs = Date.now() - startedAt;
    const sequentialBaselineMs = SCRIPT_6_SCENES.scenes.length * IMAGE_DELAY_MS;

    // 6 scenes at concurrency 3 -> 2 batches, so the image phase alone should be roughly
    // 2*IMAGE_DELAY_MS, well under 60% of the 6*IMAGE_DELAY_MS sequential baseline even counting
    // the sequential audio phase's own (near-zero, mocked) time.
    expect(elapsedMs).toBeLessThan(sequentialBaselineMs * 0.6);
  });

  it("one scene's image failure does not stop the OTHER scenes from completing their image step", async () => {
    const project = await store.create(SCRIPT_6_SCENES);
    const persistentError = new AppError({
      code: "FLOW_DOWN",
      errorKind: "transient",
      message: "scene 2 always fails",
    });
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockImplementation(async (_prompt, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
        if (ctx.sceneIndex === 2) {
          throw persistentError;
        }
        return { file: `images/${String(ctx.sceneIndex)}.png`, width: 1920, height: 1080 };
      });
    const synthesize = vi.fn<TtsProvider["synthesize"]>();

    await expect(
      buildEngine(store, { generateImage }, { synthesize }, { imageConcurrency: 3 }).run(
        project.id,
      ),
    ).rejects.toBe(persistentError);

    const finalProject = await store.read(project.id);
    expect(finalProject.runStatus).toBe("failed");
    finalProject.scenes.forEach((scene, sceneIndex) => {
      if (sceneIndex === 2) {
        expect(scene.status).toBe("failed");
      } else {
        // Every OTHER scene's image step still ran to completion despite scene 2's failure.
        expect(scene.imageFile).toBe(`images/${String(sceneIndex)}.png`);
      }
    });
  });

  it("an AbortSignal fired mid-batch stops every in-flight image task without hanging", async () => {
    const project = await store.create(SCRIPT_6_SCENES);
    const controller = new AbortController();
    const generateImage = vi
      .fn<ImageProvider["generateImage"]>()
      .mockImplementation(async (_prompt, ctx) => {
        await new Promise((resolve) => setTimeout(resolve, IMAGE_DELAY_MS));
        throw new AppError({
          code: "FLOW_DOWN",
          errorKind: "transient",
          message: `scene ${String(ctx.sceneIndex)} transient failure`,
        });
      });
    const synthesize = vi.fn<TtsProvider["synthesize"]>();

    const runPromise = buildEngine(
      store,
      { generateImage },
      { synthesize },
      // A long retry schedule that would hang the test for real if the abort signal were not
      // honored — `retryWithSchedule` (error-handling.md) cancels its own backoff wait on abort.
      { imageConcurrency: 3, scheduleMs: [60_000, 60_000, 60_000], signal: controller.signal },
    ).run(project.id);
    setTimeout(() => {
      controller.abort();
    }, IMAGE_DELAY_MS * 2);

    await expect(runPromise).rejects.toBeDefined();
    const finalProject = await store.read(project.id);
    expect(finalProject.runStatus).toBe("failed"); // never hung; the run resolved to a terminal state
  }, 10_000);
});
