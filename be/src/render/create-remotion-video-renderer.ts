import type { Project } from "@flow-ex/shared-schemas";

import type { VideoRenderer } from "../domain/providers.ts";
import { renderVideo } from "./render-video.ts";

const DEFAULT_IMAGE_WIDTH = 1920;
const DEFAULT_IMAGE_HEIGHT = 1080;

export interface RemotionVideoRendererOptions {
  buildAssetUrl: (projectId: string, relativeAssetPath: string) => string;
}

/** The only module that imports task 002's `renderVideo` for pipeline use (see
 * `VideoRenderer`'s own doc comment for why that isolation matters). */
export function createRemotionVideoRenderer(options: RemotionVideoRendererOptions): VideoRenderer {
  return {
    async render(project: Project, outputLocation: string): Promise<void> {
      await renderVideo({
        aspectRatio: project.aspectRatio,
        outputLocation,
        scenes: project.scenes.map((scene) => {
          if (scene.imageFile === undefined || scene.audioFile === undefined) {
            throw new Error(
              `create-remotion-video-renderer: scene missing imageFile/audioFile at render time (project ${project.id})`,
            );
          }
          return {
            imageUrl: options.buildAssetUrl(project.id, scene.imageFile),
            imageWidth: scene.imageWidth ?? DEFAULT_IMAGE_WIDTH,
            imageHeight: scene.imageHeight ?? DEFAULT_IMAGE_HEIGHT,
            audioUrl: options.buildAssetUrl(project.id, scene.audioFile),
            durationMs: scene.audioDurationMs ?? 0,
          };
        }),
      });
    },
  };
}
