import type { AspectRatio } from "@flow-ex/shared-schemas";
import type { ElementHandle, Page } from "playwright";

import { AppError } from "../../domain/app-error.ts";

// Selectors verified live against a real open https://flow.google.com/project/<uuid> page
// (../../.claude/rules/flow-automation.md); re-run the preflight check (./preflight.ts) if
// Flow's UI has changed.
//
// `.ProseMirror` is intentionally UNSCOPED to any outer tag. Flow swaps the entire wrapping
// custom element based on the agent-mode toggle's OWN state: `flow-creative-agent-prompt-box`
// while agent mode is ON, `flow-prompt-box` once it's OFF — verified live 2026-09-17 by watching
// the SAME editor's ancestor chain change after clicking the agent-mode chip. Scoping this
// selector to either tag name breaks the moment the OTHER state is active; `.ProseMirror` alone
// was confirmed unique on the page in both states, so it is the only stable anchor.
// `agent-mode-chip`/`settings-trigger-button` are unchanged from the 2026-09-16 survey.
const PROMPT_EDITOR_SELECTOR = ".ProseMirror";
const AGENT_MODE_CHIP_SELECTOR = "button.agent-mode-chip";
const SETTINGS_TRIGGER_SELECTOR = "button.settings-trigger-button";
const GENERATE_BUTTON_SELECTOR = "button.generate-icon-button";

const LOGIN_CHECK_TIMEOUT_MS = 5_000;
const IMAGE_GENERATION_TIMEOUT_MS = 180_000; // observed ~25-30s live; 90s timed out on slow Flow mornings (2026-09-19: 2 scenes exhausted 4x90s while tiles appeared late)

const ASPECT_RATIO_ICON: Record<AspectRatio, string> = {
  "16:9": "crop_16_9",
  "9:16": "crop_9_16",
};

// Task 013, verified live 2026-09-17 against a real open project page: the "+" button next to the
// prompt box opens an asset picker (search box + a list of the project's own generated assets)
// whose "Thêm vào câu lệnh" button attaches the selected asset as an inline reference chip in the
// SAME prompt box `typeIntoPromptBox` types into afterward. Bound by class, not `aria-label`, per
// this file's own convention (../../.claude/rules/flow-automation.md).
const ADD_REFERENCE_TRIGGER_SELECTOR = "button.add-menu-trigger";
const ASSET_ITEM_SELECTOR = ".asset-item";
const ADD_TO_PROMPT_BUTTON_SELECTOR = "button.detail-add-to-prompt-btn";

// Task 015 v2, superseding the ORIGINAL task-015 design (see git history / flow-automation.md for
// the retired approach): a real smoke run proved the separate "Nhân vật" (character) creation
// route unreliable in practice — viewport-dependent selectors for its "Xong"/Done control, and a
// rename step that could silently fail to persist the name Flow's own "+" picker later searches
// by (that picker's search box was ALSO verified live to not actually filter its result list at
// all, undermining name-based lookup on its own). Reference images are now generated the exact
// same way as a normal scene image (`typeIntoPromptBox` + `submitImage`/`waitForImageAtTile` on
// the main canvas, no separate route, no rename/save step) and reattached to later scenes by
// UPLOADING the downloaded file directly into the "+" picker (`attachUploadedReferenceImages`
// below) instead of searching for a named asset.
const SIDEBAR_UPLOAD_BUTTON_SELECTOR = "button.sidebar-upload-btn";
const UPLOAD_TIMEOUT_MS = 30_000; // observed live: upload + Flow's own processing settles quickly
// The "Thêm vào câu lệnh" button stays disabled while Flow finishes processing the just-uploaded
// asset (a visible loading spinner in its own preview panel) — under concurrent scenes hammering
// the SAME Flow project, this can genuinely take longer than the 30s upload budget above (a real
// 5-scene/2-reference run hit `Timeout 30000ms exceeded` on this exact click, 2026-09-18). Give
// this specific click its own wider budget rather than reusing `UPLOAD_TIMEOUT_MS`.
const ADD_TO_PROMPT_TIMEOUT_MS = IMAGE_GENERATION_TIMEOUT_MS;

export interface GeneratedImageRef {
  src: string;
  uuid: string;
  width: number;
  height: number;
}

/** Throws `needs_user` if the prompt box never appears within a short budget — the ONLY reliable
 * "not logged in" signal available (../../.claude/rules/flow-automation.md), since a
 * not-logged-in page shows a Google sign-in flow instead. `timeoutMs` is injectable so a test can
 * shrink the wait budget instead of the real 5s default. */
export async function ensureLoggedIn(
  page: Page,
  timeoutMs = LOGIN_CHECK_TIMEOUT_MS,
): Promise<void> {
  const found = await page
    .locator(PROMPT_EDITOR_SELECTOR)
    .first()
    .waitFor({ state: "attached", timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
  if (!found) {
    throw new AppError({
      code: "FLOW_NOT_LOGGED_IN",
      errorKind: "needs_user",
      message:
        "Flow's prompt box never appeared; either the dedicated Chrome profile needs a manual " +
        "Google sign-in, or its Flow tab is not sitting on an actual open project " +
        "(https://flow.google.com/project/<uuid> — the home/project-list page has no prompt box)",
    });
  }
}

/** Agent mode must be OFF to generate an image directly instead of routing through an agent
 * flow (../../.claude/rules/flow-automation.md). */
// Bugfix, 2026-09-17 (real smoke run, task 015): this kept timing out at Playwright's DEFAULT 30s
// action timeout whenever Flow's own client bootstrap was still rendering the chip (observed right
// after a full page (re)load, e.g. the manual refresh Flow itself asks for after its "Không lưu
// được một số nội dung" error banner). The chip does appear, just later than 30s sometimes, so the
// wait budget is explicit and generous here rather than left at the short default.
export async function ensureAgentModeOff(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<void> {
  const chip = page.locator(AGENT_MODE_CHIP_SELECTOR).first();
  await chip.waitFor({ state: "attached", timeout: timeoutMs });
  const pressed = await chip.getAttribute("aria-pressed", { timeout: timeoutMs });
  if (pressed === "true") {
    await chip.click({ timeout: timeoutMs });
  }
}

/** Closes the reference-image picker if a PRIOR attempt left it open. A real 5-scene concurrent
 * run (2026-09-18) hit `configureAspectRatioAndBatch`'s `settingsTrigger.click()` timing out on
 * the very next retry after `attachUploadedReferenceImages` failed mid-loop — the picker overlay
 * from that aborted attempt stayed open and intercepted clicks on `SETTINGS_TRIGGER_SELECTOR`
 * underneath it. `ADD_REFERENCE_TRIGGER_SELECTOR` toggles the picker open/closed on repeat
 * clicks (the same toggle pattern `configureAspectRatioAndBatch` already relies on for its own
 * overlay), so clicking it again closes a leftover picker; a no-op click when nothing is open
 * would just toggle it OPEN, so this only clicks when `ADD_TO_PROMPT_BUTTON_SELECTOR` (visible
 * only while the picker is open) is actually on screen. Call this FIRST in every submit attempt,
 * before `ensureAgentModeOff`/`configureAspectRatioAndBatch`, so every retry starts clean. */
export async function closeReferencePickerIfOpen(page: Page): Promise<void> {
  const isPickerOpen = await page
    .locator(ADD_TO_PROMPT_BUTTON_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  if (isPickerOpen) {
    await page.locator(ADD_REFERENCE_TRIGGER_SELECTOR).first().click();
  }
}

/** Opens the settings overlay, selects the aspect ratio matching `project.json`'s
 * `aspectRatio` and a single-image batch count (x1 — this pipeline consumes exactly one image
 * per scene), then closes the overlay by clicking `SETTINGS_TRIGGER_SELECTOR` again (a toggle
 * click on the same trigger, per its observed live behavior), rather than a blind click at a
 * guessed "empty" page coordinate: flow-automation.md notes Escape does not reliably close the
 * overlay, but a fixed coordinate risks landing on real chrome (the top nav/logo) since the
 * overlay's own footprint shifts with viewport size. Deliberately leaves the MODEL choice
 * untouched: `project.json` carries no per-project model field, so whatever the account's
 * current default is stays in effect (scope decision for this thin slice). */
export async function configureAspectRatioAndBatch(
  page: Page,
  aspectRatio: AspectRatio,
): Promise<void> {
  const settingsTrigger = page.locator(SETTINGS_TRIGGER_SELECTOR).first();
  await settingsTrigger.click();
  const iconName = ASPECT_RATIO_ICON[aspectRatio];
  await page.locator("mat-button-toggle", { hasText: iconName }).first().click();
  await page.locator("mat-button-toggle", { hasText: /^x1$/ }).first().click();
  await settingsTrigger.click();
}

/** Types `prompt` into the ProseMirror editor, asserting focus BEFORE typing — skipping this
 * assertion risks firing the page's own keyboard shortcuts instead of entering text
 * (../../.claude/rules/flow-automation.md's critical gotcha). */
export async function typeIntoPromptBox(page: Page, prompt: string): Promise<void> {
  const editor = page.locator(PROMPT_EDITOR_SELECTOR).first();
  await editor.click();
  await editor.waitFor({ state: "visible" });
  const isFocused = await editor.evaluate((el) => el === document.activeElement);
  if (!isFocused) {
    throw new AppError({
      code: "FLOW_PROMPT_BOX_NOT_FOCUSED",
      errorKind: "transient",
      message: "the Flow prompt editor did not receive focus after clicking it",
    });
  }
  // Clears any leftover text from a prior failed attempt on this SAME retry cycle (the page is
  // reused across `retryWithSchedule` attempts, ../../.claude/rules/error-handling.md) — without
  // this, a retry after a failed submit would append onto the old prompt instead of replacing it.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await editor.pressSequentially(prompt);
}

/** Uploads each of `filePaths` (an already-downloaded reference image on local disk) into Flow's
 * "+" picker and attaches it into the current prompt as an inline reference chip, so the scenes
 * reusing it stay visually consistent with that same character/setting (task 015 v2,
 * ../../.claude/rules/flow-automation.md's reference-image section). Must run BEFORE
 * `typeIntoPromptBox`, since attaching a reference does not itself touch `.ProseMirror`'s own text
 * content — it only inserts the chip; the scene's own narration text is typed afterward.
 * Verified live: clicking `SIDEBAR_UPLOAD_BUTTON_SELECTOR` fires a native file-chooser, intercepted
 * here via Playwright's `filechooser` event (the standard way to drive a native OS file dialog
 * without ever seeing a real `<input type=file>` in the DOM). After upload, the newly-added item
 * is the FIRST entry in the asset grid (Flow's own "Gần đây"/recent sort) — picking `.first()`
 * rather than matching by name/text sidesteps the picker's search box, which was ALSO verified
 * live to not actually filter the rendered list by the typed text at all. */
export async function attachUploadedReferenceImages(
  page: Page,
  filePaths: string[],
  timeoutMs = UPLOAD_TIMEOUT_MS,
): Promise<void> {
  for (const filePath of filePaths) {
    await page.locator(ADD_REFERENCE_TRIGGER_SELECTOR).first().click();
    const fileChooserPromise = page.waitForEvent("filechooser", { timeout: timeoutMs });
    await page.locator(SIDEBAR_UPLOAD_BUTTON_SELECTOR).first().click();
    const chooser = await fileChooserPromise;
    await chooser.setFiles(filePath);
    const newItem = page.locator(ASSET_ITEM_SELECTOR).first();
    await newItem.waitFor({ state: "visible", timeout: timeoutMs });
    await newItem.click();
    const addToPromptButton = page.locator(ADD_TO_PROMPT_BUTTON_SELECTOR).first();
    await addToPromptButton.waitFor({ state: "visible", timeout: ADD_TO_PROMPT_TIMEOUT_MS });
    await addToPromptButton.click({ timeout: ADD_TO_PROMPT_TIMEOUT_MS });
  }
}

function extractUuid(src: string): string | undefined {
  const uuid = new URL(src).pathname.split("/").pop();
  return uuid === undefined || uuid.length === 0 ? undefined : uuid;
}

const TILE_SELECTOR = "flow-image-tile";

export interface PendingSubmission {
  /** A handle PINNED to the exact `flow-image-tile` DOM node this submit just created, per
   * `../../.claude/rules/flow-automation.md`'s "Tile identity" note. **Verified live 2026-09-17
   * (bugfix, after task 014's real-Flow smoke test produced 6 identical images):** a real Flow
   * page PREPENDS a new tile at the FRONT of the list, not append at the end — the opposite of
   * task 014's original assumption. Under prepend semantics, a plain DOM INDEX is not a stable
   * identity: every later submit's own new tile shifts every earlier tile's index up by one, so
   * "the tile at index N" silently drifts to mean a DIFFERENT (older, already-decoded) tile once
   * more submits land in front of it — this is exactly what made every scene download the SAME
   * already-finished image. An `ElementHandle` stays pinned to the same node regardless of how
   * the list reorders around it, so it has no such drift. */
  tileHandle: ElementHandle<HTMLElement | SVGElement>;
}

/** Task 014 (index-based) + bugfix (handle-based, see `PendingSubmission`'s doc). Two concurrent
 * `generateImage` calls sharing one `Page` used to snapshot "existing UUIDs" and race each other
 * for whichever `<img>` appeared first, silently swapping scenes' images; the index-based fix
 * that replaced it then broke the same way under Flow's real prepend order. This function must be
 * called while holding the caller's submit mutex (`./submit-mutex.ts`) — it does the ONE part of
 * a submission that touches shared page state (the click + grabbing the new tile's own handle),
 * cheap enough to identify without any further shared-state reads. The 25-30s decode wait
 * (`waitForImageAtTile`) is deliberately NOT part of this function, so it can run OUTSIDE the
 * mutex — multiple scenes' decode waits proceed in parallel once each has its own tile handle. */
export async function submitImage(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<PendingSubmission> {
  await page.locator(GENERATE_BUTTON_SELECTOR).click({ timeout: timeoutMs });
  // While still holding the submit mutex, the newest tile is deterministically `.first()` — no
  // OTHER submit can have prepended its own tile in front of ours yet, since only one submit runs
  // at a time under the mutex. Grabbing the handle NOW, before releasing the mutex, is what makes
  // this safe: by the time another job's submit runs, this handle is already pinned to our node.
  const newTile = page.locator(TILE_SELECTOR).first();
  await newTile.waitFor({ state: "attached", timeout: timeoutMs });
  // `Locator.elementHandle()` is typed to always resolve (never `null`) once `waitFor("attached")`
  // above has already succeeded — it only rejects if the element vanishes before it can grab one.
  const tileHandle = await newTile.elementHandle();
  return { tileHandle };
}

/** Polls the SPECIFIC tile node behind `tileHandle` (never any other tile, so it can run
 * concurrently with other scenes' own `waitForImageAtTile` calls against the same page without
 * any shared-state race — the handle stays pinned to its node no matter how many more tiles get
 * prepended in front of it) until its `<img>` has finished decoding, mirroring the same "both
 * `complete` AND `naturalWidth/Height` positive" check the original implementation used
 * (../../.claude/rules/flow-automation.md's stale-image guard doc). */
export async function waitForImageAtTile(
  page: Page,
  tileHandle: ElementHandle<HTMLElement | SVGElement>,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<GeneratedImageRef> {
  const deadline = Date.now() + timeoutMs;

  let result: { src: string; width: number; height: number } | undefined;
  while (result === undefined) {
    if (Date.now() > deadline) {
      throw new AppError({
        code: "FLOW_IMAGE_GENERATION_TIMEOUT",
        errorKind: "transient",
        message: `no generated image appeared at the submitted tile within ${String(timeoutMs)}ms`,
      });
    }
    const candidate = await tileHandle.evaluate((tile) => {
      const img = tile.querySelector("img");
      if (img === null) {
        return undefined;
      }
      return {
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        decoded: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
      };
    });
    if (candidate?.decoded === true) {
      result = candidate;
    }
    if (result === undefined) {
      await page.waitForTimeout(500);
    }
  }

  const uuid = extractUuid(result.src);
  if (uuid === undefined) {
    throw new AppError({
      code: "FLOW_IMAGE_URL_UNEXPECTED",
      errorKind: "transient",
      message: "the generated image's src did not contain the expected UUID path segment",
      context: { src: result.src },
    });
  }
  return { src: result.src, uuid, width: result.width, height: result.height };
}

/** Composition of `submitImage` + `waitForImageAtTile` for a SINGLE caller driving a page alone
 * (fixture tests, and any single-scene caller with no concurrency to guard against). A caller
 * running MULTIPLE scenes concurrently on one page must instead call `submitImage` inside its own
 * submit mutex and `waitForImageAtTile` outside it — see `flow-image-provider.ts`. */
export async function submitAndWaitForImage(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<GeneratedImageRef> {
  const { tileHandle } = await submitImage(page, timeoutMs);
  return waitForImageAtTile(page, tileHandle, timeoutMs);
}
