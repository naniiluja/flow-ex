import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appendNdjsonLine } from "./ndjson-file.ts";

/**
 * EP/BVA matrix for `appendNdjsonLine(filePath, entry)`.
 *
 * | filePath's directory | prior calls | Expected                                          |
 * | ----------------------- | ------------- | ---------------------------------------------------- |
 * | does not exist yet        | 0 (first call) | creates the directory, writes one JSON line + "\n"  |
 * | already exists             | 1 (second call) | APPENDS a second line, first line untouched         |
 */
describe("appendNdjsonLine", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-ndjson-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("creates a missing directory and writes one JSON line", async () => {
    const filePath = path.join(root, "nested", "logs", "run-1.ndjson");

    await appendNdjsonLine(filePath, { msg: "first" });

    const contents = await fs.readFile(filePath, "utf8");
    expect(contents).toBe(`${JSON.stringify({ msg: "first" })}\n`);
  });

  it("appends a second line without disturbing the first", async () => {
    const filePath = path.join(root, "run-1.ndjson");
    await appendNdjsonLine(filePath, { msg: "first" });

    await appendNdjsonLine(filePath, { msg: "second" });

    const lines = (await fs.readFile(filePath, "utf8")).trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? "")).toEqual({ msg: "first" });
    expect(JSON.parse(lines[1] ?? "")).toEqual({ msg: "second" });
  });
});
