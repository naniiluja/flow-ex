#!/usr/bin/env node
// Assembles a flow-ex project's scenes + Vbee narration + word-level captions into one vertical MP4,
// using the ffmpeg already installed for `be/` (`@ffmpeg-installer/ffmpeg`).
//
//   node assemble-video.mjs --project <projectId> [--clips <dir with scene-01.mp4 ...>]
//     [--stills <dir with scene-01.png ...>] [--out file.mp4] [--music bed.m4a] [--keep-work 1] [--speedup 0]
//
// Every scene needs a clip (`--clips`) OR a still (`--stills`); a scene with both uses the clip. A still
// becomes a slow Ken Burns push (zoom in on even scenes, out on odd ones, 6% like the Remotion version),
// so a long story can spend Flow credits on a few key clips and use stills everywhere else.
//
// Each scene lasts its narration (`audioDurationMs`) plus the same 600ms pause the pipeline puts
// between scenes; a clip shorter than that holds its last frame (the finished collage). A clip that
// is still moving when the scene ends is sped up (max 1.6x) so its last piece lands, never cut.
// Captions come from the project's own `captions/NNN.json` (script-spelled words timed by whisper),
// burned in as ASS with the active word highlighted.
//
// Scenes are rendered one by one (4 at a time) and then joined, instead of one filter graph with two
// inputs per scene: that graph is fine for 12 scenes and unworkable for 80. Every scene length is
// rounded to a whole number of frames BEFORE captions are timed, so 80 joins cannot drift the captions.
//
// `--music` mixes a background bed under the narration (fade in/out, ducked while the voice speaks);
// `make-ambient-music.mjs` synthesizes a royalty-free one with ffmpeg.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const FONTS_DIR = "/System/Library/Fonts/Supplemental"; // Arial: covers Vietnamese diacritics
const SCENE_GAP_SECONDS = 0.6;
const LAST_SCENE_TAIL_SECONDS = 0.5;
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const PARALLEL_SCENES = 4;
const STILL_ZOOM = 0.06;
const STILL_SOURCE_SCALE = 1.5; // zoompan runs on a 1.5x frame so the push stays smooth
const ACTIVE_WORD_BGR = "80DE4A"; // the captions' green, as BGR for ASS
const MAX_WORDS_PER_PAGE = 4;
const MAX_CHARS_PER_PAGE = 24;
const MAX_CLIP_SPEEDUP = 1.6;
const CLIP_END_HOLD_SECONDS = 0.25;
const MUSIC_VOLUME = 0.8;
// Narration and bed must share rate, layout and sample format before sidechaincompress/amix.
const MIX_FORMAT = "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";
const MUSIC_FADE_IN_SECONDS = 1.5;
const MUSIC_FADE_OUT_SECONDS = 2;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    args[argv[index].replace(/^--/, "")] = argv[index + 1];
  }
  return args;
}

function fail(message) {
  console.error(`assemble-video: ${message}`);
  process.exit(1);
}

function assTime(milliseconds) {
  const totalCentiseconds = Math.max(0, Math.round(milliseconds / 10));
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value) => String(value).padStart(2, "0");
  return `${String(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function cleanWord(text) {
  return text.trim().replace(/[{}\\]/g, "");
}

/** Splits a scene's words into short pages (TikTok-style), keeping each word's own timing. */
function paginate(words) {
  const pages = [];
  let current = [];
  for (const word of words) {
    const chars = current.reduce((sum, item) => sum + item.text.length + 1, 0) + word.text.length;
    if (current.length >= MAX_WORDS_PER_PAGE || (current.length > 0 && chars > MAX_CHARS_PER_PAGE)) {
      pages.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function buildAss(scenes) {
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${String(WIDTH)}`,
    `PlayResY: ${String(HEIGHT)}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    "Style: Caption,Arial,88,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,2,2,60,60,520,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  for (const scene of scenes) {
    const words = scene.words
      .map((word) => ({ ...word, text: cleanWord(word.text) }))
      .filter((word) => word.text.length > 0);
    for (const page of paginate(words)) {
      const pageEnd = page[page.length - 1].endMs;
      page.forEach((word, index) => {
        const start = word.startMs;
        const end = index < page.length - 1 ? page[index + 1].startMs : pageEnd;
        const text = page
          .map((item, itemIndex) =>
            itemIndex === index ? `{\\c&H${ACTIVE_WORD_BGR}&}${item.text}{\\c&HFFFFFF&}` : item.text,
          )
          .join(" ");
        lines.push(
          `Dialogue: 0,${assTime(scene.offsetMs + start)},${assTime(scene.offsetMs + Math.max(end, start + 30))},Caption,,0,0,0,,${text}`,
        );
      });
    }
  }
  return `${lines.join("\n")}\n`;
}

const args = parseArgs(process.argv.slice(2));
if (!args.project || (!args.clips && !args.stills)) {
  fail("usage: --project <projectId or path> [--clips <dir>] [--stills <dir>] [--timeline narration/timeline.json] [--out file.mp4] [--music bed.m4a]");
}

const projectDir = existsSync(args.project) ? resolve(args.project) : join(REPO, "projects", args.project);
const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));
// With a timeline (from `narrate-whole.mjs`) the story is ONE continuous audio file; the scenes only
// decide which picture is on screen, and captions use the whole story's absolute word times.
const timeline = args.timeline ? JSON.parse(readFileSync(resolve(args.timeline), "utf8")) : undefined;
if (timeline && timeline.scenes.length !== project.scenes.length) {
  fail(`the timeline has ${String(timeline.scenes.length)} scenes but the project has ${String(project.scenes.length)}`);
}
const clipsDir = args.clips ? resolve(args.clips) : undefined;
const stillsDir = args.stills ? resolve(args.stills) : undefined;
const outFile = resolve(args.out ?? join(projectDir, "output-clips.mp4"));
mkdirSync(dirname(outFile), { recursive: true });
const workDir = join(dirname(outFile), "assemble-work");
mkdirSync(workDir, { recursive: true });

const requireFromBe = createRequire(join(REPO, "be", "package.json"));
const ffmpeg = requireFromBe("@ffmpeg-installer/ffmpeg").path;

/** Seconds at which the clip stops moving (start of its final frozen stretch), or Infinity when it
 * moves until the very end. */
function motionEndSeconds(clip) {
  const probe = spawnSync(
    ffmpeg,
    ["-nostdin", "-hide_banner", "-i", clip, "-vf", "freezedetect=n=-48dB:d=0.25", "-an", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  let frozenSince = Infinity;
  for (const line of probe.stderr.split("\n")) {
    const start = /freeze_start: ([\d.]+)/.exec(line);
    if (start) frozenSince = Number(start[1]);
    if (/freeze_end:/.test(line)) frozenSince = Infinity;
  }
  return frozenSince;
}

const scenes = [];
let offsetMs = 0;
let cursorFrame = 0;
project.scenes.forEach((scene, index) => {
  const number = String(index + 1).padStart(2, "0");
  const clip = clipsDir ? join(clipsDir, `scene-${number}.mp4`) : undefined;
  const still = stillsDir ? join(stillsDir, `scene-${number}.png`) : undefined;
  const useClip = clip !== undefined && existsSync(clip);
  if (!useClip && !(still !== undefined && existsSync(still))) fail(`scene ${number} has neither a clip nor a still`);
  let frames;
  let words;
  if (timeline) {
    // Cut points are rounded to whole frames cumulatively, so the scene lengths add up to the audio.
    const isLast = index === project.scenes.length - 1;
    const endFrame = Math.round((isLast ? timeline.durationMs / 1000 + LAST_SCENE_TAIL_SECONDS : timeline.scenes[index].endMs / 1000) * FPS);
    frames = endFrame - cursorFrame;
    cursorFrame = endFrame;
  } else {
    if (!scene.audioFile || scene.audioDurationMs === undefined || !scene.captionsFile) {
      fail(`scene ${number} has no audio/captions yet; run the flow-ex pipeline through transcription first`);
    }
    const tail = index < project.scenes.length - 1 ? SCENE_GAP_SECONDS : LAST_SCENE_TAIL_SECONDS;
    frames = Math.round((scene.audioDurationMs / 1000 + tail) * FPS);
    words = JSON.parse(readFileSync(join(projectDir, "assets", scene.captionsFile), "utf8"));
  }
  const seconds = frames / FPS;
  // A clip whose last piece lands after the scene ends is sped up to finish with a short hold,
  // instead of being cut (measured: 9 of 12 clips lost their final pieces, e.g. the match flame).
  // `--speedup 0` keeps clips at 1x: for clips that never stop moving (hand-painted animation) the freeze
  // detector would report "moves until the end" and speed every one of them up by the maximum.
  const speed = useClip && args.speedup !== "0"
    ? Math.min(MAX_CLIP_SPEEDUP, Math.max(1, motionEndSeconds(clip) / Math.max(seconds - CLIP_END_HOLD_SECONDS, 1)))
    : 1;
  scenes.push({
    number,
    index,
    source: useClip ? clip : still,
    isClip: useClip,
    audio: timeline ? undefined : join(projectDir, "assets", scene.audioFile),
    seconds,
    frames,
    words,
    offsetMs,
    speed,
    segment: join(workDir, `seg-${number}.mkv`),
  });
  offsetMs += seconds * 1000;
});

const assPath = join(dirname(outFile), "captions.ass");
writeFileSync(assPath, buildAss(timeline ? [{ words: timeline.words, offsetMs: 0 }] : scenes));

function videoChain(scene) {
  const duration = scene.seconds.toFixed(3);
  if (scene.isClip) {
    return `[0:v]scale=${String(WIDTH)}:${String(HEIGHT)}:force_original_aspect_ratio=increase,crop=${String(WIDTH)}:${String(HEIGHT)},fps=${String(FPS)},setpts=PTS/${scene.speed.toFixed(4)},tpad=stop_mode=clone:stop_duration=${duration},trim=duration=${duration},setpts=PTS-STARTPTS,setsar=1[v]`;
  }
  const bigWidth = 2 * Math.round((WIDTH * STILL_SOURCE_SCALE) / 2);
  const bigHeight = 2 * Math.round((HEIGHT * STILL_SOURCE_SCALE) / 2);
  const progress = `on/${String(scene.frames)}`;
  const zoom = scene.index % 2 === 0 ? `1+${String(STILL_ZOOM)}*${progress}` : `${String(1 + STILL_ZOOM)}-${String(STILL_ZOOM)}*${progress}`;
  return `[0:v]scale=${String(bigWidth)}:${String(bigHeight)}:force_original_aspect_ratio=increase,crop=${String(bigWidth)}:${String(bigHeight)},zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${String(scene.frames)}:s=${String(WIDTH)}x${String(HEIGHT)}:fps=${String(FPS)},setsar=1[v]`;
}

function renderScene(scene) {
  const duration = scene.seconds.toFixed(3);
  const hasAudio = scene.audio !== undefined;
  const graph = [
    videoChain(scene),
    ...(hasAudio
      ? [`[1:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a]`]
      : []),
  ].join(";");
  return new Promise((resolveScene, rejectScene) => {
    const child = spawn(
      ffmpeg,
      ["-y", "-loglevel", "error", "-nostdin", "-i", scene.source, ...(hasAudio ? ["-i", scene.audio] : []),
        "-filter_complex", graph, "-map", "[v]", ...(hasAudio ? ["-map", "[a]"] : ["-an"]), "-t", duration,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS),
        ...(hasAudio ? ["-c:a", "pcm_s16le"] : []), scene.segment],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectScene);
    child.on("close", (code) => {
      if (code === 0) resolveScene();
      else rejectScene(new Error(`scene ${scene.number} ffmpeg exited ${String(code)}: ${stderr.slice(-400)}`));
    });
  });
}

let next = 0;
let done = 0;
async function worker() {
  while (next < scenes.length) {
    const scene = scenes[next];
    next += 1;
    await renderScene(scene);
    done += 1;
    if (done % 10 === 0 || done === scenes.length) console.log(`assemble-video: rendered ${String(done)}/${String(scenes.length)} scenes`);
  }
}
try {
  await Promise.all(Array.from({ length: PARALLEL_SCENES }, () => worker()));
} catch (error) {
  fail(String(error));
}

const listPath = join(workDir, "list.txt");
writeFileSync(listPath, scenes.map((scene) => `file '${scene.segment}'`).join("\n"));

const filters = [`[0:v]ass=captions.ass:fontsdir=${FONTS_DIR}[vout]`];
const inputs = ["-f", "concat", "-safe", "0", "-i", listPath];
const totalSeconds = offsetMs / 1000;
// Narration source: the scene segments' own audio, or the single master narration file.
let voiceRef = "[0:a]";
let nextInput = 1;
if (timeline) {
  inputs.push("-i", resolve(timeline.audio));
  filters.push(`[${String(nextInput)}:a]${MIX_FORMAT},apad=whole_dur=${totalSeconds.toFixed(3)},atrim=duration=${totalSeconds.toFixed(3)},asetpts=PTS-STARTPTS[narration]`);
  voiceRef = "[narration]";
  nextInput += 1;
}
let audioLabel = timeline ? "[narration]" : "0:a";
if (args.music) {
  const fadeOutStart = Math.max(0, totalSeconds - MUSIC_FADE_OUT_SECONDS).toFixed(3);
  inputs.push("-i", resolve(args.music));
  filters.push(
    `[${String(nextInput)}:a]${MIX_FORMAT},atrim=duration=${totalSeconds.toFixed(3)},volume=${MUSIC_VOLUME},afade=t=in:d=${String(MUSIC_FADE_IN_SECONDS)},afade=t=out:st=${fadeOutStart}:d=${String(MUSIC_FADE_OUT_SECONDS)}[bed]`,
    `${voiceRef}${MIX_FORMAT},asplit=2[voice][duck]`,
    "[bed][duck]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[beddk]",
    "[voice][beddk]amix=inputs=2:normalize=0:duration=first[aout]",
  );
  audioLabel = "[aout]";
}

const result = spawnSync(
  ffmpeg,
  ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", audioLabel,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outFile],
  { cwd: dirname(outFile), stdio: "inherit" },
);
if (result.status !== 0) fail(`ffmpeg exited with status ${String(result.status)}`);
if (args["keep-work"] !== "1") rmSync(workDir, { recursive: true, force: true });
const clipCount = scenes.filter((scene) => scene.isClip).length;
console.log(
  `assemble-video: wrote ${outFile} (${(offsetMs / 1000).toFixed(1)}s, ${String(scenes.length)} scenes, ${String(clipCount)} clips, ${String(scenes.length - clipCount)} stills)`,
);
