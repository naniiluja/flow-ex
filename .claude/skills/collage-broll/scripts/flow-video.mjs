#!/usr/bin/env node
// Generates one Google Flow video clip per job (Frames mode: a Start image + an End image + a
// prompt) in the dedicated automation Chrome that `be/` already drives, and downloads each clip.
// This SPENDS Flow credits (Omni 1.1 Flash, 720p, x1: 4s = 7, 6s = 10, 8s = 12, 10s = 15), so
// `--max-credits` is mandatory and the run refuses to start when the jobs would exceed it.
//
//   node flow-video.mjs --jobs jobs.json --out-dir clips --max-credits 120 [--dry-run]
//
// jobs.json: [{ "scene": 1, "start": "/abs/start.png", "end": "/abs/end.jpg",
//               "prompt": "...", "duration": 6 }, ...]   (duration: 4 | 6 | 8 | 10, default 6)
//
// Output: <out-dir>/scene-NN.mp4 per job (720p original size, 9:16 unless --aspect 16:9). A clip
// that already exists is skipped, so a failed run can simply be started again.
//
// Facts below were verified live against flow.google.com on 2026-10-16 (see SKILL.md).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));
const { chromium } = await import(pathToFileURL(join(REPO, "be/node_modules/playwright/index.mjs")).href);
// Reused instead of retyping the focus-then-type dance (typing without focus fires Flow's own
// keyboard shortcuts, see be/.claude/rules/flow-automation.md).
const { typeIntoPromptBox } = await import(
  pathToFileURL(join(REPO, "be/src/providers/flow/flow-automation.ts")).href
);

const CREDITS_BY_SECONDS = { 4: 7, 6: 10, 8: 12, 10: 15 };
const DEFAULT_DURATION_SECONDS = 6;
const MODEL_NAME = "Omni 1.1 Flash";
const BATCH_SIZE = 3; // clips submitted before waiting on them, like the image phase's concurrency
const CLIP_TIMEOUT_MS = 8 * 60_000;
const POLL_INTERVAL_MS = 4_000;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--dry-run") args.dryRun = true;
    else args[flag.replace(/^--/, "")] = argv[(index += 1)];
  }
  return args;
}

function fail(message) {
  console.error(`flow-video: ${message}`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.jobs || !args["out-dir"] || !args["max-credits"]) {
  fail("usage: --jobs <jobs.json> --out-dir <dir> --max-credits <n> [--aspect 9:16|16:9] [--dry-run]");
}
const aspect = args.aspect ?? "9:16";
const outDir = resolve(args["out-dir"]);
const maxCredits = Number(args["max-credits"]);
const jobs = JSON.parse(await readFile(resolve(args.jobs), "utf8")).map((job) => ({
  ...job,
  duration: job.duration ?? DEFAULT_DURATION_SECONDS,
  output: join(outDir, `scene-${String(job.scene).padStart(2, "0")}.mp4`),
}));

for (const job of jobs) {
  if (!(job.duration in CREDITS_BY_SECONDS)) fail(`scene ${job.scene}: duration must be 4, 6, 8 or 10`);
  for (const file of [job.start, job.end]) {
    if (!existsSync(file)) fail(`scene ${job.scene}: missing frame file ${file}`);
  }
}
const pending = jobs.filter((job) => !existsSync(job.output));
const plannedCredits = pending.reduce((sum, job) => sum + CREDITS_BY_SECONDS[job.duration], 0);
console.log(`flow-video: ${pending.length}/${jobs.length} clips to generate, ${plannedCredits} credits planned (cap ${maxCredits})`);
if (plannedCredits > maxCredits) fail(`planned ${plannedCredits} credits exceed --max-credits ${maxCredits}`);
if (args.dryRun || pending.length === 0) process.exit(0);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${process.env.CHROME_CDP_PORT ?? "9222"}`);
const page = browser.contexts()[0]?.pages().find((candidate) => /flow\.google\.com\/project\//.test(candidate.url()));
if (!page) fail("no Chrome tab is open on a Flow project (https://flow.google.com/project/<uuid>)");

const toggle = (text) => page.locator(".cdk-overlay-container .mat-button-toggle-button", { hasText: text }).first();

async function closeOverlays() {
  // Clicking the transparent backdrop is the reliable way to dismiss Flow's settings/menus.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await page.locator(".cdk-overlay-backdrop-showing").count()) === 0) return;
    await page.mouse.click(40, 600);
    await page.waitForTimeout(500);
  }
}

/** Puts the prompt bar into Video > Frames with this job's settings and returns the credit cost
 * Flow itself announces for them. */
async function applySettings(duration) {
  await page.locator("button.settings-trigger-button").first().click();
  await page.waitForTimeout(700);
  // Measured: the FIRST click after a fresh CDP connection often does not open the panel (a probe
  // saw 0 toggles, then 11 on the second click), which failed the first job of a run every time.
  if ((await page.locator(".cdk-overlay-container .mat-button-toggle-button").count()) === 0) {
    await page.locator("button.settings-trigger-button").first().click();
    await page.waitForTimeout(900);
  }
  await toggle("Video").click();
  await toggle("Frames").click();
  await toggle(aspect).click();
  await toggle("720p").click();
  await toggle(`${String(duration)}s`).click();
  await toggle("x1").click();
  const modelTrigger = page.locator(".cdk-overlay-container button.mat-mdc-menu-trigger").first();
  if (!(await modelTrigger.innerText()).includes(MODEL_NAME)) {
    await modelTrigger.click();
    await page.locator(".mat-mdc-menu-panel [role=menuitem]", { hasText: MODEL_NAME }).first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  const overlayText = await page.locator(".cdk-overlay-container").innerText();
  const credits = Number(overlayText.match(/will use\s+(\d+)\s+credits/)?.[1]);
  await closeOverlays();
  return credits;
}

const MIME_BY_EXTENSION = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

/** Clears leftover Start/End frames (a failed earlier run can leave one filled) with the prompt
 * bar's own close button. */
async function clearFrames() {
  if ((await page.locator(".frame-trigger flow-image-ingredient-chip").count()) === 0) return;
  await page.locator("flow-ingredient-bar").locator("xpath=..").locator("button", { hasText: /^close$/ }).first().click();
  await page.waitForTimeout(600);
  if ((await page.locator(".frame-trigger button.empty-chip").count()) !== 2) {
    throw new Error("could not clear the Start/End slots");
  }
}

async function fillSlot(index, filePath) {
  const data = await readFile(filePath);
  // Flow names an uploaded asset after its file name, and the picker lists the newest first but
  // already shows older uploads, so "the first item" can be a stale one. A content-hash prefix makes
  // the name unique to these exact bytes, and the picker is then searched for that name.
  const uniqueName = `${createHash("sha1").update(data).digest("hex").slice(0, 8)}-${basename(filePath)}`;
  await page.locator(".frame-trigger").nth(index).locator("button").first().click();
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 20_000 });
  await page.locator("button.sidebar-upload-btn").first().click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: uniqueName,
    mimeType: MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    buffer: data,
  });
  const items = page.locator(".asset-item", { hasText: uniqueName });
  await items.first().waitFor({ state: "visible", timeout: 60_000 });
  // The "Add to prompt" button stays disabled while a freshly uploaded asset is still being processed
  // by Flow, which took minutes for some uploads (10 of 20 jobs of one run, then 5 of 10 again, all
  // failing BEFORE the generate click, so nothing was charged). Every retry uploads the same bytes
  // under the same name, so older copies in the picker are usually finished: when the newest copy is
  // not ready after 40s, try the next one down instead of failing the job.
  const addButton = page.locator("button.detail-add-to-prompt-btn").first();
  let added = false;
  const copies = await items.count();
  for (let copy = 0; copy < Math.max(copies, 1) && !added; copy += 1) {
    await items.nth(copy).click();
    await addButton.waitFor({ state: "visible", timeout: 15_000 });
    try {
      await addButton.click({ timeout: 40_000 });
      added = true;
    } catch {
      console.log(`flow-video: copy ${String(copy + 1)}/${String(copies)} of ${uniqueName} is still processing, trying an older copy`);
    }
  }
  if (!added) throw new Error(`no copy of ${uniqueName} became usable (Flow is still processing the upload)`);
  await page.waitForTimeout(1_500);
  if ((await page.locator(".frame-trigger").nth(index).locator("flow-image-ingredient-chip").count()) !== 1) {
    throw new Error(`slot ${String(index)} did not take ${uniqueName}`);
  }
}

async function submit(job) {
  const credits = await applySettings(job.duration);
  const expected = CREDITS_BY_SECONDS[job.duration];
  if (credits !== expected) {
    throw new Error(`Flow announces ${String(credits)} credits for ${String(job.duration)}s, expected ${String(expected)}; refusing to spend`);
  }
  await clearFrames();
  await fillSlot(0, job.start);
  await fillSlot(1, job.end);
  await typeIntoPromptBox(page, job.prompt);
  const snapshot = await page.evaluate(() => ({
    count: document.querySelectorAll("flow-video-tile").length,
    first: document.querySelector("flow-video-tile")?.innerHTML ?? "",
  }));
  await page.locator("button.generate-icon-button").click();
  // Flow PREPENDS the new tile. A pinned element handle does not survive: Flow swaps the pending
  // tile for the finished one, leaving the handle on a detached node that never reads "done".
  // Tiles are therefore addressed by their position from the top (see `tileAt`).
  // The project's "All media" view virtualizes its grid, so the tile COUNT can stay flat after a real
  // submit (all 12 jobs of one run were generated and charged yet reported failed on a count check);
  // a changed first tile is the signal that works in both views.
  await page.waitForFunction(
    ({ count, first }) =>
      document.querySelectorAll("flow-video-tile").length > count ||
      (document.querySelector("flow-video-tile")?.innerHTML ?? "") !== first,
    snapshot,
    { timeout: 30_000 },
  );
  console.log(`flow-video: scene ${String(job.scene)} submitted (${String(credits)} credits)`);
}

/** The tile of the `position`-th newest video (0 = the one just submitted). Valid while this
 * script is the only thing submitting videos to the project, so newer tiles are only ours. */
const tileAt = (position) => page.locator("flow-video-tile").nth(position);

async function waitUntilDone(job, position) {
  const started = Date.now();
  while (Date.now() - started < CLIP_TIMEOUT_MS) {
    const tile = tileAt(position);
    const pending = (await tile.locator("flow-pending-tile").count()) > 0;
    const ready = (await tile.locator("flow-video-hotbar").count()) > 0;
    if (!pending && ready) return;
    const text = (await tile.innerText()).replace(/\s+/g, " ").slice(0, 120);
    if (!pending && /fail|error|couldn.t|unable|blocked/i.test(text)) {
      throw new Error(`Flow reported a failure for scene ${String(job.scene)}: ${text}`);
    }
    await page.waitForTimeout(POLL_INTERVAL_MS);
  }
  throw new Error(`scene ${String(job.scene)} did not finish within ${String(CLIP_TIMEOUT_MS / 60_000)} minutes`);
}

async function download(job, position) {
  const tile = tileAt(position);
  // One tile of a real run sat below the fold and its menu click timed out until it was scrolled in.
  await tile.scrollIntoViewIfNeeded();
  await tile.hover();
  await page.waitForTimeout(600);
  await tile.locator("button.mat-mdc-menu-trigger").first().click();
  await page.waitForTimeout(600);
  await page.locator(".mat-mdc-menu-panel [role=menuitem]", { hasText: /Download/i }).first().hover();
  await page.waitForTimeout(700);
  // 60s was too tight once: the clip was already generated and charged, then "Downloading your
  // video..." outlasted the wait and the rerun had to pay for the same clip again.
  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 });
  // "Original size" is the generated 720p file; the 1080p/4K entries are upscales.
  await page.locator(".mat-mdc-menu-panel [role=menuitem]", { hasText: /720p/ }).first().click();
  const file = await downloadPromise;
  await file.saveAs(job.output);
  await closeOverlays();
  console.log(`flow-video: scene ${String(job.scene)} saved ${job.output}`);
}

async function captureFailure(job, error) {
  const base = join(outDir, `error-scene-${String(job.scene).padStart(2, "0")}`);
  await page.screenshot({ path: `${base}.png` }).catch(() => undefined);
  writeFileSync(`${base}.txt`, `${String(error)}\n\n${await page.content().catch(() => "")}`);
  console.error(`flow-video: scene ${String(job.scene)} failed: ${String(error)} (artifacts: ${base}.png/.txt)`);
}

const failed = [];
try {
  for (let index = 0; index < pending.length; index += BATCH_SIZE) {
    const batch = pending.slice(index, index + BATCH_SIZE);
    const submitted = [];
    for (const job of batch) {
      try {
        await submit(job);
        submitted.push(job);
      } catch (error) {
        await captureFailure(job, error);
        await closeOverlays();
        failed.push(job.scene);
      }
    }
    for (const [order, job] of submitted.entries()) {
      // Newest first: the last job submitted sits at position 0, the first one at length - 1.
      const position = submitted.length - 1 - order;
      try {
        await waitUntilDone(job, position);
        await download(job, position);
      } catch (error) {
        await captureFailure(job, error);
        await closeOverlays();
        failed.push(job.scene);
      }
    }
  }
} finally {
  // Leave Flow ready for the image pipeline, which expects Image mode.
  await page.locator("button.settings-trigger-button").first().click().catch(() => undefined);
  await page.waitForTimeout(600);
  await toggle("Image").click().catch(() => undefined);
  await closeOverlays();
  await browser.close();
}
if (failed.length > 0) fail(`scenes ${failed.join(", ")} failed; rerun to retry only those`);
console.log("flow-video: all clips generated");
