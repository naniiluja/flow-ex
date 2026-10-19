#!/usr/bin/env node
// Covers the Flow video watermark (two animated sparkle stars, bottom-right) in every scene clip.
//
//   node remove-clip-watermark.mjs --clips <dir with scene-NN.mp4> --out-dir <dir>
//
// Why not gemini-watermark-remover: its video model targets Gemini/Veo's mark, not Flow's two
// animated stars, and its CLI needs a repo build plus a Playwright Chromium download. The collage
// prompts leave the bottom-right corner an empty flat paper field, so a clean patch cut from the
// SAME frame, `dx` pixels to the left, hides the stars exactly (verified on a real clip: the mark
// grows during the first second, and the box covers every stage).
//
// First version copied a clean strip from beside the box over it. Measured on a real run, that
// pasted a dark block into the corner whenever a paper piece sat in the SOURCE strip (scene 3) and
// cut pieces that crossed the box. ffmpeg's `delogo` interpolates from the box border instead, so
// it never imports content from elsewhere; its worst case is a small soft smear where a piece
// overlaps the box edge. Constants are measured on a 720x1280 Flow clip (the two stars span
// x 575-652, y 1135-1217) and scaled by the clip's width. QA the corner afterwards.
//
// The box is 116x128, not the 84x92 the stars alone need: near the end of some clips the stars turn
// into a cross-shaped glint that reaches x 573-660, y 1140-1227, and a box that tight left its ends
// as a faint plus sign on the border (scene 8 of a real run).

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const BASE_WIDTH = 720;
const BOX = { x: 556, y: 1116, width: 116, height: 128 };

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

function fail(message) {
  console.error(`remove-clip-watermark: ${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.clips || !args["out-dir"]) fail("usage: --clips <dir> --out-dir <dir>");
const clipsDir = resolve(args.clips);
const outDir = resolve(args["out-dir"]);
mkdirSync(outDir, { recursive: true });

const require = createRequire(join(REPO, "be", "package.json"));
const ffmpeg = require("@ffmpeg-installer/ffmpeg").path;
const ffprobe = require("@ffprobe-installer/ffprobe").path;

function videoWidth(file) {
  const probe = spawnSync(
    ffprobe,
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const width = Number(probe.stdout.trim());
  if (probe.status !== 0 || !Number.isFinite(width)) fail(`ffprobe could not read ${file}`);
  return width;
}

const clips = readdirSync(clipsDir).filter((name) => /^scene-\d+\.mp4$/.test(name)).sort();
if (clips.length === 0) fail(`no scene-NN.mp4 in ${clipsDir}`);

for (const name of clips) {
  const input = join(clipsDir, name);
  const scale = videoWidth(input) / BASE_WIDTH;
  const even = (value) => 2 * Math.round(value / 2);
  const x = even(BOX.x * scale);
  const y = even(BOX.y * scale);
  const width = even(BOX.width * scale);
  const height = even(BOX.height * scale);
  const filter = `delogo=x=${x}:y=${y}:w=${width}:h=${height}`;
  const result = spawnSync(
    ffmpeg,
    ["-y", "-loglevel", "error", "-i", input, "-vf", filter,
      "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy",
      join(outDir, name)],
    { encoding: "utf8" },
  );
  if (result.status !== 0) fail(`ffmpeg failed on ${name}: ${result.stderr}`);
  console.log(`remove-clip-watermark: ${name} patched`);
}
