import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, type Browser, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { checkFlowSelectors } from "./preflight.ts";

const FIXTURE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/flow-page.fixture.html",
);
const SHORT_TIMEOUT_MS = 500;

/**
 * EP/BVA matrix, `checkFlowSelectors(page)`.
 *
 * | Fixture state                          | Expected                                        |
 * | ----------------------------------------- | --------------------------------------------------- |
 * | logged-in (fixture as-is)                    | every selector reported found                 |
 * | `flow-prompt-box` removed (not logged in)      | every selector reported missing (the whole   |
 * |                                                   input bar is nested inside it — see below) |
 */
describe("checkFlowSelectors", () => {
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

  it("finds every selector on the logged-in fixture", async () => {
    page = await browser.newPage();
    await page.setContent(fixtureHtml);

    const results = await checkFlowSelectors(page, SHORT_TIMEOUT_MS);

    expect(results.every((r) => r.found)).toBe(true);
  });

  it("reports every selector missing when the prompt box (and everything nested in it) is gone", async () => {
    page = await browser.newPage();
    await page.setContent(fixtureHtml);
    await page.evaluate(() => document.querySelector("flow-prompt-box")?.remove());

    const results = await checkFlowSelectors(page, SHORT_TIMEOUT_MS);

    // Removing `flow-prompt-box` removes every element nested inside it too (agent chip,
    // settings trigger, generate button), matching what a real "not logged in" Flow page shows:
    // the whole input bar is gone, not just the editor.
    expect(results.every((r) => !r.found)).toBe(true);
    expect(results.find((r) => r.name === "prompt editor")?.found).toBe(false);
  });
});
