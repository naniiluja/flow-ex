import fs from "node:fs/promises";
import path from "node:path";

/** Appends one JSON object as a single NDJSON line to `filePath`, creating its directory if
 * needed (../../.claude/rules/logging.md: per-run detail lives at
 * `projects/<projectId>/logs/run-<runId>.ndjson`). */
export async function appendNdjsonLine(filePath: string, entry: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}
