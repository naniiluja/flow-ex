import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { createProjectStore } from "../store/project-store.ts";

/**
 * Contract-level EP/BVA matrix for GET /api/samples/:filename.
 *
 * | filename (class)          | Expected                                                    |
 * | -------------------------- | ------------------------------------------------------------ |
 * | existing sample image       | 200, Access-Control-Allow-Origin: *, non-empty PNG body      |
 * | existing sample audio       | 200, Access-Control-Allow-Origin: *, non-empty WAV body      |
 * | missing filename             | 404                                                           |
 */
describe("GET /api/samples/*", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-assets-"));
    app = buildApp({ store: createProjectStore(root) });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("serves an existing sample image with a permissive CORS header", async () => {
    const response = await app.inject({ method: "GET", url: "/api/samples/sample-1.png" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.rawPayload.length).toBeGreaterThan(0);
  });

  it("serves an existing sample audio file with a permissive CORS header", async () => {
    const response = await app.inject({ method: "GET", url: "/api/samples/sample-1.wav" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.rawPayload.length).toBeGreaterThan(0);
  });

  it("returns 404 for a filename that does not exist", async () => {
    const response = await app.inject({ method: "GET", url: "/api/samples/does-not-exist.png" });
    expect(response.statusCode).toBe(404);
  });
});
