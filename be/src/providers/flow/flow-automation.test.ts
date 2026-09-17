import { createServer, type Server } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AppError } from "../../domain/app-error.ts";
import {
  configureAspectRatioAndBatch,
  ensureAgentModeOff,
  ensureLoggedIn,
  submitAndWaitForImage,
  typeIntoPromptBox,
} from "./flow-automation.ts";

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/flow-page.fixture.html",
);
const SHORT_TIMEOUT_MS = 500;

/**
 * EP/BVA matrix, `flow-automation.ts`'s exported steps, against the hand-authored fixture
 * reproducing the live-verified Flow DOM (../../.claude/rules/flow-automation.md).
 *
 * | Scenario                                            | Expected                                        |
 * | ----------------------------------------------------- | -------------------------------------------------- |
 * | logged-in fixture                                        | `ensureLoggedIn` resolves                       |
 * | `flow-prompt-box` removed (not logged in)                  | `ensureLoggedIn` throws needs_user           |
 * | agent chip `aria-pressed="true"`                             | `ensureAgentModeOff` clicks it to false      |
 * | agent chip already `aria-pressed="false"`                      | `ensureAgentModeOff` is a no-op            |
 * | aspectRatio "9:16" / "16:9" (both EP classes)                    | `configureAspectRatioAndBatch` selects the matching toggle + x1, closes the overlay |
 * | type a non-empty prompt                                           | editor gets focus + text, send button enables |
 * | submit with text                                                     | pending tile then <img>, returns src/uuid/size |
 * | submit target never resolves (generate button stays disabled)          | throws within the short test budget         |
 */
describe("flow-automation against the Flow fixture", () => {
  let browser: Browser;
  let page: Page;
  let fixtureHtml: string;

  beforeAll(async () => {
    fixtureHtml = await fs.readFile(FIXTURE_PATH, "utf-8");
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  afterEach(async () => {
    await page.close();
  });

  async function loadFixture(mutate?: (page: Page) => Promise<void>): Promise<void> {
    page = await browser.newPage();
    await page.setContent(fixtureHtml);
    if (mutate) {
      await mutate(page);
    }
  }

  it("ensureLoggedIn resolves when the prompt box is present", async () => {
    await loadFixture();
    await expect(ensureLoggedIn(page, SHORT_TIMEOUT_MS)).resolves.toBeUndefined();
  });

  it("ensureLoggedIn throws a needs_user AppError when the prompt box never appears", async () => {
    await loadFixture(async (p) => {
      await p.evaluate(() => document.querySelector("flow-prompt-box")?.remove());
    });
    await expect(ensureLoggedIn(page, SHORT_TIMEOUT_MS)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "FLOW_NOT_LOGGED_IN" &&
        error.errorKind === "needs_user",
    );
  });

  it("clicks the agent-mode chip off when it starts pressed", async () => {
    await loadFixture(async (p) => {
      await p.locator("button.agent-mode-chip").evaluate((el) => {
        el.setAttribute("aria-pressed", "true");
      });
    });
    await ensureAgentModeOff(page);
    const pressed = await page.locator("button.agent-mode-chip").getAttribute("aria-pressed");
    expect(pressed).toBe("false");
  });

  it("leaves the agent-mode chip alone when it is already off", async () => {
    await loadFixture();
    await ensureAgentModeOff(page);
    const pressed = await page.locator("button.agent-mode-chip").getAttribute("aria-pressed");
    expect(pressed).toBe("false");
  });

  it.each([
    ["9:16", "crop_9_16"],
    ["16:9", "crop_16_9"],
  ] as const)(
    "selects the %s ratio toggle and the x1 batch toggle, then closes the overlay",
    async (aspectRatio, iconName) => {
      await loadFixture();
      await configureAspectRatioAndBatch(page, aspectRatio);
      const ratioClass = await page
        .locator("mat-button-toggle", { hasText: iconName })
        .evaluate((el: HTMLElement) => el.className);
      const batchClass = await page
        .locator("mat-button-toggle", { hasText: /^x1$/ })
        .evaluate((el: HTMLElement) => el.className);
      const overlayHidden = await page.locator("#settings-overlay").isHidden();
      expect(ratioClass).toMatch(/selected/);
      expect(batchClass).toMatch(/selected/);
      expect(overlayHidden).toBe(true);
    },
  );

  it("types into the focused editor and enables the send button", async () => {
    await loadFixture();
    expect(await page.locator("button.generate-icon-button").isDisabled()).toBe(true);
    await typeIntoPromptBox(page, "a sunny beach at golden hour");
    expect(await page.locator(".ProseMirror").textContent()).toBe("a sunny beach at golden hour");
    expect(await page.locator("button.generate-icon-button").isEnabled()).toBe(true);
  });

  it("submits and waits for the generated image, returning its src/uuid/dimensions", async () => {
    await loadFixture();
    await typeIntoPromptBox(page, "a quiet evening");
    const result = await submitAndWaitForImage(page, 5_000);
    expect(result.uuid).toMatch(/^123e4567-e89b-12d3-a456-\d{12}$/);
    expect(result.width).toBe(1376);
    expect(result.height).toBe(768);
    expect(result.src).toContain(result.uuid);
  });

  it("throws when the generate button never becomes enabled (empty prompt)", async () => {
    await loadFixture();
    await expect(submitAndWaitForImage(page, SHORT_TIMEOUT_MS)).rejects.toThrow();
  });

  it("picks the NEW image on a second submit, not a prior scene's stale tile (task 005 regression)", async () => {
    await loadFixture();
    await typeIntoPromptBox(page, "scene one prompt");
    const first = await submitAndWaitForImage(page, 5_000);

    await typeIntoPromptBox(page, "scene two prompt");
    const second = await submitAndWaitForImage(page, 5_000);

    expect(second.uuid).not.toBe(first.uuid);
    // typeIntoPromptBox's select-all + delete must also have replaced the text, not appended.
    expect(await page.locator(".ProseMirror").textContent()).toBe("scene two prompt");
    const tileCount = await page.locator("flow-image-tile").count();
    expect(tileCount).toBe(2); // the stale tile from scene one is still in the DOM
  });
});

/**
 * Regression test for the "0x0 before decode finishes" bug (../../.claude/rules
 * /flow-automation.md's "Stale-image guard"): unlike the shared fixture above (which fakes
 * `naturalWidth`/`naturalHeight`/`complete` instantly, so it can't exercise this path), this
 * page serves a REAL PNG over a REAL slow HTTP response, so the `<img>` genuinely attaches to
 * the DOM well before the browser finishes decoding it.
 */
describe("submitAndWaitForImage waits for the image to actually finish decoding", () => {
  let server: Server;
  let pngBuffer: Buffer;
  let imageUrl: string;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    pngBuffer = await fs.readFile(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../../render/fixtures/sample-1.png"),
    );
    server = createServer((_req, res) => {
      res.writeHead(200, {
        "content-type": "image/png",
        "content-length": String(pngBuffer.length),
      });
      // Headers (and the DOM attach that follows) happen immediately; the body — and therefore
      // decode completion — is delayed, opening a real window where naturalWidth/height is 0.
      setTimeout(() => res.end(pngBuffer), 800);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected a TCP address");
    }
    imageUrl = `http://127.0.0.1:${String(address.port)}/image/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`;
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  afterEach(async () => {
    await page.close();
  });

  it("returns the real decoded dimensions, not 0x0, even though the tile attaches instantly", async () => {
    page = await browser.newPage();
    await page.setContent(`
      <button class="generate-icon-button" type="button"></button>
      <div id="tiles"></div>
      <script>
        document.querySelector(".generate-icon-button").addEventListener("click", () => {
          const tile = document.createElement("flow-image-tile");
          const img = document.createElement("img");
          img.src = ${JSON.stringify(imageUrl)};
          tile.appendChild(img);
          document.getElementById("tiles").appendChild(tile);
        });
      </script>
    `);

    const startedAt = Date.now();
    const result = await submitAndWaitForImage(page, 10_000);
    const elapsedMs = Date.now() - startedAt;

    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    // Proves it genuinely WAITED for the slow response instead of reading 0x0 immediately.
    expect(elapsedMs).toBeGreaterThanOrEqual(750);
  });
});
