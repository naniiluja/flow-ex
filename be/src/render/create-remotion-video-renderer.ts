import fs from "node:fs/promises";
import path from "node:path";

import { captionsFileSchema, resolveAspectRatio, type Project } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import type { VideoRenderer } from "../domain/providers.ts";
import { renderVideo } from "./render-video.ts";

const DEFAULT_IMAGE_WIDTH = 1920;
const DEFAULT_IMAGE_HEIGHT = 1080;

export interface RemotionVideoRendererOptions {
  buildAssetUrl: (projectId: string, relativeAssetPath: string) => string;
  /** The on-disk root every project folder lives under (`ProjectStore.projectsRoot`) — needed
   * ONLY to read a scene's captions JSON directly off disk (task 007), since caption data is
   * baked into `MainCompositionProps` up front rather than fetched by the composition itself at
   * render time (`video/`'s own "no IO" rule means it can never fetch this on its own). */
  projectsRoot: string;
}

/** The only module that imports task 002's `renderVideo` for pipeline use (see
 * `VideoRenderer`'s own doc comment for why that isolation matters). */
export function createRemotionVideoRenderer(options: RemotionVideoRendererOptions): VideoRenderer {
  return {
    async render(project: Project, outputLocation: string): Promise<void> {
      const scenes = await Promise.all(
        project.scenes.map(async (scene) => {
          if (scene.imageFile === undefined || scene.audioFile === undefined) {
            throw new Error(
              `create-remotion-video-renderer: scene missing imageFile/audioFile at render time (project ${project.id})`,
            );
          }

          let captions;
          if (scene.captionsFile !== undefined) {
            const captionsPath = path.join(
              options.projectsRoot,
              project.id,
              "assets",
              scene.captionsFile,
            );
            let raw: unknown;
            try {
              raw = JSON.parse(await fs.readFile(captionsPath, "utf8"));
            } catch (cause) {
              throw new AppError({
                code: "RENDER_CAPTIONS_UNREADABLE",
                errorKind: "fatal",
                message: "Could not read a scene's captions file at render time",
                cause,
                context: { projectId: project.id, captionsFile: scene.captionsFile },
              });
            }
            const parsed = captionsFileSchema.safeParse(raw);
            if (!parsed.success) {
              throw new AppError({
                code: "RENDER_CAPTIONS_INVALID",
                errorKind: "fatal",
                message: "A scene's captions file does not match the expected shape",
                cause: parsed.error,
                context: { projectId: project.id, captionsFile: scene.captionsFile },
              });
            }
            captions = parsed.data;
          }

          return {
            imageUrl: options.buildAssetUrl(project.id, scene.imageFile),
            imageWidth: scene.imageWidth ?? DEFAULT_IMAGE_WIDTH,
            imageHeight: scene.imageHeight ?? DEFAULT_IMAGE_HEIGHT,
            audioUrl: options.buildAssetUrl(project.id, scene.audioFile),
            durationMs: scene.audioDurationMs ?? 0,
            captions,
          };
        }),
      );

      await renderVideo({
        aspectRatio: resolveAspectRatio(project),
        preset: project.preset,
        outputLocation,
        scenes,
      });
    },
  };
}
