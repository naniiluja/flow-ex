#!/usr/bin/env node
// Removes Flow's one-star watermark from a project's approved stills, writing clean PNGs.
//
//   node remove-image-watermark.mjs --project <projectId or path> --out-dir <dir> [--only 1,5,9]
//
// Output is `scene-NN.png` (NN = scene number from 1), ready for `assemble-video.mjs --stills` and for
// the END frame of a Flow clip job: a star left in the end frame is animated by the video model into
// stray sparkles that `delogo` cannot reach (measured on 7 of 12 clips).
//
// Measured on a 768x1376 Flow still: the star sits around (647,1255). The collage prompts keep the
// bottom-right an empty flat paper field, so a 96x96 patch copied from the same row 96px to the left,
// blended in through a blurred mask, hides it. Work happens in RGB and the result is a PNG: going
// through RGBA/yuvj420p shifted the patch colour visibly (173,80,40 against a 182,76,31 background).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const BASE_WIDTH = 768;
const PATCH = { sourceX: 526, targetX: 622, y: 1230, size: 96, margin: 12, blurSigma: 7 };

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

function fail(message) {
  console.error(`remove-image-watermark: ${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.project || !args["out-dir"]) fail("usage: --project <projectId or path> --out-dir <dir> [--only 1,5,9]");

const projectDir = existsSync(args.project) ? resolve(args.project) : join(REPO, "projects", args.project);
const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));
const outDir = resolve(args["out-dir"]);
mkdirSync(outDir, { recursive: true });
const only = args.only ? new Set(args.only.split(",").map(Number)) : undefined;

const require = createRequire(join(REPO, "be", "package.json"));
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const ffprobe = require("@ffprobe-installer/ffprobe").path;

function imageWidth(file) {
  const probe = spawnSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width", "-of", "csv=p=0", file], {
    encoding: "utf8",
  });
  const width = Number(probe.stdout.trim());
  if (probe.status !== 0 || !Number.isFinite(width)) fail(`ffprobe could not read ${file}`);
  return width;
}

let cleaned = 0;
project.scenes.forEach((scene, index) => {
  const number = index + 1;
  if (only && !only.has(number)) return;
  if (!scene.imageFile) fail(`scene ${String(number)} has no approved image yet`);
  const input = join(projectDir, "assets", scene.imageFile);
  const scale = imageWidth(input) / BASE_WIDTH;
  const px = (value) => String(Math.round(value * scale));
  const size = px(PATCH.size);
  const graph =
    `[0:v]format=gbrp,split[a][b];` +
    `[b]crop=${size}:${size}:${px(PATCH.sourceX)}:${px(PATCH.y)},format=gbrap[p];` +
    `color=c=black:s=${size}x${size}:d=1,drawbox=x=${px(PATCH.margin)}:y=${px(PATCH.margin)}:w=${px(PATCH.size - 2 * PATCH.margin)}:h=${px(PATCH.size - 2 * PATCH.margin)}:color=white:t=fill,gblur=sigma=${String(PATCH.blurSigma * scale)},format=gray[m];` +
    `[p][m]alphamerge[pa];[a]format=gbrp[ab];[ab][pa]overlay=${px(PATCH.targetX)}:${px(PATCH.y)}:format=gbrp:shortest=1`;
  const output = join(outDir, `scene-${String(number).padStart(2, "0")}.png`);
  const result = spawnSync(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-i", input, "-filter_complex", graph, "-frames:v", "1", output], {
    encoding: "utf8",
  });
  if (result.status !== 0) fail(`ffmpeg failed on scene ${String(number)}: ${result.stderr}`);
  cleaned += 1;
});
console.log(`remove-image-watermark: ${String(cleaned)} stills cleaned into ${outDir}`);
