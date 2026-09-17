import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { projectSchema, type ScriptInput } from "@flow-ex/shared-schemas";

import { buildApp } from "../app.ts";
import { createProjectStore, type ProjectStore } from "../store/project-store.ts";

const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const SCRIPT: ScriptInput = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  preset: "youtube",
  reviewEnabled: true,
  scenes: [
    { narration: "Xin chao", imagePrompt: "a sunny beach" },
    { narration: "Tam biet", imagePrompt: "a quiet evening" },
  ],
};

/**
 * EP/BVA + decision table for the review-gate routes (../../.claude/plan/task-006-review-gate.md):
 *
 * `POST /api/projects/:id/scenes/:index/approve`
 * | scene status      | variantIndex     | Expected                                       |
 * | ------------------- | ----------------- | ------------------------------------------------ |
 * | awaiting_review        | omitted            | 200, status -> generating_audio, imageFile unchanged |
 * | awaiting_review        | valid (0)            | 200, imageFile/Width/Height set from that variant |
 * | awaiting_review        | out of range (99)      | 400 SCENE_VARIANT_INVALID               |
 * | pending (not yet imaged) | omitted         | 409 SCENE_NOT_AWAITING_REVIEW                 |
 * | (index out of range)   | omitted            | 404 SCENE_NOT_FOUND                          |
 *
 * `POST /api/projects/:id/scenes/:index/regenerate`
 * | scene status      | Expected                                                     |
 * | ------------------- | --------------------------------------------------------------- |
 * | awaiting_review        | 200, imageVariants grows by 1 with a genuinely NEW file, imageFile/Width/Height updated |
 * | pending (not yet imaged) | 409 SCENE_NOT_AWAITING_REVIEW                              |
 */
describe("scene review-gate routes", () => {
  let root: string;
  let store: ProjectStore;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-scenes-routes-"));
    store = createProjectStore(root);
    app = buildApp({ store });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  async function createProjectAwaitingReview() {
    const project = await store.create(SCRIPT);
    return store.update(project.id, (p) => ({
      ...p,
      runStatus: "awaiting_review",
      scenes: p.scenes.map((scene) => ({
        ...scene,
        status: "awaiting_review" as const,
        imageFile: "images/000.png",
        imageWidth: 1376,
        imageHeight: 768,
        imageVariants: [{ file: "images/000.png", width: 1376, height: 768 }],
      })),
    }));
  }

  describe("approve", () => {
    it("advances an awaiting_review scene to generating_audio, keeping imageFile when variantIndex is omitted", async () => {
      const project = await createProjectAwaitingReview();

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = projectSchema.parse(response.json());
      expect(body.scenes[0]?.status).toBe("generating_audio");
      expect(body.scenes[0]?.imageFile).toBe("images/000.png");
    });

    it("sets imageFile/Width/Height from the chosen variantIndex", async () => {
      const project = await store.create(SCRIPT);
      await store.update(project.id, (p) => ({
        ...p,
        scenes: p.scenes.map((scene) => ({
          ...scene,
          status: "awaiting_review" as const,
          imageFile: "images/000-b.png",
          imageWidth: 1376,
          imageHeight: 768,
          imageVariants: [
            { file: "images/000-a.png", width: 1376, height: 768 },
            { file: "images/000-b.png", width: 1376, height: 768 },
          ],
        })),
      }));

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/approve`,
        payload: { variantIndex: 0 },
      });

      expect(response.statusCode).toBe(200);
      const body = projectSchema.parse(response.json());
      expect(body.scenes[0]?.imageFile).toBe("images/000-a.png");
      expect(body.scenes[0]?.status).toBe("generating_audio");
    });

    it("rejects an out-of-range variantIndex with 400 SCENE_VARIANT_INVALID", async () => {
      const project = await createProjectAwaitingReview();

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/approve`,
        payload: { variantIndex: 99 },
      });

      expect(response.statusCode).toBe(400);
      expect(errorBodySchema.parse(response.json()).error.code).toBe("SCENE_VARIANT_INVALID");
    });

    it("rejects approving a scene that is not awaiting_review with 409", async () => {
      const project = await store.create(SCRIPT); // freshly created scenes are "pending"

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(409);
      expect(errorBodySchema.parse(response.json()).error.code).toBe("SCENE_NOT_AWAITING_REVIEW");
    });

    it("returns 404 SCENE_NOT_FOUND for an out-of-range scene index", async () => {
      const project = await createProjectAwaitingReview();

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/99/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(404);
      expect(errorBodySchema.parse(response.json()).error.code).toBe("SCENE_NOT_FOUND");
    });
  });

  describe("regenerate", () => {
    it("calls the image provider again and appends a new variant, keeping the scene awaiting_review", async () => {
      const project = await createProjectAwaitingReview();

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/regenerate`,
      });

      expect(response.statusCode).toBe(200);
      const body = projectSchema.parse(response.json());
      expect(body.scenes[0]?.status).toBe("awaiting_review");
      expect(body.scenes[0]?.imageVariants).toHaveLength(2);
      const [firstVariant, secondVariant] = body.scenes[0]?.imageVariants ?? [];
      // The regenerated variant must be a GENUINELY new file, not the same path overwritten
      // (task 006 review regression: both fake and real providers used to name every image for
      // a scene identically, silently collapsing every variant onto one file on disk).
      expect(secondVariant?.file).not.toBe(firstVariant?.file);
      expect(body.scenes[0]?.imageFile).toBe(secondVariant?.file);
      await expect(
        fs.stat(path.join(root, project.id, "assets", secondVariant?.file ?? "")),
      ).resolves.toBeDefined();
    });

    it("rejects regenerating a scene that is not awaiting_review with 409", async () => {
      const project = await store.create(SCRIPT);

      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${project.id}/scenes/0/regenerate`,
      });

      expect(response.statusCode).toBe(409);
      expect(errorBodySchema.parse(response.json()).error.code).toBe("SCENE_NOT_AWAITING_REVIEW");
    });
  });
});
