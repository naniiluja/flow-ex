import path from "node:path";

import type { Logger } from "pino";

import type { ImageProvider } from "../domain/providers.ts";
import { createImportedImageProvider } from "../providers/imported/imported-image-provider.ts";
import { resolveTtsOptionsForProject, selectTranscriptionProvider, selectTtsProvider, type VbeeCredentials, type WhisperOptions } from "../providers/select-providers.ts";
import { createRemotionVideoRenderer } from "../render/create-remotion-video-renderer.ts";
import type { ProjectStore } from "../store/project-store.ts";
import { requireProjectImages } from "./image-tasks.ts";
import { createPipelineEngine } from "./pipeline-engine.ts";
import type { PipelineEventBus } from "./pipeline-events.ts";
import { requireInactive, withProjectOperation } from "./project-operations.ts";

export interface StartProjectRunDeps {
  store: ProjectStore;
  baseLogger: Logger;
  eventBus: PipelineEventBus;
  activeRuns: Set<string>;
  getImageProvider: (projectId: string) => ImageProvider;
  getBaseUrl: () => string;
  vbeeCredentials?: VbeeCredentials;
  transcriptionMode?: "fake" | "whisper";
  whisperOptions?: WhisperOptions;
  imageConcurrency?: number;
  audioConcurrency?: number;
}

export async function startProjectRun(deps: StartProjectRunDeps, projectId: string) {
  return withProjectOperation(deps.store, projectId, async () => {
    const project = await deps.store.read(projectId);
    requireInactive(deps.activeRuns, projectId);
    await requireProjectImages(project, deps.store.projectsRoot);
    const baseUrl = deps.getBaseUrl();
    const assetsDir = path.join(deps.store.projectsRoot, projectId, "assets");
    const engine = createPipelineEngine({
      store: deps.store,
      imageProvider: project.imageSource === "codex" ? createImportedImageProvider(deps.store) : deps.getImageProvider(projectId),
      ttsProvider: selectTtsProvider(deps.vbeeCredentials, assetsDir, deps.baseLogger, resolveTtsOptionsForProject(project.preset, project.tts)),
      transcriptionProvider: selectTranscriptionProvider(deps.transcriptionMode, deps.whisperOptions, assetsDir, deps.baseLogger),
      videoRenderer: createRemotionVideoRenderer({ projectsRoot: deps.store.projectsRoot, buildAssetUrl: (id, file) => `${baseUrl}/api/projects/${id}/assets/${file}` }),
      baseLogger: deps.baseLogger, eventBus: deps.eventBus, imageConcurrency: deps.imageConcurrency, audioConcurrency: deps.audioConcurrency,
    });
    deps.activeRuns.add(projectId);
    engine.run(projectId).catch((error: unknown) => {
      deps.baseLogger.error({ err: error, projectId }, "pipeline.run.unhandled_rejection");
    }).finally(() => {
      deps.activeRuns.delete(projectId);
      deps.eventBus.emit(projectId, { type: "asset", projectId });
    });
    return { status: "started" as const };
  });
}
