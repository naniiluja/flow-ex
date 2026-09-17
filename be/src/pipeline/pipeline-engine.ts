import { randomUUID } from "node:crypto";
import path from "node:path";

import type { Logger } from "pino";

import { resolveAspectRatio, type Project, type ProjectScene } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import type {
  ImageProvider,
  TranscriptionProvider,
  TtsProvider,
  VideoRenderer,
} from "../domain/providers.ts";
import { isRetryableError } from "../domain/should-retry.ts";
import { appendNdjsonLine } from "../logging/ndjson-file.ts";
import { OUTPUT_FILE_NAME } from "../store/project-paths.ts";
import type { ProjectStore } from "../store/project-store.ts";
import type { PipelineEventBus } from "./pipeline-events.ts";
import { retryWithSchedule } from "./retry-with-schedule.ts";
import { advanceScene, type SceneEvent } from "./scene-state-machine.ts";

const DEFAULT_SCHEDULE_MS = [30_000, 120_000, 300_000] as const;

function defaultJitter(delayMs: number): number {
  return delayMs + Math.random() * delayMs * 0.1;
}

/** Reduces any thrown value to `{code, message}` — never the full `AppError.context`, which can
 * carry a secret (../.claude/rules/logging.md's own reasoning). Exported so other call sites
 * that log a scene-scoped error (`be/src/pipeline/scene-review.ts`, task 006) reuse the SAME
 * redaction instead of re-deriving it and risking a raw `context` leaking into a log line. */
export function toSceneError(error: unknown): { code: string; message: string } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "PIPELINE_UNEXPECTED_ERROR",
    message: error instanceof Error ? error.message : String(error),
  };
}

/** Deliberately a SEPARATE, plain-`Error` helper from `scene-review.ts`'s own `requireScene` —
 * that one turns a USER-SUPPLIED index (from a URL param) into a 404 `AppError`; this one is an
 * internal invariant check over indices this engine's own `for (sceneIndex...)` loop already
 * knows are valid, so hitting the `undefined` branch here always means a caller bug in THIS
 * file, never a real 404 to surface over HTTP. */
function requireScene(project: Project, sceneIndex: number): ProjectScene {
  const scene = project.scenes[sceneIndex];
  if (scene === undefined) {
    throw new Error(`pipeline-engine: scene index ${String(sceneIndex)} out of range`);
  }
  return scene;
}

export interface PipelineEngineOptions {
  store: ProjectStore;
  imageProvider: ImageProvider;
  ttsProvider: TtsProvider;
  transcriptionProvider: TranscriptionProvider;
  videoRenderer: VideoRenderer;
  baseLogger: Logger;
  eventBus?: PipelineEventBus;
  retryScheduleMs?: readonly number[];
  jitter?: (delayMs: number) => number;
  signal?: AbortSignal;
}

export interface PipelineEngine {
  run(projectId: string): Promise<Project>;
}

export function createPipelineEngine(options: PipelineEngineOptions): PipelineEngine {
  const scheduleMs = options.retryScheduleMs ?? DEFAULT_SCHEDULE_MS;
  const jitter = options.jitter ?? defaultJitter;

  async function run(projectId: string): Promise<Project> {
    let project = await options.store.read(projectId);
    // A run is only ever RESUMED (same runId, same run-log file) while it was left "running" by a
    // crash; completing/failing a run and then triggering a fresh one always gets a new runId, so
    // `logs/run-<runId>.ndjson` and every SSE event stay scoped to one real run (logging.md).
    // A resume covers a crash ("running") AND task 006's clean review-gate pause
    // ("awaiting_review", set below): both leave the run genuinely unfinished, so the SAME runId
    // keeps `logs/run-<runId>.ndjson` (logging.md) as one continuous file across the pause.
    const runId =
      (project.runStatus === "running" || project.runStatus === "awaiting_review") &&
      project.runId !== undefined
        ? project.runId
        : randomUUID();
    const runLogPath = path.join(
      options.store.projectsRoot,
      projectId,
      "logs",
      `run-${runId}.ndjson`,
    );

    // Every `appendNdjsonLine` call is chained onto this tail rather than fired independently:
    // fire-and-forget writes could finish out of order relative to each other, or still be
    // in-flight when `run()` resolves (a real race a caller reading the finished run's log file
    // right after `await engine.run(...)` would hit). `run()` awaits this tail before every exit
    // point (success and each failure path) so the NDJSON file is always complete by then.
    let logWriteQueue: Promise<void> = Promise.resolve();

    function logAndEmit(
      level: "info" | "warn" | "error",
      fields: { stage: string; sceneIndex?: number; attempt?: number; err?: unknown },
      msg: string,
    ): void {
      options.baseLogger.child({ projectId, runId })[level](fields, msg);
      const entry = { level, time: Date.now(), projectId, runId, ...fields, msg };
      logWriteQueue = logWriteQueue
        .then(() => appendNdjsonLine(runLogPath, entry))
        .catch((cause: unknown) => {
          options.baseLogger.error({ err: cause, projectId, runId }, "pipeline.log.write.error");
        });
      options.eventBus?.emit(projectId, { type: "log", ...entry });
    }

    function emitSceneStatus(scene: ProjectScene, sceneIndex: number): void {
      options.eventBus?.emit(projectId, {
        type: "scene",
        projectId,
        runId,
        sceneIndex,
        status: scene.status,
      });
    }

    async function failRun(error: unknown): Promise<void> {
      const sceneError = toSceneError(error);
      logAndEmit("error", { stage: "pipeline", err: sceneError }, "pipeline.run.error");
      project = await options.store.update(projectId, (p) => ({ ...p, runStatus: "failed" }));
      await logWriteQueue;
    }

    /** Runs one retryable generation step (image or audio) for `sceneIndex`: retries `task` per
     * the shared schedule, persists the result via `onSuccess`'s scene patch or a `failed`
     * status on exhaustion, and logs/emits either way. Shared by `runImageStep`/`runAudioStep`,
     * which differ only in the 4 arguments below. */
    async function executeStep<T>(
      sceneIndex: number,
      stage: "image" | "audio" | "captions",
      events: { success: SceneEvent; failure: SceneEvent },
      task: () => Promise<T>,
      onSuccess: (result: T, current: ProjectScene) => Partial<ProjectScene>,
    ): Promise<void> {
      let attempts = 0;
      try {
        const result = await retryWithSchedule(
          async () => {
            attempts += 1;
            return task();
          },
          { scheduleMs, jitter, shouldRetry: isRetryableError, signal: options.signal },
        );
        project = await options.store.update(projectId, (p) => {
          const scenes = [...p.scenes];
          const current = requireScene(p, sceneIndex);
          scenes[sceneIndex] = {
            ...current,
            ...onSuccess(result, current),
            status: advanceScene(current.status, events.success),
            attempts: current.attempts + attempts,
          };
          return { ...p, scenes };
        });
        logAndEmit(
          "info",
          { stage, sceneIndex, attempt: attempts },
          `pipeline.scene.${stage}.success`,
        );
        emitSceneStatus(requireScene(project, sceneIndex), sceneIndex);
      } catch (error) {
        project = await options.store.update(projectId, (p) => {
          const scenes = [...p.scenes];
          const current = requireScene(p, sceneIndex);
          scenes[sceneIndex] = {
            ...current,
            status: advanceScene(current.status, events.failure),
            attempts: current.attempts + attempts,
            lastError: toSceneError(error),
          };
          return { ...p, scenes };
        });
        logAndEmit(
          "error",
          { stage, sceneIndex, attempt: attempts, err: toSceneError(error) },
          `pipeline.scene.${stage}.error`,
        );
        emitSceneStatus(requireScene(project, sceneIndex), sceneIndex);
        throw error;
      }
    }

    async function runImageStep(sceneIndex: number): Promise<void> {
      let scene = requireScene(project, sceneIndex);
      if (scene.status === "pending") {
        const nextStatus = advanceScene(scene.status, "begin_image");
        project = await options.store.update(projectId, (p) => {
          const scenes = [...p.scenes];
          scenes[sceneIndex] = { ...requireScene(p, sceneIndex), status: nextStatus };
          return { ...p, scenes };
        });
        scene = requireScene(project, sceneIndex);
        emitSceneStatus(scene, sceneIndex);
      }
      if (scene.status !== "generating_image") {
        return; // resumed past this step already (awaiting_review/generating_audio/ready_for_render)
      }

      await executeStep(
        sceneIndex,
        "image",
        {
          // Task 006: pause at `awaiting_review` instead of jumping straight to
          // `generating_audio` when the project's "Dừng để duyệt" switch is on
          // (be/.claude/rules/flow-automation.md).
          success: project.reviewEnabled ? "image_needs_review" : "image_succeeded",
          failure: "image_failed",
        },
        () =>
          options.imageProvider.generateImage(scene.imagePrompt, {
            projectId,
            sceneIndex,
            aspectRatio: resolveAspectRatio(project),
            logger: options.baseLogger.child({ projectId, runId, stage: "image" }),
          }),
        (image, current) => ({
          imageFile: image.file,
          imageWidth: image.width,
          imageHeight: image.height,
          imageVariants: [
            ...current.imageVariants,
            { file: image.file, width: image.width, height: image.height },
          ],
        }),
      );
    }

    async function runAudioStep(sceneIndex: number): Promise<void> {
      const scene = requireScene(project, sceneIndex);
      if (scene.status !== "generating_audio") {
        return; // resumed at/past this step (ready_for_render) or image step did not complete
      }

      await executeStep(
        sceneIndex,
        "audio",
        { success: "audio_succeeded", failure: "audio_failed" },
        () => {
          // Read fresh each retry attempt: a stateful provider (VbeeTtsProvider) may have
          // persisted a NEW requestId via onRequestSubmitted on a prior attempt within this same
          // executeStep call, and a later attempt must resume from THAT one, not re-submit.
          const current = requireScene(project, sceneIndex);
          const existingRequest =
            current.audioRequestId !== undefined && current.audioRequestSubmittedAt !== undefined
              ? { requestId: current.audioRequestId, submittedAt: current.audioRequestSubmittedAt }
              : undefined;
          return options.ttsProvider.synthesize(current.narration, {
            projectId,
            sceneIndex,
            voice: project.voice,
            existingRequest,
            logger: options.baseLogger.child({ projectId, runId, stage: "audio" }),
            onRequestSubmitted: async (request) => {
              project = await options.store.update(projectId, (p) => {
                const scenes = [...p.scenes];
                const target = requireScene(p, sceneIndex);
                scenes[sceneIndex] = {
                  ...target,
                  audioRequestId: request.requestId,
                  audioRequestSubmittedAt: request.submittedAt,
                };
                return { ...p, scenes };
              });
            },
          });
        },
        (audio) => ({ audioFile: audio.file, audioDurationMs: audio.durationMs }),
      );
    }

    async function runCaptionStep(sceneIndex: number): Promise<void> {
      const scene = requireScene(project, sceneIndex);
      if (scene.status !== "transcribing") {
        return; // resumed at/past this step (ready_for_render) or audio step did not complete
      }

      await executeStep(
        sceneIndex,
        "captions",
        { success: "captions_succeeded", failure: "captions_failed" },
        () => {
          const current = requireScene(project, sceneIndex);
          if (current.audioFile === undefined) {
            throw new Error(
              `pipeline-engine: scene ${String(sceneIndex)} reached transcribing with no audioFile`,
            );
          }
          return options.transcriptionProvider.transcribe(current.audioFile, {
            projectId,
            sceneIndex,
            durationMs: current.audioDurationMs ?? 0,
            narration: current.narration,
            logger: options.baseLogger.child({ projectId, runId, stage: "captions" }),
          });
        },
        (captions) => ({ captionsFile: captions.file }),
      );
    }

    function sceneAlreadyFailedError(sceneIndex: number): AppError {
      return new AppError({
        code: "PIPELINE_SCENE_ALREADY_FAILED",
        errorKind: "fatal",
        message: `scene ${String(sceneIndex)} previously failed its retry schedule; needs a manual retry from the UI before this run can continue`,
        context: { projectId, sceneIndex },
      });
    }

    project = await options.store.update(projectId, (p) => ({ ...p, runId, runStatus: "running" }));
    logAndEmit("info", { stage: "pipeline" }, "pipeline.run.start");

    // Per scene: image then audio, exactly like before task 006 — each scene still pipelines
    // through both steps back-to-back rather than waiting for every OTHER scene's image first
    // (an earlier draft batched all images before any audio and broke this: see
    // pipeline-resume-process-kill.test.ts, which relies on scene 0 reaching ready_for_render
    // while scene 1's own image step is still in flight). Only the one line below is new: a scene
    // that just paused at `awaiting_review` skips its audio step for THIS call, without blocking
    // any other scene's own image+audio pipelining.
    for (let sceneIndex = 0; sceneIndex < project.scenes.length; sceneIndex++) {
      const scene = requireScene(project, sceneIndex);

      if (scene.status === "ready_for_render") {
        logAndEmit("info", { stage: "pipeline", sceneIndex }, "pipeline.scene.skip_already_done");
        continue;
      }
      if (scene.status === "failed") {
        const error = sceneAlreadyFailedError(sceneIndex);
        await failRun(error);
        throw error;
      }

      try {
        await runImageStep(sceneIndex);
      } catch (error) {
        await failRun(error);
        throw error;
      }

      if (requireScene(project, sceneIndex).status === "awaiting_review") {
        continue; // task 006: paused for review, audio waits for the approve route
      }

      try {
        await runAudioStep(sceneIndex);
      } catch (error) {
        await failRun(error);
        throw error;
      }

      try {
        await runCaptionStep(sceneIndex);
      } catch (error) {
        await failRun(error);
        throw error;
      }
    }

    if (project.scenes.some((scene) => scene.status === "awaiting_review")) {
      logAndEmit("info", { stage: "pipeline" }, "pipeline.run.awaiting_review");
      project = await options.store.update(projectId, (p) => ({
        ...p,
        runStatus: "awaiting_review",
      }));
      await logWriteQueue;
      return project; // caller re-invokes run() once every scene is approved (routes/scenes.ts)
    }

    const outputLocation = path.join(options.store.projectsRoot, projectId, OUTPUT_FILE_NAME);
    logAndEmit("info", { stage: "render" }, "pipeline.render.start");
    try {
      await options.videoRenderer.render(project, outputLocation);
    } catch (error) {
      await failRun(error);
      throw error;
    }
    logAndEmit("info", { stage: "render" }, "pipeline.render.success");

    project = await options.store.update(projectId, (p) => ({
      ...p,
      runStatus: "completed",
      outputFile: OUTPUT_FILE_NAME,
    }));
    await logWriteQueue;
    return project;
  }

  return { run };
}
