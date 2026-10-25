#!/usr/bin/env node
// Reads scenes.md (the single source of the narration), lints it against the style rules, and writes
// story.md (one paragraph per blank-line block, for narrate-expressive.mjs --story) and
// project.json.input (the POST /api/projects body).
//   node build-story.mjs            lint + write
//   node build-story.mjs --check    lint only

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const checkOnly = process.argv.includes("--check");

const lines = readFileSync(join(DIR, "scenes.md"), "utf8").split("\n");
const scenes = [];
const paragraphs = [[]];
for (const line of lines) {
  if (line.startsWith("#")) continue;
  if (!line.trim()) {
    if (paragraphs.at(-1).length) paragraphs.push([]);
    continue;
  }
  const [id, narration, visual] = line.split(" | ");
  if (!id || !narration || !visual) throw new Error(`bad line: ${line.slice(0, 60)}`);
  const scene = { id: id.trim(), narration: narration.trim(), visual: visual.trim() };
  scenes.push(scene);
  paragraphs.at(-1).push(scene);
}
if (!paragraphs.at(-1).length) paragraphs.pop();

const problems = [];
const warn = (id, message) => problems.push(`${id}: ${message}`);
const syllables = (text) => text.split(/\s+/).filter(Boolean).length;

let totalWords = 0;
let breaks = 0;
let recentShort = [];
for (const scene of scenes) {
  const text = scene.narration;
  totalWords += syllables(text);
  if (text !== text.normalize("NFC")) warn(scene.id, "not NFC");
  if (/[—–]/.test(text)) warn(scene.id, "em/en dash");
  if (/\d/.test(text)) warn(scene.id, "digit in narration (spell numbers out)");
  if (/\bbởi\b/i.test(text)) warn(scene.id, "'bởi'");
  if (/(^|[.?!]\s)(Việc|Trong quá trình|Một|Nên)\b/.test(text)) warn(scene.id, "forbidden sentence opener");
  if (/một cách/i.test(text)) warn(scene.id, "'một cách'");
  if (/\bvà\b[^.]*\bvà\b[^.]*\bvà\b/.test(text)) warn(scene.id, "'và ... và ... và' chain");
  for (const sentence of text.split(/(?<=[.?!])\s+/)) {
    const count = syllables(sentence);
    breaks += 1;
    if (count > 30) warn(scene.id, `${String(count)} syllables: ${sentence.slice(0, 50)}`);
    recentShort = count < 10 ? [...recentShort, sentence] : [];
    if (recentShort.length > 3) warn(scene.id, `more than 3 short sentences in a row near: ${sentence.slice(0, 40)}`);
  }
}

const estimate = totalWords / 3.85 + breaks * 0.62;
console.log(`${String(scenes.length)} scenes, ${String(paragraphs.length)} paragraphs, ${String(totalWords)} words, ${String(breaks)} sentences`);
console.log(`estimated ${String(Math.round(estimate))}s (~${(estimate / 60).toFixed(1)} min, upper bound)`);
console.log(problems.length ? `LINT:\n${problems.join("\n")}` : "lint clean");
if (checkOnly) process.exit(problems.length ? 1 : 0);

writeFileSync(join(DIR, "story.md"), `${paragraphs.map((p) => p.map((s) => s.narration).join(" ")).join("\n")}\n`);

const STYLE =
  "Hand-painted Vietnamese folk-print cartoon in Dong Ho palette (warm cream paper, vermilion red, sophora yellow, indigo blue, leaf green, ink black), brush-ink outlines: ";
const input = {
  title: "Việt Nam từ tiền sử đến hiện đại",
  voice: "s_hochiminh_female_vyquangcao_advertise_vc",
  preset: "tiktok",
  tts: { speed: 0.95, clientPause: { majorBreak: 0.3, mediumBreak: 0.2, paragraphBreak: 1.4, sentenceBreak: 0.4 } },
  publishing: {
    title: "Lịch sử Việt Nam trong một video: từ hang đá đến hôm nay",
    description: "Từ trống đồng, cọc Bạch Đằng, Diên Hồng đến Điện Biên Phủ và Đổi mới, kể bằng tranh cọ hoạt hình phong cách tranh Đông Hồ.",
    thumbnailSceneIndex: 0,
  },
  reviewEnabled: true,
  references: [],
  scenes: scenes.map((scene) => ({ narration: scene.narration, imagePrompt: STYLE + scene.visual, referenceIds: [] })),
};
writeFileSync(join(DIR, "project.input.json"), `${JSON.stringify(input, null, 2)}\n`);
console.log("wrote story.md and project.input.json");
