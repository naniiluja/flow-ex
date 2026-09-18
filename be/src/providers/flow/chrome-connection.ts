import { spawn } from "node:child_process";

import { chromium, type Browser } from "playwright";

import { AppError } from "../../domain/app-error.ts";

const DEFAULT_CONNECT_TIMEOUT_MS = 30_000;
const CDP_POLL_INTERVAL_MS = 500;
// Chrome 136+ ignores --remote-debugging-port on the DEFAULT profile (../../.claude/rules
// /flow-automation.md), so this MUST point at a dedicated, non-default --user-data-dir.
const DEFAULT_MAC_CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export interface ChromeConnectionOptions {
  /** Dedicated profile directory (never the user's default Chrome profile — see the module doc
   * comment above); `env.CHROME_USER_DATA_DIR` normally supplies this. */
  userDataDir: string;
  cdpPort: number;
  /** Overrides the Chrome binary path; defaults to the standard macOS install location. */
  chromeExecutablePath?: string;
  /** How long to wait for the CDP endpoint to come up after a fresh launch. */
  connectTimeoutMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isCdpReady(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${String(port)}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

/** Never resolves; rejects if `spawn` itself fails (e.g. a bad `chromeExecutablePath`).
 * `child_process.spawn` reports that failure asynchronously via the child's `'error'` event —
 * an EventEmitter with no `'error'` listener throws it as an UNCAUGHT exception, crashing this
 * whole backend process (../../.claude/rules/error-handling.md's "No silent catch" cuts both
 * ways: an unhandled boundary error must be caught, never left to crash the process either). */
function launchDedicatedChrome(options: ChromeConnectionOptions): Promise<never> {
  return new Promise((_resolve, reject) => {
    const executablePath = options.chromeExecutablePath ?? DEFAULT_MAC_CHROME_PATH;
    const child = spawn(
      executablePath,
      [
        `--remote-debugging-port=${String(options.cdpPort)}`,
        `--user-data-dir=${options.userDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "https://flow.google.com/",
      ],
      { detached: true, stdio: "ignore" },
    );
    child.on("error", (cause) => {
      reject(
        new AppError({
          code: "FLOW_CHROME_SPAWN_FAILED",
          errorKind: "transient",
          message: `failed to launch the dedicated Flow Chrome at "${executablePath}"`,
          cause,
          context: { executablePath },
        }),
      );
    });
    // Detached + unref so this backend process's own lifecycle never waits on (or accidentally
    // kills) the Chrome window the user is meant to keep open and interact with directly.
    child.unref();
  });
}

/** Connects to the dedicated Flow automation Chrome over CDP (../../.claude/rules
 * /flow-automation.md), launching it first if nothing is listening on `cdpPort` yet. Never
 * touches the user's default Chrome profile/session. */
export async function connectToFlowChrome(options: ChromeConnectionOptions): Promise<Browser> {
  const timeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  if (!(await isCdpReady(options.cdpPort))) {
    const spawnFailure = launchDedicatedChrome(options);
    const deadline = Date.now() + timeoutMs;
    let ready = false;
    while (!ready) {
      if (Date.now() > deadline) {
        throw new AppError({
          code: "FLOW_CHROME_LAUNCH_TIMEOUT",
          errorKind: "transient",
          message: `Chrome did not become reachable on CDP port ${String(options.cdpPort)} within ${String(timeoutMs)}ms`,
          context: { cdpPort: options.cdpPort },
        });
      }
      // Races the poll against a spawn failure so a bad executable path fails immediately
      // instead of silently waiting out the whole timeout (spawnFailure never resolves, only
      // rejects — see its own doc comment).
      ready = await Promise.race([isCdpReady(options.cdpPort), spawnFailure]);
      if (!ready) {
        await sleep(CDP_POLL_INTERVAL_MS);
      }
    }
  }
  try {
    return await chromium.connectOverCDP(`http://127.0.0.1:${String(options.cdpPort)}`);
  } catch (cause) {
    throw new AppError({
      code: "FLOW_CHROME_CONNECT_FAILED",
      errorKind: "transient",
      message: "failed to connect to the dedicated Flow Chrome instance over CDP",
      cause,
      context: { cdpPort: options.cdpPort },
    });
  }
}
