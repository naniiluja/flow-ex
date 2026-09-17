#!/usr/bin/env node
/** Test-only CLI entry point: runs one project's pipeline to completion in its OWN process, so
 * `pipeline-resume-process-kill.test.ts` can SIGKILL a real subprocess mid-run and verify a
 * freshly-spawned process resumes correctly from project.json (task 003's literal acceptance
 * criterion), which an in-process fake crash cannot exercise. NOT part of the running server. */
import path from "node:path";

import pino from "pino";

import { createFakeImageProvider } from "../providers/fake/fake-image-provider.ts";
import { createFakeTtsProvider } from "../providers/fake/fake-tts-provider.ts";
import { createProjectStore } from "../store/project-store.ts";
import { createPipelineEngine } from "./pipeline-engine.ts";

const [, , projectsRoot, projectId, delayConfigJson] = process.argv;
if (projectsRoot === undefined || projectId === undefined) {
  console.error("usage: run-pipeline-cli.ts <projectsRoot> <projectId> [delayMsForSceneJson]");
  process.exit(1);
}

const delayMsForScene: Record<number, number> =
  delayConfigJson === undefined ? {} : (JSON.parse(delayConfigJson) as Record<number, number>);

const store = createProjectStore(projectsRoot);
const assetsDir = path.join(projectsRoot, projectId, "assets");
const engine = createPipelineEngine({
  store,
  imageProvider: createFakeImageProvider({ assetsDir, delayMsForScene }),
  ttsProvider: createFakeTtsProvider({ assetsDir }),
  baseLogger: pino({ level: "silent" }),
  retryScheduleMs: [],
  jitter: (ms) => ms,
  // No real Chrome render in this CLI: the resume test only cares about scene-state resumption,
  // which is proven entirely by project.json + the asset files, not by a real output.mp4 (that
  // full path is already covered by render.test.ts's e2e). A no-op VideoRenderer means this CLI
  // never imports task 002's render-video.ts chain at all.
  videoRenderer: { render: () => Promise.resolve(undefined) },
});

engine.run(projectId).then(
  () => {
    process.exit(0);
  },
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
