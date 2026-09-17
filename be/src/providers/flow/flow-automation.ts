import type { AspectRatio } from "@flow-ex/shared-schemas";
import type { Page } from "playwright";

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
const GENERATED_IMAGE_SELECTOR = "flow-image-tile img";

const LOGIN_CHECK_TIMEOUT_MS = 5_000;
const IMAGE_GENERATION_TIMEOUT_MS = 90_000; // observed ~25-30s live; wide margin for slow runs

const ASPECT_RATIO_ICON: Record<AspectRatio, string> = {
  "16:9": "crop_16_9",
  "9:16": "crop_9_16",
};

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
export async function ensureAgentModeOff(page: Page): Promise<void> {
  const chip = page.locator(AGENT_MODE_CHIP_SELECTOR).first();
  const pressed = await chip.getAttribute("aria-pressed");
  if (pressed === "true") {
    await chip.click();
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

function extractUuid(src: string): string | undefined {
  const uuid = new URL(src).pathname.split("/").pop();
  return uuid === undefined || uuid.length === 0 ? undefined : uuid;
}

/** `createFlowImageProvider` reuses the SAME `Page` across every scene
 * (../../.claude/rules/flow-automation.md's "connection reuse"), so a PRIOR scene's `<img>` tile
 * is still in the DOM when this scene submits. Snapshotting the UUIDs already present before
 * clicking generate, then waiting for one NOT in that set, is what tells "just generated" apart
 * from "already there" — waiting for merely `flow-image-tile img` to exist would resolve
 * instantly against the stale tile and hand back the WRONG scene's image. */
async function collectExistingImageUuids(page: Page): Promise<Set<string>> {
  const srcs = await page
    .locator(GENERATED_IMAGE_SELECTOR)
    .evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).src));
  const uuids = new Set<string>();
  for (const src of srcs) {
    const uuid = extractUuid(src);
    if (uuid !== undefined) {
      uuids.add(uuid);
    }
  }
  return uuids;
}

/** Submits the prompt (the send button auto-waits to become enabled once the editor has text)
 * and waits for a NEWLY generated `<img>` tile to appear (see `collectExistingImageUuids`'s doc
 * comment for why "new" must be checked explicitly), returning its `src` and the stable image
 * UUID Flow embeds in that URL. `timeoutMs` is injectable so a test can shrink the wait budget
 * instead of the real ~90s default. */
export async function submitAndWaitForImage(
  page: Page,
  timeoutMs = IMAGE_GENERATION_TIMEOUT_MS,
): Promise<GeneratedImageRef> {
  const existingUuids = await collectExistingImageUuids(page);

  // click()'s own {timeout} budget is separate from the polling deadline below; computing the
  // deadline BEFORE the click (not after) keeps the total worst case bounded by `timeoutMs`
  // instead of potentially doubling it (click could legitimately take close to its own timeout).
  const deadline = Date.now() + timeoutMs;
  await page.locator(GENERATE_BUTTON_SELECTOR).click({ timeout: timeoutMs });

  let result: { src: string; width: number; height: number } | undefined;
  while (result === undefined) {
    if (Date.now() > deadline) {
      throw new AppError({
        code: "FLOW_IMAGE_GENERATION_TIMEOUT",
        errorKind: "transient",
        message: `no new generated image appeared within ${String(timeoutMs)}ms`,
      });
    }
    const candidates = await page.locator(GENERATED_IMAGE_SELECTOR).evaluateAll((imgs) =>
      imgs.map((img) => {
        const el = img as HTMLImageElement;
        return {
          src: el.src,
          width: el.naturalWidth,
          height: el.naturalHeight,
          // `complete` alone can be true with naturalWidth still 0 for a broken/not-yet-decoded
          // image; requiring BOTH is what actually proves the browser has finished decoding real
          // pixels, not just that the <img> element exists in the DOM.
          decoded: el.complete && el.naturalWidth > 0 && el.naturalHeight > 0,
        };
      }),
    );
    result = candidates.find((candidate) => {
      const uuid = extractUuid(candidate.src);
      return uuid !== undefined && !existingUuids.has(uuid) && candidate.decoded;
    });
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
