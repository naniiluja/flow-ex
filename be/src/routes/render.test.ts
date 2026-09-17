import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { path as ffprobePath } from "@ffprobe-installer/ffprobe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { projectSchema, type ScriptInput } from "@flow-ex/shared-schemas";

import { buildApp } from "../app.ts";
import { createProjectStore } from "../store/project-store.ts";

const execFileAsync = promisify(execFile);

const SCRIPT: ScriptInput = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  preset: "youtube",
  reviewEnabled: false,
  scenes: [
    { narration: "Xin chao", imagePrompt: "a sunny beach" },
    { narration: "Tam biet", imagePrompt: "a quiet evening" },
  ],
};

/** e2e gate for task 003 (../../.claude/plan/task-003-pipeline-engine.md): a real HTTP request to
 * `POST /api/projects/:id/render` must drive the WHOLE pipeline (fake image/tts generation, then
 * task 002's real Chrome-based renderVideo over the new per-project asset route) to a genuinely
 * valid `output.mp4` — not a stub. */
describe("POST /api/projects/:id/render (e2e)", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;
  let baseUrl: string;

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-render-route-"));
    app = buildApp({ store: createProjectStore(root) });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected a bound TCP address");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  afterAll(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("runs the fake-provider pipeline end to end and produces a valid output.mp4", async () => {
    const created = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(SCRIPT),
    });
    expect(created.status).toBe(201);
    const project = projectSchema.parse(await created.json());

    const started = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: "POST" });
    expect(started.status).toBe(202);

    const deadline = Date.now() + 60_000;
    let finalProject = project;
    while (finalProject.runStatus !== "completed" && finalProject.runStatus !== "failed") {
      if (Date.now() > deadline) throw new Error("timed out waiting for the pipeline to finish");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const response = await fetch(`${baseUrl}/api/projects/${project.id}`);
      finalProject = projectSchema.parse(await response.json());
    }

    expect(finalProject.runStatus).toBe("completed");
    expect(finalProject.outputFile).toBe("output.mp4");
    for (const scene of finalProject.scenes) {
      expect(scene.status).toBe("ready_for_render");
    }

    const outputPath = path.join(root, project.id, "output.mp4");
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    const { stdout } = await execFileAsync(ffprobePath, [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_read_frames",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      outputPath,
    ]);
    expect(Number.parseInt(stdout.trim(), 10)).toBeGreaterThan(0);
  }, 90_000);

  /** Task 006's literal AC: "e2e: chạy pipeline giả, dừng ở awaiting_review, duyệt 1 cảnh, render
   * ra output.mp4" — a real HTTP flow through the review gate, not a pipeline-engine-only test. */
  it("pauses at awaiting_review, then completes after approving every scene and re-posting /render", async () => {
    const created = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...SCRIPT, reviewEnabled: true }),
    });
    const project = projectSchema.parse(await created.json());

    const started = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: "POST" });
    expect(started.status).toBe(202);

    const reviewDeadline = Date.now() + 30_000;
    let pausedProject = project;
    while (pausedProject.runStatus !== "awaiting_review") {
      if (Date.now() > reviewDeadline) throw new Error("timed out waiting for awaiting_review");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const response = await fetch(`${baseUrl}/api/projects/${project.id}`);
      pausedProject = projectSchema.parse(await response.json());
    }
    for (const scene of pausedProject.scenes) {
      expect(scene.status).toBe("awaiting_review");
    }

    for (let sceneIndex = 0; sceneIndex < pausedProject.scenes.length; sceneIndex++) {
      const approved = await fetch(
        `${baseUrl}/api/projects/${project.id}/scenes/${String(sceneIndex)}/approve`,
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      );
      expect(approved.status).toBe(200);
    }

    const resumed = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: "POST" });
    expect(resumed.status).toBe(202);

    const completeDeadline = Date.now() + 60_000;
    let finalProject = pausedProject;
    while (finalProject.runStatus !== "completed" && finalProject.runStatus !== "failed") {
      if (Date.now() > completeDeadline) throw new Error("timed out waiting for completion");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const response = await fetch(`${baseUrl}/api/projects/${project.id}`);
      finalProject = projectSchema.parse(await response.json());
    }

    expect(finalProject.runStatus).toBe("completed");
    expect(finalProject.outputFile).toBe("output.mp4");
    for (const scene of finalProject.scenes) {
      expect(scene.status).toBe("ready_for_render");
    }
    const stat = await fs.stat(path.join(root, project.id, "output.mp4"));
    expect(stat.size).toBeGreaterThan(0);
  }, 90_000);

  it("rejects a second render with 409 while one is genuinely still running in this process", async () => {
    const created = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(SCRIPT),
    });
    const project = projectSchema.parse(await created.json());

    // Fire the first render for real, then immediately fire a second one before it can finish —
    // the guard tracks runs actually in flight IN THIS PROCESS (an in-memory `Set`), not merely
    // `project.runStatus === "running"` on disk: that persisted status alone is NOT a safe guard,
    // since a crashed/restarted process would otherwise leave a project permanently unrenderable
    // (see render.ts's own comment) even though pipeline-engine.ts's resume logic is built to
    // pick a "running" project back up. So this test proves the REAL concurrency guard, not a
    // seeded status.
    const first = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: "POST" });
    expect(first.status).toBe(202);

    const second = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: "POST" });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PIPELINE_ALREADY_RUNNING");

    // Drain the first run so it doesn't leak into a later test.
    const deadline = Date.now() + 60_000;
    let finalProject = project;
    while (finalProject.runStatus !== "completed" && finalProject.runStatus !== "failed") {
      if (Date.now() > deadline) throw new Error("timed out waiting for the pipeline to finish");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const response = await fetch(`${baseUrl}/api/projects/${project.id}`);
      finalProject = projectSchema.parse(await response.json());
    }
  }, 90_000);

  it('allows re-render of a project whose runStatus is "running" with no matching entry in activeRuns (crash-resume, not blocked by stale persisted state)', async () => {
    const created = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(SCRIPT),
    });
    const project = projectSchema.parse(await created.json());

    // Seed runStatus: "running" with no live run behind it, directly on disk (bypassing a real
    // run() call) to stand in for what a process restart leaves behind — a real restart is
    // exercised separately by `pipeline-resume-process-kill.test.ts`, closer to the pipeline
    // engine than this route-level test. This app instance's own `activeRuns` set was never
    // populated for this project.id, so the guard must accept the request regardless.
    const store = createProjectStore(root);
    await store.update(project.id, (p) => ({ ...p, runStatus: "running" }));

    const response = await fetch(`${baseUrl}/api/projects/${project.id}/render`, {
      method: "POST",
    });
    expect(response.status).toBe(202);

    const deadline = Date.now() + 60_000;
    let finalProject = project;
    while (finalProject.runStatus !== "completed" && finalProject.runStatus !== "failed") {
      if (Date.now() > deadline) throw new Error("timed out waiting for the pipeline to finish");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const response2 = await fetch(`${baseUrl}/api/projects/${project.id}`);
      finalProject = projectSchema.parse(await response2.json());
    }
    expect(finalProject.runStatus).toBe("completed");
  }, 90_000);
});
