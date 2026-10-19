import path from "node:path";

import type { ImageVariant } from "@flow-ex/shared-schemas";

import { imageError, persistImage, readStagedImage } from "../providers/imported/image-files.ts";
import type { ProjectStore } from "../store/project-store.ts";
import { projectImageTasks } from "./image-tasks.ts";
import type { PipelineEventBus } from "./pipeline-events.ts";
import { requireInactive, withProjectOperation } from "./project-operations.ts";

export interface ImportImageDeps {
  store: ProjectStore;
  activeRuns: Set<string>;
  eventBus: PipelineEventBus;
}
export interface ImportImageInput {
  projectId: string;
  stagedFile: string;
  expectedRevision: string;
  target: { kind: "scene"; sceneIndex: number } | { kind: "reference"; referenceId: string };
}

export async function importImage(deps: ImportImageDeps, input: ImportImageInput) {
  return withProjectOperation(deps.store, input.projectId, async () => {
    requireInactive(deps.activeRuns, input.projectId);
    const project = await deps.store.read(input.projectId);
    if (project.imageSource !== "codex") throw imageError("IMAGE_SOURCE_INVALID", "This project uses Google Flow. Create a Codex image project first.");
    const { target } = input;
    const targetId = target.kind === "scene" ? String(target.sceneIndex) : target.referenceId;
    const task = (await projectImageTasks(project, deps.store.projectsRoot)).find((t) => t.kind === target.kind && t.targetId === targetId);
    if (!task) throw imageError("IMAGE_TARGET_NOT_FOUND", "The image target does not exist in this project.");
    if (task.expectedRevision !== input.expectedRevision) throw imageError("IMAGE_REVISION_STALE", "Get image tasks again: the prompt or references changed.");
    if (task.blockedBy.length) throw imageError("REFERENCE_IMAGES_REQUIRED", `Import references first: ${task.blockedBy.join(", ")}`);
    const image = await readStagedImage(path.join(deps.store.projectsRoot, project.id, "image-inbox"), input.stagedFile);
    const existing = target.kind === "scene"
      ? project.scenes[target.sceneIndex]?.imageVariants.find((v) => v.checksum === image.checksum && v.revision === task.expectedRevision)
      : project.references.find((r) => r.id === target.referenceId)?.image;
    // Idempotent retries remain valid after approval, without changing the selected variant.
    const duplicate = existing?.checksum === image.checksum && existing.revision === task.expectedRevision;
    if (!duplicate && !task.editable) throw imageError("IMAGE_TARGET_LOCKED", "This image has already been approved or used. Create a new project to replace it.");
    const file = `${target.kind === "scene" ? "images" : "references"}/${image.checksum}-${task.expectedRevision}.${image.extension}`;
    await persistImage(path.join(deps.store.projectsRoot, project.id, "assets"), file, image.bytes);
    if (duplicate) return project;
    const variant: ImageVariant = { file, width: image.width, height: image.height, source: "codex", checksum: image.checksum, revision: task.expectedRevision };
    const updated = await deps.store.update(project.id, (current) => {
      if (target.kind === "reference") return { ...current, references: current.references.map((ref) =>
        ref.id === target.referenceId ? { ...ref, imageFile: file, image: variant } : ref) };
      return { ...current, scenes: current.scenes.map((scene, index) => index === target.sceneIndex ? {
        ...scene, imageFile: file, imageWidth: image.width, imageHeight: image.height,
        imageVariants: [...scene.imageVariants, variant],
      } : scene) };
    });
    deps.eventBus.emit(project.id, { type: "asset", projectId: project.id });
    return updated;
  });
}
