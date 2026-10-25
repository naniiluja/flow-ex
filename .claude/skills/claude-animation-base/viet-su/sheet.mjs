#!/usr/bin/env node
// Contact sheet of chosen scenes of the Việt sử video, 4 moments each, for checking the staging.
//   node viet-su/sheet.mjs 02 03 05 [--at=.1,.4,.7,.97] [--w=300] [--cols=4]
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/scenes/vs_times.js"), "utf8");
const TIMES = JSON.parse(src.match(/const VS_TIMES = (\[.*\]);/s)[1]);
const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.replace(/^--/, "").split("=")));
const ids = args.filter((a) => !a.startsWith("--"));
const at = (flags.at || ".08,.35,.65,.96").split(",").map(Number), w = flags.w || "300";
for (const id of ids) {
  const S = TIMES.find((x) => x.id === id);
  if (!S) { console.error(`no scene ${id}`); continue; }
  const ts = at.map((k) => (S.start + k * (S.end - S.start)).toFixed(2)).join(",");
  const r = spawnSync("node", ["render.mjs", "--page=vietsu.html", `--sheet=${ts}`, `--cols=${flags.cols || at.length}`, `--w=${w}`, `--out=out/check/s${id}.jpg`], { cwd: ROOT, encoding: "utf8" });
  const bad = (r.stdout + r.stderr).split("\n").filter((l) => /error|Error/.test(l) && !/clawd|placeholder/.test(l));
  console.log(`s${id}: ${(S.end - S.start).toFixed(1)}s ${bad.length ? "ERRORS: " + bad.join(" | ") : "ok"}`);
}
