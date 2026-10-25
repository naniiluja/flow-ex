#!/usr/bin/env node
// Narrates a whole story as ONE expressive audio file and writes the timeline `assemble-video.mjs
// --timeline` needs. Steps (each measured or taken from the prosody research, see SKILL.md):
//   1. story = the scenes' text, grouped into paragraphs; a paragraph break is also put before a quoted
//      reply that follows a colon, so the pause before a spoken line is reliable (Vbee's own colon pause
//      is 0 to 0.26 s)
//   2. ONE Vbee call (speed 0.95; pauses 0.2 / 0.3 / 0.4 s, paragraph 1.4 s)
//   3. `prosody/declick.py` cleans the splice noise Vbee leaves where it joins paragraph pieces
//   4. whisper runs PER PARAGRAPH (it drifts after a long silence: it once gave a word 1.1 s that was
//      silence), word times are offset back into the whole story
//   5. `prosody/emphasis.py` widens the pitch range of focus words (Praat PSOLA), lengthens them 15% and
//      lowers sentence ends; the old->new time map keeps captions and scene cuts in sync
//
//   node --env-file=.env .claude/skills/collage-broll/scripts/narrate-expressive.mjs \
//     --project <id> [--voice <code>] [--dir narration-expressive] [--paragraphs-from narration] \
//     [--story story.md] [--pitch 1|0] [--speed 0.95] [--force 1] [--cues cues.json]
//   --cues: the director's per-line pitch range / tempo / focus for emotional lines (see prosody/emphasis.py)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const PROSODY = join(fileURLToPath(new URL(".", import.meta.url)), "prosody");
const PAUSES = { mediumBreak: 0.2, majorBreak: 0.3, sentenceBreak: 0.4, paragraphBreak: 1.4 };

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) args[argv[index].replace(/^--/, "")] = argv[index + 1];
  return args;
}
function fail(message) {
  console.error(`narrate-expressive: ${message}`);
  process.exit(1);
}
const log = (message) => console.log(`narrate-expressive: ${message}`);

const args = parseArgs(process.argv.slice(2));
if (!args.project) fail("usage: --project <projectId or path> [--voice code] [--dir name] [--pitch 1|0]");
for (const name of ["VBEE_APP_ID", "VBEE_TOKEN"]) if (!process.env[name]) fail(`${name} is not set (run with node --env-file=.env)`);

const projectDir = existsSync(args.project) ? resolve(args.project) : join(REPO, "projects", args.project);
const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));
const outDir = join(projectDir, args.dir ?? "narration-expressive");
mkdirSync(join(outDir, "audio"), { recursive: true });
mkdirSync(join(outDir, "chunks", "audio"), { recursive: true });
const voice = args.voice ?? project.voice;
const speed = Number(args.speed ?? 0.95);
const pitch = args.pitch !== "0";

const ffmpeg = createRequire(join(REPO, "be", "package.json"))("@ffmpeg-installer/ffmpeg").path;
const run = (command, commandArgs, label) => {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) fail(`${label} failed: ${(result.stderr || result.stdout).slice(-600)}`);
  return result.stdout;
};
const python = (script, scriptArgs, label) =>
  run("uv", ["run", "--quiet", "--with", "numpy", "--with", "scipy", "--with", "praat-parselmouth", "python", join(PROSODY, script), ...scriptArgs], label);
const wordsOf = (text) => text.trim().split(/\s+/).filter(Boolean);

// 1. the story, grouped into paragraphs
const sceneWordCounts = project.scenes.map((scene) => wordsOf(scene.narration).length);
let paragraphs;
if (args.story) {
  paragraphs = readFileSync(resolve(args.story), "utf8").split("\n").filter((line) => !line.startsWith("#") && line.trim());
} else {
  const sourceDir = join(projectDir, args["paragraphs-from"] ?? "narration");
  const oldWav = join(outDir, "old-narration.wav");
  run(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-i", join(sourceDir, "audio", "000.mp3"), "-ac", "1", "-ar", "16000", oldWav], "ffmpeg (old narration)");
  const { starts } = JSON.parse(python("paragraphs.py", [oldWav, join(sourceDir, "timeline.json")], "paragraphs.py"));
  log(`recovered ${String(starts.length)} paragraphs from the pauses of ${sourceDir}`);
  paragraphs = starts.map((first, index) => {
    const last = index + 1 < starts.length ? starts[index + 1] : project.scenes.length;
    return project.scenes.slice(first, last).map((scene) => scene.narration).join(" ");
  });
}
// a quoted reply after a colon opens its own block: the pause before a spoken line
const blocks = paragraphs.flatMap((paragraph) => paragraph.replace(/:\s+(["“])/g, ":\n\n$1").split("\n\n")).map((text) => text.trim()).filter(Boolean);
const story = blocks.join("\n\n");
const storyWords = wordsOf(story);
const sceneWords = project.scenes.flatMap((scene) => wordsOf(scene.narration));
if (storyWords.length !== sceneWords.length || storyWords.some((word, index) => word !== sceneWords[index])) {
  fail(`the story and the scenes disagree (${String(storyWords.length)} vs ${String(sceneWords.length)} words)`);
}
writeFileSync(join(outDir, "story.txt"), story);
log(`${String(storyWords.length)} words, ${String(blocks.length)} blocks (paragraphs + quoted replies), voice ${voice}, speed ${String(speed)}`);

// 2. one Vbee call
const load = (relative) => import(pathToFileURL(join(REPO, relative)).href);
const rawMp3 = join(outDir, "audio", "000.mp3");
if (!existsSync(rawMp3) || args.force === "1") {
  const { createVbeeTtsProvider } = await load("be/src/providers/vbee/vbee-tts-provider.ts");
  const tts = createVbeeTtsProvider({
    appId: process.env.VBEE_APP_ID,
    token: process.env.VBEE_TOKEN,
    webhookUrl: process.env.VBEE_WEBHOOK_URL ?? "https://vbee-callback.invalid/noop",
    assetsDir: outDir,
    ttsOptions: { speed, clientPause: PAUSES },
    pollTimeoutMs: 25 * 60 * 1000,
  });
  const result = await tts.synthesize(story, { projectId: project.id, sceneIndex: 0, voice });
  log(`Vbee returned ${(result.durationMs / 1000).toFixed(1)}s of audio`);
} else {
  log(`reusing ${rawMp3} (pass --force 1 to narrate again)`);
}

// 3. declick
const rawWav = join(outDir, "raw.wav");
const cleanWav = join(outDir, "clean.wav");
run(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-i", rawMp3, "-ac", "1", "-ar", "44100", rawWav], "ffmpeg (raw.wav)");
const declick = JSON.parse(python("declick.py", [rawWav, cleanWav], "declick.py"));
log(`cleaned ${String(declick.cleaned)} gaps`);

// 4. whisper per block. A block break is the longest silence of the audio: take the longest gaps.
const need = blocks.length - 1;
const ranked = [...declick.gaps].sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
if (ranked.length < need) fail(`found only ${String(ranked.length)} long gaps for ${String(need)} block breaks`);
const cuts = ranked.slice(0, need).sort((a, b) => a[0] - b[0]);
const margin = need < ranked.length ? ranked[need - 1][1] - ranked[need - 1][0] - (ranked[need][1] - ranked[need][0]) : Infinity;
log(`block breaks: ${String(need)} gaps of ${(Math.min(...cuts.map((g) => g[1] - g[0]))).toFixed(2)}s or more; the next longest is ${need < ranked.length ? (ranked[need][1] - ranked[need][0]).toFixed(2) : "none"}s`);
if (margin < 0.1) log("WARNING: the weakest block break is barely longer than the next gap, check the cuts");
const bounds = [0, ...cuts.map((gap) => (gap[0] + gap[1]) / 2)];
const { createWhisperTranscriptionProvider } = await load("be/src/providers/whisper/whisper-transcription-provider.ts");
const cache = process.env.WHISPER_CACHE_DIR ?? "./.whisper-cache";
const whisper = createWhisperTranscriptionProvider({
  assetsDir: join(outDir, "chunks"),
  whisperCacheDir: resolve(REPO, "be", cache),
  model: process.env.WHISPER_MODEL ?? "small",
  whisperCppVersion: process.env.WHISPER_CPP_VERSION ?? "1.5.5",
});
const words = [];
const blockStartWord = [];
const started = Date.now();
for (let index = 0; index < blocks.length; index += 1) {
  const from = bounds[index];
  const to = index + 1 < bounds.length ? bounds[index + 1] : undefined;
  const chunk = `audio/${String(index).padStart(3, "0")}.mp3`;
  run(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-i", cleanWav, "-ss", from.toFixed(3), ...(to ? ["-to", to.toFixed(3)] : []), "-b:a", "128k", join(outDir, "chunks", chunk)], `ffmpeg (chunk ${String(index)})`);
  const durationMs = Math.round(((to ?? declick.gaps.at(-1)?.[1] ?? from + 1) - from) * 1000);
  await whisper.transcribe(chunk, { projectId: project.id, sceneIndex: index, durationMs, narration: blocks[index] });
  const captions = JSON.parse(readFileSync(join(outDir, "chunks", "captions", `${String(index).padStart(3, "0")}.json`), "utf8"));
  if (captions.length !== wordsOf(blocks[index]).length) fail(`block ${String(index)}: whisper alignment returned ${String(captions.length)} words for ${String(wordsOf(blocks[index]).length)}`);
  blockStartWord.push(words.length);
  for (const caption of captions) words.push({ text: caption.text, startMs: caption.startMs + Math.round(from * 1000), endMs: caption.endMs + Math.round(from * 1000) });
  if ((index + 1) % 10 === 0 || index + 1 === blocks.length) log(`whisper ${String(index + 1)}/${String(blocks.length)} blocks (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
if (words.length !== storyWords.length) fail(`merged ${String(words.length)} words, expected ${String(storyWords.length)}`);

// scene cuts in the middle of the gap between the last word of one scene and the first of the next
let firstWord = 0;
const sceneEndsMs = [];
sceneWordCounts.forEach((count, index) => {
  const last = firstWord + count - 1;
  sceneEndsMs.push(index === sceneWordCounts.length - 1 ? undefined : Math.round((words[last].endMs + words[last + 1].startMs) / 2));
  firstWord += count;
});

// 5. emphasis
let finalWav = cleanWav;
let remap = (ms) => ms;
let totalMs;
if (pitch) {
  writeFileSync(join(outDir, "words.json"), JSON.stringify(words));
  writeFileSync(join(outDir, "para-starts.json"), JSON.stringify(blockStartWord));
  finalWav = join(outDir, "emphasis.wav");
  const info = JSON.parse(python("emphasis.py", [cleanWav, join(outDir, "words.json"), join(outDir, "para-starts.json"), finalWav, join(outDir, "time-map.json"), ...(args.cues ? [resolve(args.cues)] : [])], "emphasis.py"));
  log(`emphasis: ${String(info.focus_words)} focus words, audio ${String(info.old_s)}s -> ${String(info.new_s)}s`);
  const map = JSON.parse(readFileSync(join(outDir, "time-map.json"), "utf8"));
  remap = (ms) => {
    const t = ms / 1000;
    let lo = 0;
    let hi = map.old.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (map.old[mid] <= t) lo = mid;
      else hi = mid;
    }
    const span = map.old[hi] - map.old[lo] || 1;
    return Math.round((map.new[lo] + ((t - map.old[lo]) / span) * (map.new[hi] - map.new[lo])) * 1000);
  };
  totalMs = Math.round(info.new_s * 1000);
}
const finalMp3 = join(outDir, "audio", "final.mp3");
run(ffmpeg, ["-nostdin", "-y", "-loglevel", "error", "-i", finalWav, "-b:a", "192k", finalMp3], "ffmpeg (final.mp3)");
if (totalMs === undefined) totalMs = Math.round((declick.gaps.at(-1)?.[1] ?? 0) * 1000);
const probe = spawnSync(ffmpeg, ["-nostdin", "-hide_banner", "-i", finalMp3], { encoding: "utf8" });
const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe.stderr);
if (match) totalMs = Math.round((Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) * 1000);

const finalWords = words.map((word) => ({ ...word, startMs: remap(word.startMs), endMs: Math.max(remap(word.endMs), remap(word.startMs) + 1) }));
let startMs = 0;
const scenes = sceneEndsMs.map((end) => {
  const endMs = end === undefined ? totalMs : remap(end);
  const scene = { startMs, endMs };
  startMs = endMs;
  return scene;
});
writeFileSync(join(outDir, "timeline.json"), JSON.stringify({ audio: finalMp3, durationMs: totalMs, scenes, words: finalWords }, null, 2));
const lengths = scenes.map((scene) => (scene.endMs - scene.startMs) / 1000);
log(`timeline written: ${String(scenes.length)} scenes (${Math.min(...lengths).toFixed(1)}s to ${Math.max(...lengths).toFixed(1)}s), audio ${(totalMs / 60000).toFixed(2)} min -> ${join(outDir, "timeline.json")}`);
process.exit(0);
