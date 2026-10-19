import type { Logger } from "pino";

import { resolveAspectRatio, type Project, type ProjectScene } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import type { ImageProvider } from "../domain/providers.ts";
import type { ProjectStore } from "../store/project-store.ts";
import { toSceneError } from "./pipeline-engine.ts";
import { advanceScene } from "./scene-state-machine.ts";
import { requireInactive, withProjectOperation } from "./project-operations.ts";
import { imageError } from "../providers/imported/image-files.ts";

/**
 * Task 006's review-gate business logic, kept in the pipeline layer rather than the route
 * handler (../.claude/rules/backend-conventions.md's "thin handlers, logic in service/pipeline";
 * ../.claude/rules/architecture.md's `routes -> pipeline/services -> domain <- providers`
 * dependency direction). `be/src/routes/scenes.ts` calls these two functions and nothing else.
 */

export function requireScene(project: Project, index: number): ProjectScene {
  const scene = project.scenes[index];
  if (scene === undefined) {
    throw new AppError({
      code: "SCENE_NOT_FOUND",
      errorKind: "fatal",
      message: `scene ${String(index)} does not exist on project ${project.id}`,
      context: { projectId: project.id, sceneIndex: index },
    });
  }
  return scene;
}

export function requireAwaitingReview(project: Project, index: number): ProjectScene {
  const scene = requireScene(project, index);
  if (scene.status !== "awaiting_review") {
    throw new AppError({
      code: "SCENE_NOT_AWAITING_REVIEW",
      errorKind: "needs_user",
      message: `scene ${String(index)} is "${scene.status}", not "awaiting_review"`,
      context: { projectId: project.id, sceneIndex: index, status: scene.status },
    });
  }
  return scene;
}

/** Approves `sceneIndex`: picks the given variant (or keeps whatever `imageFile` already points
 * at, when `variantIndex` is omitted — the most recent variant, since every regenerate overwrites
 * it too) and advances the scene to `generating_audio`. */
export async function approveSceneReview(
  store: ProjectStore,
  projectId: string,
  sceneIndex: number,
  variantIndex: number | undefined,
  activeRuns: Set<string> = new Set<string>(),
): Promise<Project> {
  return withProjectOperation(store, projectId, async () => {
    requireInactive(activeRuns, projectId);
    return store.update(projectId, (project) => {
    const scene = requireAwaitingReview(project, sceneIndex);
    let patch: Partial<ProjectScene> = {};
    if (variantIndex !== undefined) {
      const variant = scene.imageVariants[variantIndex];
      if (variant === undefined) {
        throw new AppError({
          code: "SCENE_VARIANT_INVALID",
          errorKind: "fatal",
          message: `scene ${String(sceneIndex)} has no variant at index ${String(variantIndex)}`,
          context: { projectId, sceneIndex, variantIndex },
        });
      }
      patch = { imageFile: variant.file, imageWidth: variant.width, imageHeight: variant.height };
    }

    const scenes = [...project.scenes];
    scenes[sceneIndex] = {
      ...scene,
      ...patch,
      status: advanceScene(scene.status, "scene_approved"),
    };
    return { ...project, scenes };
    });
  });
}

/** Regenerates `sceneIndex`'s image by calling `imageProvider.generateImage` again for the SAME
 * prompt, appending the result as a new variant (../.claude/rules/logging.md's cross-boundary
 * entry/exit logging). Does not go through `retryWithSchedule` on purpose: the user is
 * interactively waiting on this one call, so a transient failure surfaces immediately for them to
 * retry by clicking again, rather than silently retrying for minutes behind a still-loading
 * button (../../be/.claude/rules/flow-automation.md's "Provider design" documents this alongside
 * the automatic pipeline's own retry schedule). Never touches the scene's `status` — it is
 * already `awaiting_review` and stays there. */
export async function regenerateSceneReview(
  store: ProjectStore,
  imageProvider: ImageProvider,
  baseLogger: Logger,
  projectId: string,
  sceneIndex: number,
): Promise<Project> {
  const project = await store.read(projectId);
  if (project.imageSource === "codex") {
    throw imageError("EXTERNAL_IMAGE_GENERATION_REQUIRED", "Create a new image with Codex ImageGen, then call import_scene_image with the revision from get_image_tasks.");
  }
  const scene = requireAwaitingReview(project, sceneIndex);
  const logger = baseLogger.child({
    projectId,
    runId: project.runId,
    sceneIndex,
    stage: "image",
  });

  logger.info({}, "flow.image.regenerate");
  let image: { file: string; width: number; height: number };
  try {
    image = await imageProvider.generateImage(scene.imagePrompt, {
      projectId,
      sceneIndex,
      aspectRatio: resolveAspectRatio(project),
      logger,
    });
  } catch (error) {
    logger.error({ err: toSceneError(error) }, "flow.image.regenerate.error");
    throw error;
  }
  logger.info({}, "flow.image.regenerate.success");

  return store.update(projectId, (p) => {
    const current = requireAwaitingReview(p, sceneIndex);
    const scenes = [...p.scenes];
    scenes[sceneIndex] = {
      ...current,
      imageFile: image.file,
      imageWidth: image.width,
      imageHeight: image.height,
      imageVariants: [...current.imageVariants, image],
    };
    return { ...p, scenes };
  });
}
