import { randomUUID } from "node:crypto";
import path from "node:path";

import PQueue from "p-queue";
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
const DEFAULT_IMAGE_CONCURRENCY = 3;
// Task 014: after this many CONSECUTIVE image-step failures (across any scenes, reset on any
// success), the queue's concurrency is lowered to 1 for the rest of the run — a Flow page that's
// failing repeatedly under concurrent load (rate limiting, a UI state the concurrent submits
// pushed it into) is more likely to recover single-threaded than to keep failing faster.
const CONSECUTIVE_FAILURES_BEFORE_LOWERING_CONCURRENCY = 2;

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
  /** Task 014: how many scenes' image steps may run concurrently against the shared Flow page.
   * Default 3 (`env.ts`'s `FLOW_IMAGE_CONCURRENCY`); the engine itself lowers this toward 1 at
   * runtime on repeated consecutive failures (see `CONSECUTIVE_FAILURES_BEFORE_LOWERING_CONCURRENCY`). */
  imageConcurrency?: number;
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
     * which differ only in the 4 arguments below.
     *
     * **Task 014 concurrency note:** every read used to decide what to persist or emit comes from
     * INSIDE the `store.update` callback (`p`/`current`) or from that call's own LOCAL return
     * value — never from the shared outer `project` variable, which another scene's task running
     * concurrently can reassign at any `await` boundary. `project` is still updated as a
     * best-effort convenience for code outside any concurrent phase, but nothing in this function
     * trusts it for correctness. */
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
        const updated = await options.store.update(projectId, (p) => {
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
        project = updated;
        logAndEmit(
          "info",
          { stage, sceneIndex, attempt: attempts },
          `pipeline.scene.${stage}.success`,
        );
        emitSceneStatus(requireScene(updated, sceneIndex), sceneIndex);
      } catch (error) {
        const updated = await options.store.update(projectId, (p) => {
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
        project = updated;
        logAndEmit(
          "error",
          { stage, sceneIndex, attempt: attempts, err: toSceneError(error) },
          `pipeline.scene.${stage}.error`,
        );
        emitSceneStatus(requireScene(updated, sceneIndex), sceneIndex);
        throw error;
      }
    }

    /** Task 014: this step now runs CONCURRENTLY across scenes (see the image phase in `run()`
     * below), so every read here is either fresh from the store or the LOCAL return value of this
     * task's own `store.update` call — never the shared outer `project` variable, which a
     * DIFFERENT scene's concurrently-running task can reassign between any two `await`s in this
     * function. */
    async function runImageStep(sceneIndex: number): Promise<void> {
      const beforeTransition = await options.store.update(projectId, (p) => {
        const scenes = [...p.scenes];
        const current = requireScene(p, sceneIndex);
        if (current.status === "pending") {
          scenes[sceneIndex] = { ...current, status: advanceScene(current.status, "begin_image") };
        }
        return { ...p, scenes };
      });
      project = beforeTransition;
      const scene = requireScene(beforeTransition, sceneIndex);
      if (scene.status !== "generating_image") {
        return; // resumed past this step already (awaiting_review/generating_audio/ready_for_render)
      }
      emitSceneStatus(scene, sceneIndex);

      await executeStep(
        sceneIndex,
        "image",
        {
          // Task 006: pause at `awaiting_review` instead of jumping straight to
          // `generating_audio` when the project's "Dừng để duyệt" switch is on
          // (be/.claude/rules/flow-automation.md). Read from THIS call's own fresh snapshot, not
          // the shared outer `project`, since `reviewEnabled` is project-wide and stable, but the
          // rule (debugging.md) is "never read the outer var" without exception.
          success: beforeTransition.reviewEnabled ? "image_needs_review" : "image_succeeded",
          failure: "image_failed",
        },
        () =>
          options.imageProvider.generateImage(scene.imagePrompt, {
            projectId,
            sceneIndex,
            // Task 014: read from THIS call's own fresh `beforeTransition` snapshot, never the
            // shared outer `project` var, which a concurrently-running scene's own step can
            // reassign between two `await`s (debugging.md's rule, same reasoning as
            // `reviewEnabled` above). `resolveAspectRatio` (task 009) still applies the
            // explicit-aspectRatio-wins-over-preset rule on top of that snapshot.
            aspectRatio: resolveAspectRatio(beforeTransition),
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
      const fresh = await options.store.read(projectId);
      const scene = requireScene(fresh, sceneIndex);
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
            voice: fresh.voice,
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

    const sceneIndices = project.scenes.map((_, index) => index);

    for (const sceneIndex of sceneIndices) {
      const scene = requireScene(project, sceneIndex);
      if (scene.status === "ready_for_render") {
        logAndEmit("info", { stage: "pipeline", sceneIndex }, "pipeline.scene.skip_already_done");
      }
      if (scene.status === "failed") {
        // Matches the pre-014 behavior: a scene left `failed` from an exhausted retry schedule
        // (or a `needs_user` error) blocks the WHOLE run until a manual retry from the UI
        // (../../.claude/rules/error-handling.md's known gap) — checked up front, before any
        // image work starts, since task 014 no longer processes scenes strictly one at a time.
        const error = sceneAlreadyFailedError(sceneIndex);
        await failRun(error);
        throw error;
      }
    }

    // --- Phase 1: image generation, CONCURRENTLY across scenes (task 014) ---------------------
    // Runs against the ONE shared Flow page (`../.claude/rules/flow-automation.md`'s connection
    // reuse); `FlowImageProvider`'s own `SubmitMutex` (`submit-mutex.ts`) serializes only the
    // shared-page-mutation part of each submission, so the ~25-30s decode wait overlaps for real.
    // One scene's image failure does NOT abort the others: every OTHER already-queued scene still
    // runs to completion, matching the "một job lỗi giữa chừng -> job khác vẫn hoàn thành" AC —
    // the run is only marked failed (and thrown) once every scene's image attempt has settled.
    const imageConcurrency = options.imageConcurrency ?? DEFAULT_IMAGE_CONCURRENCY;
    const imageQueue = new PQueue({ concurrency: imageConcurrency });
    let consecutiveImageFailures = 0;
    let firstImageError: unknown;

    const imageSceneIndices = sceneIndices.filter((sceneIndex) => {
      const status = requireScene(project, sceneIndex).status;
      return status === "pending" || status === "generating_image";
    });

    await Promise.all(
      imageSceneIndices.map((sceneIndex) =>
        imageQueue.add(async () => {
          if (options.signal?.aborted) {
            return;
          }
          try {
            await runImageStep(sceneIndex);
            consecutiveImageFailures = 0;
          } catch (error) {
            consecutiveImageFailures += 1;
            firstImageError ??= error;
            if (consecutiveImageFailures >= CONSECUTIVE_FAILURES_BEFORE_LOWERING_CONCURRENCY) {
              logAndEmit(
                "warn",
                { stage: "image" },
                "pipeline.image_concurrency.lowered_to_1_after_consecutive_failures",
              );
              imageQueue.concurrency = 1;
            }
          }
        }),
      ),
    );

    if (firstImageError !== undefined) {
      await failRun(firstImageError);
      // `firstImageError` is `unknown` by construction (caught from an arbitrary provider); most
      // real callers throw an `AppError`/`Error` (also what `toSceneError` already assumes
      // elsewhere in this file), but the lint rule requires a proven `Error` at the throw site.
      throw firstImageError instanceof Error
        ? firstImageError
        : new Error(toSceneError(firstImageError).message);
    }

    // --- Phase 2: audio + captions, sequentially per scene (Vbee is not a real bottleneck, task
    // 014's own scope decision) — reads FRESH from the store per scene rather than the shared
    // outer `project`, which the just-finished concurrent image phase may have reassigned out of
    // this scene's own order.
    for (const sceneIndex of sceneIndices) {
      const scene = requireScene(await options.store.read(projectId), sceneIndex);
      if (scene.status === "ready_for_render" || scene.status === "awaiting_review") {
        continue; // already done, or paused for review (task 006: audio waits for the approve route)
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

    project = await options.store.read(projectId);
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
