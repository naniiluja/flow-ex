#!/usr/bin/env node
// Narrates a whole story as ONE Vbee audio file instead of one file per scene, then derives every
// scene's start and end from whisper's word times. Use it for long stories read straight through.
//
//   node --env-file=.env .claude/skills/collage-broll/scripts/narrate-whole.mjs \
//     --project <projectId> [--story story.md] [--force 1]
//
// Writes `projects/<id>/narration/{audio/000.mp3, captions/000.json, timeline.json}`; feed the
// timeline to `assemble-video.mjs --timeline`.
//
// Why: the pipeline narrates each scene with its own Vbee call, so every scene join carries Vbee's
// own lead/tail silence PLUS the pipeline's scene gap. Measured on an 80-scene story: 1.01s of
// silence at each of 79 joins (9% of the video) and a fresh breath of prosody every ~11 seconds,
// which listeners heard as "the sentences keep getting cut". One call reads the story the way a
// person would, with only the pauses the punctuation asks for.
//
// A scene boundary is cut in the natural gap between the last word of one scene and the first word
// of the next, so nothing is added or removed from the audio itself. `--story` keeps the story's own
// paragraph breaks (Vbee turns a blank line into the `paragraphBreak` pause); without it scenes are
// joined by a space.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const POLL_TIMEOUT_MS = 25 * 60 * 1000;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

function fail(message) {
  console.error(`narrate-whole: ${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.project) fail("usage: --project <projectId or path> [--story story.md] [--force 1]");
for (const name of ["VBEE_APP_ID", "VBEE_TOKEN"]) {
  if (!process.env[name]) fail(`${name} is not set (run with node --env-file=.env)`);
}

const projectDir = existsSync(args.project) ? resolve(args.project) : join(REPO, "projects", args.project);
const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));
// `--dir` keeps a trial with another voice beside the existing narration instead of overwriting it.
const narrationDir = join(projectDir, args.dir ?? "narration");
const voice = args.voice ?? project.voice;
mkdirSync(narrationDir, { recursive: true });

const words = (text) => text.trim().split(/\s+/).filter(Boolean);
const sceneWordCounts = project.scenes.map((scene) => words(scene.narration).length);
const sceneWords = project.scenes.flatMap((scene) => words(scene.narration));

let narration;
if (args.story) {
  const paragraphs = readFileSync(resolve(args.story), "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("#") && line.trim().length > 0);
  narration = paragraphs.join("\n\n");
  const storyWords = words(narration);
  const mismatch = storyWords.findIndex((word, index) => word !== sceneWords[index]);
  if (storyWords.length !== sceneWords.length || mismatch !== -1) {
    fail(
      `the story and the project's scenes disagree (${String(storyWords.length)} vs ${String(sceneWords.length)} words, first difference at word ${String(mismatch)}: "${storyWords[mismatch] ?? ""}" vs "${sceneWords[mismatch] ?? ""}")`,
    );
  }
} else {
  narration = project.scenes.map((scene) => scene.narration).join(" ");
}
console.log(`narrate-whole: ${String(sceneWords.length)} words, ${String(narration.length)} characters, ${String(project.scenes.length)} scenes`);

const load = (relative) => import(pathToFileURL(join(REPO, relative)).href);
const { createVbeeTtsProvider } = await load("be/src/providers/vbee/vbee-tts-provider.ts");
const { createWhisperTranscriptionProvider } = await load("be/src/providers/whisper/whisper-transcription-provider.ts");

const audioPath = join(narrationDir, "audio", "000.mp3");
let durationMs;
if (existsSync(audioPath) && args.force !== "1") {
  const { measureAudioDurationMs } = await load("be/src/providers/vbee/measure-audio-duration.ts");
  durationMs = await measureAudioDurationMs(audioPath);
  console.log(`narrate-whole: reusing ${audioPath} (${(durationMs / 1000).toFixed(1)}s); pass --force 1 to narrate again`);
} else {
  const tts = createVbeeTtsProvider({
    appId: process.env.VBEE_APP_ID,
    token: process.env.VBEE_TOKEN,
    webhookUrl: process.env.VBEE_WEBHOOK_URL ?? "https://vbee-callback.invalid/noop",
    assetsDir: narrationDir,
    ttsOptions: project.tts,
    pollTimeoutMs: POLL_TIMEOUT_MS,
  });
  const started = Date.now();
  const result = await tts.synthesize(narration, { projectId: project.id, sceneIndex: 0, voice });
  durationMs = result.durationMs;
  console.log(`narrate-whole: Vbee returned ${(durationMs / 1000).toFixed(1)}s of audio in ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

const cacheDir = process.env.WHISPER_CACHE_DIR ?? "./.whisper-cache";
const whisper = createWhisperTranscriptionProvider({
  assetsDir: narrationDir,
  whisperCacheDir: isAbsolute(cacheDir) ? cacheDir : resolve(REPO, "be", cacheDir),
  model: process.env.WHISPER_MODEL ?? "small",
  whisperCppVersion: process.env.WHISPER_CPP_VERSION ?? "1.5.5",
});
const started = Date.now();
await whisper.transcribe("audio/000.mp3", { projectId: project.id, sceneIndex: 0, durationMs, narration });
console.log(`narrate-whole: whisper finished in ${((Date.now() - started) / 1000).toFixed(0)}s`);

const captions = JSON.parse(readFileSync(join(narrationDir, "captions", "000.json"), "utf8"));
if (captions.length !== sceneWords.length) {
  fail(`whisper alignment returned ${String(captions.length)} words for a ${String(sceneWords.length)}-word script`);
}

// Cut each scene boundary in the middle of the silence between the two words around it.
const scenes = [];
let firstWord = 0;
let startMs = 0;
sceneWordCounts.forEach((count, index) => {
  const lastWord = firstWord + count - 1;
  const isLast = index === sceneWordCounts.length - 1;
  const endMs = isLast ? durationMs : Math.round((captions[lastWord].endMs + captions[lastWord + 1].startMs) / 2);
  scenes.push({ startMs, endMs });
  startMs = endMs;
  firstWord += count;
});

writeFileSync(
  join(narrationDir, "timeline.json"),
  JSON.stringify({ audio: audioPath, durationMs, scenes, words: captions }, null, 2),
);
const lengths = scenes.map((scene) => (scene.endMs - scene.startMs) / 1000);
console.log(
  `narrate-whole: timeline for ${String(scenes.length)} scenes written (scene lengths ${Math.min(...lengths).toFixed(1)}s to ${Math.max(...lengths).toFixed(1)}s) -> ${join(narrationDir, "timeline.json")}`,
);
process.exit(0);
