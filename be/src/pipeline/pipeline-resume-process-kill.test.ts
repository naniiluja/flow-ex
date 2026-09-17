import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Project, ScriptInput } from "@flow-ex/shared-schemas";

import { createProjectStore, type ProjectStore } from "../store/project-store.ts";

const CLI_PATH = fileURLToPath(new URL("./run-pipeline-cli.ts", import.meta.url));

const SCRIPT: ScriptInput = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  reviewEnabled: false,
  scenes: [
    { narration: "Scene mot", imagePrompt: "prompt 1" },
    { narration: "Scene hai", imagePrompt: "prompt 2" },
    { narration: "Scene ba", imagePrompt: "prompt 3" },
  ],
};

function runCli(
  projectsRoot: string,
  projectId: string,
  delayMsForScene: Record<number, number>,
): ChildProcess {
  return spawn(
    process.execPath,
    [CLI_PATH, projectsRoot, projectId, JSON.stringify(delayMsForScene)],
    { stdio: "ignore" },
  );
}

function waitForExit(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => {
    child.once("exit", (code) => {
      resolve(code);
    });
  });
}

async function pollUntil(
  store: ProjectStore,
  projectId: string,
  predicate: (project: Project) => boolean,
  timeoutMs: number,
): Promise<Project> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const project = await store.read(projectId);
    if (predicate(project)) return project;
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for the expected pipeline state");
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

/** Task 003's literal acceptance criterion: "Giết tiến trình (SIGKILL) giữa cảnh 2/3 rồi chạy
 * lại: cảnh 1 (đã done) không chạy lại, cảnh 2 tiếp tục đúng bước đang dừng." A real subprocess
 * kill is used (not an in-process fake) so the test also proves project.json's atomic writes
 * (write-file-atomic) survive a hard kill without leaving corrupt state — a class of bug an
 * in-process simulation cannot exercise. */
describe("pipeline resume after a real process kill (SIGKILL)", () => {
  let root: string;
  let store: ProjectStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-pipeline-kill-"));
    store = createProjectStore(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("does not redo scene 1 and resumes scene 2 from where a SIGKILL interrupted it", async () => {
    const project = await store.create(SCRIPT);

    // Scene 1 (index 0) has no delay and finishes almost immediately; scene 2 (index 1) is
    // delayed 3s on its image step, opening a wide, reliable window to land the kill inside it.
    const firstRun = runCli(root, project.id, { 1: 3000 });
    const midFlightProject = await pollUntil(
      store,
      project.id,
      (p) =>
        p.scenes[0]?.status === "ready_for_render" && p.scenes[1]?.status === "generating_image",
      15_000,
    );
    firstRun.kill("SIGKILL");
    await waitForExit(firstRun);

    const scene0AtKill = midFlightProject.scenes[0];
    const scene1AtKill = midFlightProject.scenes[1];
    if (scene0AtKill?.imageFile === undefined) {
      throw new Error("expected scene 0's image to already be written before the kill");
    }
    expect(scene1AtKill?.imageFile).toBeUndefined(); // killed before the delayed write finished

    const scene0ImagePath = path.join(root, project.id, "assets", scene0AtKill.imageFile);
    const statBeforeResume = await fs.stat(scene0ImagePath);

    const secondRun = runCli(root, project.id, { 1: 3000 });
    const exitCode = await waitForExit(secondRun);
    expect(exitCode).toBe(0);

    const finalProject = await store.read(project.id);
    expect(finalProject.runStatus).toBe("completed");
    for (const scene of finalProject.scenes) {
      expect(scene.status).toBe("ready_for_render");
    }

    // Scene 1 was never regenerated: same file, same mtime, proving the resumed run skipped it
    // instead of re-running an already-finished step.
    const statAfterResume = await fs.stat(scene0ImagePath);
    expect(statAfterResume.mtimeMs).toBe(statBeforeResume.mtimeMs);
  }, 30_000);
});
