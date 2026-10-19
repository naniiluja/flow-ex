import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scriptInputSchema, type Project } from "@flow-ex/shared-schemas";

import { makeSolidColorPng } from "../providers/fake/synthetic-media.ts";
import { createProjectStore } from "../store/project-store.ts";
import { getImageReadiness, projectImageTasks } from "./image-tasks.ts";
import { importImage, type ImportImageDeps } from "./import-image.ts";
import { createPipelineEventBus } from "./pipeline-events.ts";
import { approveSceneReview } from "./scene-review.ts";

describe("image import contract", () => {
  let root: string;
  let deps: ImportImageDeps;
  let project: Project;
  let inbox: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "import-image-"));
    deps = { store: createProjectStore(root), activeRuns: new Set(), eventBus: createPipelineEventBus() };
    project = await deps.store.create(scriptInputSchema.parse({ title: "Images", voice: "test", preset: "tiktok", imageSource: "codex",
      scenes: [{ narration: "hello", imagePrompt: "fox" }] }));
    inbox = path.join(root, project.id, "image-inbox");
    await fs.writeFile(path.join(inbox, "one.png"), makeSolidColorPng(64, 48, { r: 200, g: 100, b: 30 }));
    await fs.writeFile(path.join(inbox, "two.png"), makeSolidColorPng(48, 64, { r: 10, g: 150, b: 80 }));
  });
  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  async function request(stagedFile = "one.png") {
    const current = await deps.store.read(project.id);
    const task = (await projectImageTasks(current, root)).find((task) => task.kind === "scene");
    if (!task) throw new Error("Missing task");
    return { projectId: project.id, stagedFile, expectedRevision: task.expectedRevision, target: { kind: "scene" as const, sceneIndex: 0 } };
  }

  it("stores actual dimensions, persists variants, emits an event and deduplicates concurrent retries", async () => {
    const notify = vi.fn(); deps.eventBus.subscribe(project.id, notify);
    const input = await request();
    await Promise.all([importImage(deps, input), importImage(deps, input)]);
    const reloaded = await createProjectStore(root).read(project.id);
    expect(reloaded.scenes[0]).toMatchObject({ status: "pending", imageWidth: 64, imageHeight: 48 });
    expect(reloaded.scenes[0]?.imageVariants).toHaveLength(1);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(await getImageReadiness(reloaded, root)).toMatchObject({ ready: true });
  });

  it("adds a review variant, selects it, and does not change selection on retry of an old variant", async () => {
    await importImage(deps, await request());
    await deps.store.update(project.id, (p) => ({ ...p, runStatus: "awaiting_review", scenes: p.scenes.map((s) => ({ ...s, status: "awaiting_review" })) }));
    const updated = await importImage(deps, await request("two.png"));
    expect(updated.scenes[0]?.imageVariants).toHaveLength(2);
    const retried = await importImage(deps, await request());
    expect(retried.scenes[0]?.imageFile).toBe(updated.scenes[0]?.imageFile);
    const approved = await approveSceneReview(deps.store, project.id, 0, 0, deps.activeRuns);
    expect(approved.scenes[0]?.imageWidth).toBe(64);
    await fs.writeFile(path.join(inbox, "three.png"), makeSolidColorPng(32, 32, { r: 0, g: 0, b: 200 }));
    await expect(importImage(deps, await request("three.png"))).rejects.toMatchObject({ code: "IMAGE_TARGET_LOCKED" });
  });

  it.each(["../one.png", "/etc/passwd"])("rejects an escaped path %s", async (file) => {
    await expect(importImage(deps, await request(file))).rejects.toMatchObject({ code: "IMAGE_PATH_INVALID" });
  });

  it("rejects symlinks outside the inbox", async () => {
    await fs.writeFile(path.join(root, "outside.png"), makeSolidColorPng(8, 8, { r: 0, g: 0, b: 0 }));
    await fs.symlink(path.join(root, "outside.png"), path.join(inbox, "escape.png"));
    await expect(importImage(deps, await request("escape.png"))).rejects.toMatchObject({ code: "IMAGE_PATH_INVALID" });
  });

  it.each(["missing.png", "bad.png", "large.png", "vector.svg", "animated.png"])("rejects invalid input %s", async (file) => {
    await fs.writeFile(path.join(inbox, "bad.png"), "not a PNG");
    await fs.writeFile(path.join(inbox, "vector.svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    const handle = await fs.open(path.join(inbox, "large.png"), "w");
    await handle.truncate(20 * 1024 * 1024 + 1); await handle.close();
    const png = await fs.readFile(path.join(inbox, "one.png"));
    // An APNG animation-control chunk before IDAT must be rejected even if libvips ignores it.
    const animation = Buffer.alloc(20); animation.writeUInt32BE(8); animation.write("acTL", 4); animation.writeUInt32BE(2, 8);
    await fs.writeFile(path.join(inbox, "animated.png"), Buffer.concat([png.subarray(0, 33), animation, png.subarray(33)]));
    await expect(importImage(deps, await request(file))).rejects.toMatchObject({ code: "IMAGE_INVALID" });
  });

  it("rejects a pixel bomb before decoding and accepts an oriented JPEG with actual display dimensions", async () => {
    await sharp({ create: { width: 5001, height: 5000, channels: 3, background: "red" } }).png().toFile(path.join(inbox, "pixels.png"));
    await expect(importImage(deps, await request("pixels.png"))).rejects.toMatchObject({ code: "IMAGE_INVALID" });
    await sharp(path.join(inbox, "one.png")).jpeg().withMetadata({ orientation: 6 }).toFile(path.join(inbox, "rotated.jpg"));
    const updated = await importImage(deps, await request("rotated.jpg"));
    expect(updated.scenes[0]).toMatchObject({ imageWidth: 48, imageHeight: 64 });
  });

  it("rejects stale revisions and imports while a run is active", async () => {
    const input = await request();
    await deps.store.update(project.id, (p) => ({ ...p, scenes: p.scenes.map((s) => ({ ...s, imagePrompt: "different" })) }));
    await expect(importImage(deps, input)).rejects.toMatchObject({ code: "IMAGE_REVISION_STALE" });
    deps.activeRuns.add(project.id);
    await expect(importImage(deps, await request())).rejects.toMatchObject({ code: "PIPELINE_ALREADY_RUNNING" });
    await expect(approveSceneReview(deps.store, project.id, 0, undefined, deps.activeRuns)).rejects.toMatchObject({ code: "PIPELINE_ALREADY_RUNNING" });
  });

  it("reports missing assets after restart and repairs an idempotent import", async () => {
    const updated = await importImage(deps, await request());
    const file = updated.scenes[0]?.imageFile;
    if (!file) throw new Error("Missing image");
    await fs.unlink(path.join(root, project.id, "assets", file));
    expect(await getImageReadiness(updated, root)).toMatchObject({ ready: false, missingScenes: [0] });
    const repaired = await importImage({ ...deps, store: createProjectStore(root) }, await request());
    expect(await getImageReadiness(repaired, root)).toMatchObject({ ready: true });
    expect(repaired.scenes[0]?.imageVariants).toHaveLength(1);
  });
});
