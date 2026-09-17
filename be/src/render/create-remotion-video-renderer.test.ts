import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CURRENT_SCHEMA_VERSION, type Project } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import { createRemotionVideoRenderer } from "./create-remotion-video-renderer.ts";

function baseProject(captionsFile: string | undefined): Project {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "t",
    voice: "v",
    aspectRatio: "16:9",
    preset: "youtube",
    reviewEnabled: false,
    references: [],
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: "2026-01-01T00:00:00.000Z",
    runStatus: "running",
    scenes: [
      {
        narration: "Xin chao",
        imagePrompt: "a sunny beach",
        referenceIds: [],
        status: "transcribing",
        attempts: 1,
        imageVariants: [],
        imageFile: "images/000.png",
        imageWidth: 1920,
        imageHeight: 1080,
        audioFile: "audio/000.wav",
        audioDurationMs: 1500,
        captionsFile,
      },
    ],
  };
}

/**
 * EP/BVA matrix for `createRemotionVideoRenderer(options).render(project, outputLocation)`'s
 * captions-reading step (task 007) — only the READ+VALIDATE path is exercised here; the
 * happy-path handoff into a real `renderVideo` call is already covered end to end by
 * `../routes/render.test.ts`'s e2e test.
 *
 * | scene.captionsFile         | file on disk               | Expected                              |
 * | ----------------------------- | ----------------------------- | ---------------------------------------- |
 * | undefined                       | n/a                              | never reads any captions file            |
 * | "captions/000.json"                | missing                           | throws AppError RENDER_CAPTIONS_UNREADABLE |
 * | "captions/000.json"                  | present but malformed shape         | throws AppError RENDER_CAPTIONS_INVALID  |
 *
 * The `undefined` row is proved end to end by `../routes/render.test.ts`'s e2e test (every scene
 * there DOES have a `captionsFile` via `FakeTranscriptionProvider`, but a render only ever
 * succeeds because the `undefined` branch never THROWS, which is the only thing this row could
 * assert) rather than here, since a genuine "no captionsFile" case falls through to a real
 * `renderVideo` call — this file only isolates the read+validate step BEFORE that call.
 */
describe("createRemotionVideoRenderer captions handling", () => {
  let projectsRoot: string;

  beforeEach(async () => {
    projectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-remotion-renderer-"));
  });

  afterEach(async () => {
    await fs.rm(projectsRoot, { recursive: true, force: true });
  });

  it("throws RENDER_CAPTIONS_UNREADABLE when captionsFile does not exist on disk", async () => {
    const renderer = createRemotionVideoRenderer({
      buildAssetUrl: (id, p) => `http://x/${id}/${p}`,
      projectsRoot,
    });

    await expect(
      renderer.render(baseProject("captions/000.json"), path.join(projectsRoot, "out.mp4")),
    ).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.code === "RENDER_CAPTIONS_UNREADABLE",
    );
  });

  it("throws RENDER_CAPTIONS_INVALID when the captions file does not match the expected shape", async () => {
    const project = baseProject("captions/000.json");
    const captionsPath = path.join(projectsRoot, project.id, "assets", "captions", "000.json");
    await fs.mkdir(path.dirname(captionsPath), { recursive: true });
    await fs.writeFile(captionsPath, JSON.stringify([{ text: "oops" }])); // missing required fields

    const renderer = createRemotionVideoRenderer({
      buildAssetUrl: (id, p) => `http://x/${id}/${p}`,
      projectsRoot,
    });

    await expect(renderer.render(project, path.join(projectsRoot, "out.mp4"))).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.code === "RENDER_CAPTIONS_INVALID",
    );
  });
});
