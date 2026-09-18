#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import type { Page } from "playwright";

import { loadEnv } from "../../env.ts";
import { connectToFlowChrome } from "./chrome-connection.ts";

const CHECK_TIMEOUT_MS = 5_000;

interface SelectorSpec {
  name: string;
  selector: string;
}

// The image-tile selector (`flow-image-tile img`, ../../.claude/rules/flow-automation.md) is
// deliberately NOT checked here: it structurally does not exist until a prompt is actually
// submitted, so it can't be "preflighted" without spending a generation. It's covered instead by
// `flow-automation.test.ts`'s fixture and by a real smoke run.
const SELECTORS_TO_CHECK: readonly SelectorSpec[] = [
  { name: "prompt editor", selector: ".ProseMirror" },
  { name: "agent mode chip", selector: "button.agent-mode-chip[aria-pressed]" },
  { name: "generate button", selector: "button.generate-icon-button" },
  // NOTE: this element genuinely renders `hidden` while agent mode is ON (attached, so
  // preflight still reports it "found" — `waitFor({state: "attached"})`, not "visible") and
  // only becomes clickable once `ensureAgentModeOff` has actually turned agent mode off. A
  // preflight PASS here is not proof the real click will succeed; see flow-automation.md.
  { name: "settings trigger", selector: "button.settings-trigger-button" },
];

export interface SelectorCheckResult extends SelectorSpec {
  found: boolean;
}

/** Locates every selector `flow-image-provider.ts` depends on WITHOUT submitting a prompt, so a
 * Flow UI change can be caught before a real run spends time/credit on it
 * (../../.claude/rules/flow-automation.md: "run the preflight selector check before trusting this
 * file"). Read-only: never clicks or types into the page. */
export async function checkFlowSelectors(
  page: Page,
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<SelectorCheckResult[]> {
  const results: SelectorCheckResult[] = [];
  for (const spec of SELECTORS_TO_CHECK) {
    const found = await page
      .locator(spec.selector)
      .first()
      .waitFor({ state: "attached", timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
    results.push({ ...spec, found });
  }
  return results;
}

async function runCli(): Promise<void> {
  const env = loadEnv();
  const browser = await connectToFlowChrome({
    userDataDir: env.CHROME_USER_DATA_DIR,
    cdpPort: env.CHROME_CDP_PORT,
    chromeExecutablePath: env.CHROME_EXECUTABLE_PATH,
  });
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  if (page.url() === "about:blank") {
    await page.goto("https://flow.google.com/");
  }

  const results = await checkFlowSelectors(page);
  for (const result of results) {
    console.log(`${result.found ? "OK  " : "MISS"} ${result.name} (${result.selector})`);
  }
  const missing = results.filter((r) => !r.found);
  if (missing.length > 0) {
    console.error(
      `\npreflight FAILED: ${String(missing.length)} selector(s) missing — either Flow's UI ` +
        "changed, or this Chrome tab is not sitting on an actual open project " +
        "(https://flow.google.com/project/<uuid> — the home/project-list page has no prompt box " +
        "at all, so every selector below would MISS).",
    );
    process.exit(1);
  }
  console.log("\npreflight OK: every selector located.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
