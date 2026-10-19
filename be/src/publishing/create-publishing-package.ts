import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { type Project, type PublishingPackage } from "@flow-ex/shared-schemas";

const THUMBNAIL_FILE = "publishing/thumbnail.jpg";
const MAX_DESCRIPTION_LENGTH = 420;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapTitle(title: string, maxCharacters: number): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= maxCharacters) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else if (lines.length < 3) {
      lines.push(word);
    } else {
      lines[2] = `${lines[2] ?? ""}…`;
      break;
    }
  }
  return lines;
}

function fallbackDescription(project: Project): string {
  const narration = project.scenes.map((scene) => scene.narration.trim()).join(" ");
  if (narration.length <= MAX_DESCRIPTION_LENGTH) return narration;
  const shortened = narration.slice(0, MAX_DESCRIPTION_LENGTH + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > 0 ? boundary : MAX_DESCRIPTION_LENGTH).trim()}…`;
}

export async function createPublishingPackage(
  project: Project,
  projectsRoot: string,
): Promise<PublishingPackage> {
  const title = project.publishing?.title ?? project.title;
  const description = project.publishing?.description ?? fallbackDescription(project);
  const requestedIndex = project.publishing?.thumbnailSceneIndex ?? 0;
  const thumbnailSceneIndex = Math.min(requestedIndex, project.scenes.length - 1);
  const scene = project.scenes[thumbnailSceneIndex];
  if (scene?.imageFile === undefined) {
    throw new Error(`publishing-package: scene ${String(thumbnailSceneIndex)} has no image`);
  }

  // Publishing thumbnails target YouTube's standard 16:9 canvas even when the rendered video
  // itself is a vertical Short. Keeping this artifact independent from the composition ratio
  // makes it immediately reusable for the video's YouTube listing.
  const width = 1280;
  const height = 720;
  const fontSize = 58;
  const lineHeight = Math.round(fontSize * 1.18);
  const lines = wrapTitle(title, 32);
  const textY = height - 90 - (lines.length - 1) * lineHeight;
  const text = lines
    .map(
      (line, index) =>
        `<text x="${String(Math.round(width * 0.07))}" y="${String(textY + index * lineHeight)}" fill="white" font-family="Arial, sans-serif" font-size="${String(fontSize)}" font-weight="800">${escapeXml(line)}</text>`,
    )
    .join("");
  const overlay = Buffer.from(
    `<svg width="${String(width)}" height="${String(height)}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="45%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.88"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${text}</svg>`,
  );

  const assetsRoot = path.join(projectsRoot, project.id, "assets");
  const destination = path.join(assetsRoot, THUMBNAIL_FILE);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await sharp(path.join(assetsRoot, scene.imageFile))
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .composite([{ input: overlay }])
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toFile(destination);

  return { title, description, thumbnailSceneIndex, thumbnailFile: THUMBNAIL_FILE };
}
