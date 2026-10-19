import { createHash } from "node:crypto";
import path from "node:path";

import { resolveAspectRatio, type ImageReadiness, type ImageTask, type ImageTasksInput, type Project } from "@flow-ex/shared-schemas";

import { assetExists, imageError } from "../providers/imported/image-files.ts";
import type { ProjectStore } from "../store/project-store.ts";

function revision(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function projectImageTasks(project: Project, root: string): Promise<ImageTask[]> {
  const assets = path.join(root, project.id, "assets");
  const aspectRatio = resolveAspectRatio(project);
  const references = await Promise.all(project.references.map(async (ref): Promise<ImageTask> => {
    const expectedRevision = revision(["codex", ref.id, ref.name, ref.prompt, aspectRatio]);
    const ready = ref.image?.revision === expectedRevision && await assetExists(assets, ref.imageFile);
    return { kind: "reference", targetId: ref.id, prompt: ref.prompt, aspectRatio,
      expectedRevision, status: ready ? "ready" : "missing", referenceImages: [], blockedBy: [],
      editable: project.runStatus !== "completed" && !project.scenes.some((s) => s.referenceIds.includes(ref.id) && s.imageFile),
    };
  }));
  const scenes = await Promise.all(project.scenes.map(async (scene, sceneIndex): Promise<ImageTask> => {
    const refs = scene.referenceIds.map((id) => project.references.find((ref) => ref.id === id));
    const blockedBy = scene.referenceIds.filter((id) => !references.some((ref) => ref.targetId === id && ref.status === "ready"));
    const expectedRevision = revision(["codex", sceneIndex, scene.imagePrompt, aspectRatio,
      refs.map((ref) => [ref?.id, ref?.image?.checksum, ref?.image?.revision])]);
    const selected = scene.imageVariants.find((variant) => variant.file === scene.imageFile);
    const ready = selected?.revision === expectedRevision && await assetExists(assets, scene.imageFile);
    return { kind: "scene", targetId: String(sceneIndex), sceneIndex, prompt: scene.imagePrompt, aspectRatio,
      expectedRevision, status: blockedBy.length ? "blocked" : ready ? "ready" : "missing",
      editable: project.runStatus !== "completed" && ["pending", "awaiting_review"].includes(scene.status),
      blockedBy, referenceImages: refs.flatMap((ref) => ref?.imageFile ? [{ id: ref.id, file: path.join(assets, ref.imageFile) }] : []),
    };
  }));
  return [...references, ...scenes];
}

export async function getImageReadiness(project: Project, root: string): Promise<ImageReadiness> {
  if (project.imageSource !== "codex") return { ready: true, missingScenes: [], missingReferences: [] };
  const tasks = await projectImageTasks(project, root);
  const missingReferences = tasks.filter((task) => task.kind === "reference" && task.status !== "ready").map((task) => task.targetId);
  const missingScenes = tasks.flatMap((task) => task.kind === "scene" && task.status !== "ready" && task.sceneIndex !== undefined ? [task.sceneIndex] : []);
  return { ready: !missingReferences.length && !missingScenes.length, missingScenes, missingReferences };
}

export async function requireProjectImages(project: Project, root: string): Promise<void> {
  const readiness = await getImageReadiness(project, root);
  if (!readiness.ready) throw imageError("IMAGES_REQUIRED",
    `Import images before rendering. Missing references: ${readiness.missingReferences.join(", ") || "none"}; scenes: ${readiness.missingScenes.join(", ") || "none"}. Use get_image_tasks.`);
}

export async function getImageTasks(store: ProjectStore, input: ImageTasksInput) {
  const project = await store.read(input.projectId);
  const tasks = project.imageSource === "codex" ? await projectImageTasks(project, store.projectsRoot) : [];
  const filtered = tasks.filter((task) => (!input.kind || task.kind === input.kind) &&
    (!input.status || task.status === input.status) && (input.sceneIndex === undefined || task.sceneIndex === input.sceneIndex));
  const end = input.offset + input.limit;
  return { projectId: project.id, imageSource: project.imageSource ?? "flow", inbox: path.resolve(store.projectsRoot, project.id, "image-inbox"),
    tasks: filtered.slice(input.offset, end), total: filtered.length,
    ...(end < filtered.length ? { nextOffset: end } : {}),
  };
}
