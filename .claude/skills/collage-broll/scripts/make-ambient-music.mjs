#!/usr/bin/env node
// Synthesizes a soft, royalty-free ambient pad with ffmpeg (no samples, no downloads), for use as
// the music bed of `assemble-video.mjs --music`.
//
//   node make-ambient-music.mjs --seconds 80 --out projects/<id>/clips-work/bed.m4a [--mood calm|dark]
//
// Four sine voices (A2 bass + an A minor add9 chord: A3, C4, E4, B4) with slow tremolo so the pad
// breathes, a low-pass to take the edge off, and an echo for room. Deliberately plain: the bed has
// to disappear under a spoken story, not compete with it.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const MOODS = {
  calm: {
    lowpassHz: 1200,
    voices: [
      { hz: 110, level: 0.5, tremoloHz: 0.11 },
      { hz: 220, level: 0.4, tremoloHz: 0.13 },
      { hz: 261.63, level: 0.3, tremoloHz: 0.17 },
      { hz: 329.63, level: 0.3, tremoloHz: 0.19 },
      { hz: 493.88, level: 0.15, tremoloHz: 0.23 },
    ],
  },
  // A1 against B-flat1 beat against each other (a minor second, 3.3 Hz), with a low fifth and a thin
  // high minor third above: uneasy but quiet enough to sit under a spoken ghost story.
  dark: {
    lowpassHz: 700,
    voices: [
      { hz: 55, level: 0.6, tremoloHz: 0.1 },
      { hz: 58.27, level: 0.45, tremoloHz: 0.12 },
      { hz: 82.41, level: 0.35, tremoloHz: 0.14 },
      { hz: 116.54, level: 0.2, tremoloHz: 0.16 },
      { hz: 164.81, level: 0.1, tremoloHz: 0.2 },
    ],
  },
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const seconds = Number(args.seconds);
if (!args.out || !Number.isFinite(seconds) || seconds <= 0) {
  console.error("usage: node make-ambient-music.mjs --seconds <n> --out <file.m4a>");
  process.exit(1);
}

const mood = MOODS[args.mood ?? "calm"];
if (!mood) {
  console.error(`make-ambient-music: unknown --mood ${String(args.mood)} (calm | dark)`);
  process.exit(1);
}
const VOICES = mood.voices;
const outFile = resolve(args.out);
mkdirSync(dirname(outFile), { recursive: true });
const ffmpeg = createRequire(join(REPO, "be", "package.json"))("@ffmpeg-installer/ffmpeg").path;

const inputs = VOICES.flatMap((voice) => ["-f", "lavfi", "-i", `sine=frequency=${String(voice.hz)}:sample_rate=48000`]);
const shaped = VOICES.map(
  (voice, index) =>
    `[${String(index)}:a]volume=${String(voice.level)},tremolo=f=${String(voice.tremoloHz)}:d=0.6[s${String(index)}]`,
);
const mix = `${VOICES.map((_, index) => `[s${String(index)}]`).join("")}amix=inputs=${String(VOICES.length)}:normalize=0,lowpass=f=${String(mood.lowpassHz)},aecho=0.8:0.7:600|1100:0.35|0.2,atrim=duration=${String(seconds)},asetpts=PTS-STARTPTS[bed]`;

const result = spawnSync(
  ffmpeg,
  ["-y", "-loglevel", "error", ...inputs, "-filter_complex", [...shaped, mix].join(";"), "-map", "[bed]", "-c:a", "aac", "-b:a", "192k", outFile],
  { stdio: "inherit" },
);
if (result.status !== 0) {
  console.error(`make-ambient-music: ffmpeg exited with status ${String(result.status)}`);
  process.exit(1);
}
console.log(`make-ambient-music: wrote ${outFile} (${String(seconds)}s)`);
