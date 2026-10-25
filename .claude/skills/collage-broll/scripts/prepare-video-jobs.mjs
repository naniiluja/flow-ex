#!/usr/bin/env node
// Turns a flow-ex project's approved stills into the jobs file `flow-video.mjs` consumes.
//
//   node prepare-video-jobs.mjs --project <projectId> --orders orders.json --out-dir <dir> [--aspect 9:16]
//
// orders.json: one sentence per scene saying HOW the finished collage assembles, in order, e.g.
//   ["the five blank calendar sheets slide in and stack first, the bamboo sprout pops up beside
//     them, then the halftone eye settles into place", ...]
// For every scene it writes frames/scene-NN-start.png (an empty flat paper field in the still's own
// background colour, sampled from its corner) and a jobs.json entry whose End frame is the
// approved still. Clip length is the smallest Flow duration (4/6/8/10s) covering the narration
// plus the 600ms pause between scenes, so the assembly finishes before the scene ends.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const FLOW_DURATIONS = [4, 6, 8, 10];
const SCENE_GAP_SECONDS = 0.6;
const DEFAULT_DURATION_SECONDS = 6;
const CORNER_SAMPLE_OFFSET = 24;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

function fail(message) {
  console.error(`prepare-video-jobs: ${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.project || !args.orders || !args["out-dir"]) {
  fail("usage: --project <projectId or path> --orders <orders.json> --out-dir <dir> [--aspect 9:16|16:9] [--craft <name>] [--look <list>]");
}
const aspect = args.aspect ?? "9:16";
// The craft name and the look list go into every clip prompt: override both for a style whose stills
// differ from the halftone collage (e.g. paper cut-out has no halftone dots), or the video model adds them.
const craft = args.craft ?? "Paper-collage";
const look =
  args.look ?? "colored cardstock accents, uncoated paper grain, halftone dots, cream keylines, crisp cut edges and soft shadows";
const orientation = aspect === "9:16" ? "vertical" : "horizontal";
const projectDir = existsSync(args.project) ? resolve(args.project) : join(REPO, "projects", args.project);
const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));
const orders = JSON.parse(readFileSync(resolve(args.orders), "utf8"));
if (orders.length !== project.scenes.length) {
  fail(`orders.json has ${String(orders.length)} entries but the project has ${String(project.scenes.length)} scenes`);
}
const framesDir = join(resolve(args["out-dir"]), "frames");
mkdirSync(framesDir, { recursive: true });

const ffmpeg = createRequire(join(REPO, "be", "package.json"))("@ffmpeg-installer/ffmpeg").path;

function run(commandArgs, options = {}) {
  const result = spawnSync(ffmpeg, ["-y", "-loglevel", "error", ...commandArgs], options);
  if (result.status !== 0) fail(`ffmpeg failed: ${String(result.stderr)}`);
  return result.stdout;
}

/** Background colour of a still, sampled as one pixel near its top-left corner. */
function backgroundHex(stillPath) {
  const pixel = run(
    [
      "-i",
      stillPath,
      "-vf",
      `crop=16:16:${String(CORNER_SAMPLE_OFFSET)}:${String(CORNER_SAMPLE_OFFSET)},scale=1:1`,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { encoding: "buffer" },
  );
  return [...pixel.subarray(0, 3)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function clipDuration(scene) {
  if (scene.audioDurationMs === undefined) return DEFAULT_DURATION_SECONDS;
  const needed = scene.audioDurationMs / 1000 + SCENE_GAP_SECONDS;
  return FLOW_DURATIONS.find((seconds) => seconds >= needed) ?? FLOW_DURATIONS[FLOW_DURATIONS.length - 1];
}

const jobs = project.scenes.map((scene, index) => {
  const number = String(index + 1).padStart(2, "0");
  const end = join(projectDir, "assets", scene.imageFile);
  if (!existsSync(end)) fail(`scene ${number}: missing still ${end}`);
  const start = join(framesDir, `scene-${number}-start.png`);
  run(["-f", "lavfi", "-i", `color=c=0x${backgroundHex(end)}:s=${String(scene.imageWidth)}x${String(scene.imageHeight)}`, "-frames:v", "1", start]);
  const prompt =
    `${craft} stop-motion assembly, using the start frame as the exact empty first frame and the end frame as the exact completed last frame. ` +
    `In one continuous locked-off ${orientation} shot, open on the empty flat paper field. ` +
    `Assemble the scene piece by piece with crisp physical stop-motion timing: ${orders[index]}. ` +
    `End by holding the supplied completed composition. ` +
    `Preserve the exact ${aspect} framing, the color field, ${look}. ` +
    `Restrained tactile 2D paper craft only. ` +
    `No scene cuts, no camera movement, no zoom, no morphing, no new objects, no text, no letters, no numbers, no logos, no watermark, no UI, no sound.`;
  return { scene: index + 1, start, end, prompt, duration: clipDuration(scene) };
});

const jobsPath = join(resolve(args["out-dir"]), "jobs.json");
writeFileSync(jobsPath, `${JSON.stringify(jobs, null, 2)}\n`);
const credits = { 4: 7, 6: 10, 8: 12, 10: 15 };
const total = jobs.reduce((sum, job) => sum + credits[job.duration], 0);
console.log(`prepare-video-jobs: wrote ${jobsPath} (${String(jobs.length)} jobs, ${String(total)} credits)`);
