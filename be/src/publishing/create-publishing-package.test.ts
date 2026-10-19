import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { projectSchema } from "@flow-ex/shared-schemas";

import { makeSolidColorPng } from "../providers/fake/synthetic-media.ts";
import { createPublishingPackage } from "./create-publishing-package.ts";

describe("createPublishingPackage", () => {
  let root: string;

  afterEach(async () => {
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it("creates fallback metadata and a real thumbnail from the selected scene", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-publishing-"));
    const project = projectSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      schemaVersion: 3,
      createdAt: new Date().toISOString(),
      title: "Bi an D4C",
      voice: "test",
      preset: "tiktok",
      aspectRatio: "9:16",
      reviewEnabled: false,
      references: [],
      runStatus: "running",
      scenes: [
        {
          narration:
            "D4C mo ra nhung the gioi song song. Love Train chuyen bat hanh sang nguoi khac.",
          imagePrompt: "D4C",
          referenceIds: [],
          status: "ready_for_render",
          attempts: 1,
          imageFile: "images/000.png",
          imageVariants: [],
        },
      ],
    });
    const assetsRoot = path.join(root, project.id, "assets");
    await fs.mkdir(path.join(assetsRoot, "images"), { recursive: true });
    await fs.writeFile(
      path.join(assetsRoot, "images/000.png"),
      makeSolidColorPng(320, 180, { r: 10, g: 20, b: 40 }),
    );

    const result = await createPublishingPackage(project, root);

    expect(result.title).toBe("Bi an D4C");
    expect(result.description).toContain("Love Train");
    expect(result.thumbnailFile).toBe("publishing/thumbnail.jpg");
    const metadata = await sharp(path.join(assetsRoot, result.thumbnailFile)).metadata();
    expect(metadata).toMatchObject({ format: "jpeg", width: 1280, height: 720 });
  });

  it("preserves authored publishing copy and selected scene", async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-publishing-"));
    const project = projectSchema.parse({
      id: "22222222-2222-4222-8222-222222222222",
      schemaVersion: 3,
      createdAt: new Date().toISOString(),
      title: "Internal",
      voice: "test",
      preset: "youtube",
      aspectRatio: "16:9",
      reviewEnabled: false,
      references: [],
      runStatus: "running",
      publishing: {
        title: "Public title",
        description: "Public description",
        thumbnailSceneIndex: 1,
      },
      scenes: [0, 1].map((index) => ({
        narration: `Scene ${String(index)}`,
        imagePrompt: "x",
        referenceIds: [],
        status: "ready_for_render",
        attempts: 1,
        imageFile: `images/00${String(index)}.png`,
        imageVariants: [],
      })),
    });
    const assetsRoot = path.join(root, project.id, "assets");
    await fs.mkdir(path.join(assetsRoot, "images"), { recursive: true });
    await fs.writeFile(
      path.join(assetsRoot, "images/000.png"),
      makeSolidColorPng(32, 18, { r: 255, g: 0, b: 0 }),
    );
    await fs.writeFile(
      path.join(assetsRoot, "images/001.png"),
      makeSolidColorPng(32, 18, { r: 0, g: 0, b: 255 }),
    );

    const result = await createPublishingPackage(project, root);

    expect(result).toMatchObject({
      title: "Public title",
      description: "Public description",
      thumbnailSceneIndex: 1,
    });
  });
});
