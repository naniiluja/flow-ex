import path from "node:path";

import type { ImageProvider } from "../../domain/providers.ts";
import type { ProjectStore } from "../../store/project-store.ts";
import { assetExists, imageError } from "./image-files.ts";

export function createImportedImageProvider(store: ProjectStore): ImageProvider {
  return {
    async generateImage(_prompt, context) {
      const project = await store.read(context.projectId);
      const scene = project.scenes[context.sceneIndex];
      const image = scene?.imageVariants.find((variant) => variant.file === scene.imageFile);
      if (!image || !await assetExists(path.join(store.projectsRoot, project.id, "assets"), image.file)) {
        throw imageError("IMAGES_REQUIRED", "The selected scene image is missing. Import it before rendering.");
      }
      return image;
    },
    async generateReferenceImage(_prompt, _name, context) {
      const project = await store.read(context.projectId);
      const image = project.references.find((ref) => ref.id === context.referenceId)?.image;
      if (!image || !await assetExists(path.join(store.projectsRoot, project.id, "assets"), image.file)) {
        throw imageError("REFERENCE_IMAGES_REQUIRED", "Import the reference image before rendering.");
      }
      return image;
    },
  };
}
