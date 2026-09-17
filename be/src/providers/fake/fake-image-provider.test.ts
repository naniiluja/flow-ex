import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "../../domain/app-error.ts";
import { createFakeImageProvider } from "./fake-image-provider.ts";

/**
 * EP/BVA matrix for `createFakeImageProvider(options).generateImage(prompt, context)`.
 *
 * | transientFailuresBeforeSuccess | alwaysFail | call count | Expected                        |
 * | -------------------------------- | ---------- | ---------- | -------------------------------- |
 * | 0 (default)                      | unset      | 1st        | success, real PNG file written    |
 * | 2                                 | unset      | 1st, 2nd   | throws transient AppError         |
 * | 2                                 | unset      | 3rd        | success                           |
 * | unset                             | set        | any        | always throws the given AppError  |
 */
describe("createFakeImageProvider", () => {
  let assetsDir: string;

  beforeEach(async () => {
    assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-fake-image-"));
  });

  afterEach(async () => {
    await fs.rm(assetsDir, { recursive: true, force: true });
  });

  it("writes a real, decodable PNG file and returns its dimensions", async () => {
    const provider = createFakeImageProvider({ assetsDir });
    const result = await provider.generateImage("a sunny beach", {
      projectId: "p1",
      sceneIndex: 0,
    });

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    const bytes = await fs.readFile(path.join(assetsDir, result.file));
    // PNG magic bytes.
    expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it("throws a transient AppError for the configured number of calls, then succeeds", async () => {
    const provider = createFakeImageProvider({
      assetsDir,
      transientFailuresBeforeSuccess: { 0: 2 },
    });
    const context = { projectId: "p1", sceneIndex: 0 };

    await expect(provider.generateImage("prompt", context)).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "transient",
    );
    await expect(provider.generateImage("prompt", context)).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "transient",
    );
    const result = await provider.generateImage("prompt", context);
    expect(result.width).toBeGreaterThan(0);
  });

  it("tracks failure counts independently per sceneIndex", async () => {
    const provider = createFakeImageProvider({
      assetsDir,
      transientFailuresBeforeSuccess: { 0: 1 },
    });

    await expect(
      provider.generateImage("prompt", { projectId: "p1", sceneIndex: 0 }),
    ).rejects.toThrow();
    // Scene 1 has no configured failures, so it succeeds on the first call even though scene 0
    // just failed once.
    const result = await provider.generateImage("prompt", { projectId: "p1", sceneIndex: 1 });
    expect(result.width).toBeGreaterThan(0);
  });

  it("always throws the configured error when alwaysFail is set for that scene", async () => {
    const configuredError = new AppError({
      code: "IMAGE_NEEDS_LOGIN",
      errorKind: "needs_user",
      message: "not logged in",
    });
    const provider = createFakeImageProvider({ assetsDir, alwaysFail: { 0: configuredError } });

    await expect(provider.generateImage("prompt", { projectId: "p1", sceneIndex: 0 })).rejects.toBe(
      configuredError,
    );
    await expect(provider.generateImage("prompt", { projectId: "p1", sceneIndex: 0 })).rejects.toBe(
      configuredError,
    );
  });
});
