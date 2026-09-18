import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "../../domain/app-error.ts";
import { createFakeTtsProvider } from "./fake-tts-provider.ts";

/**
 * EP/BVA matrix for `createFakeTtsProvider(options).synthesize(text, context)`.
 *
 * | transientFailuresBeforeSuccess | alwaysFail | call count | Expected                        |
 * | -------------------------------- | ---------- | ---------- | -------------------------------- |
 * | 0 (default)                      | unset      | 1st        | success, real WAV file written    |
 * | 1                                 | unset      | 1st        | throws transient AppError         |
 * | 1                                 | unset      | 2nd        | success                           |
 * | unset                             | set        | any        | always throws the given AppError  |
 */
describe("createFakeTtsProvider", () => {
  let assetsDir: string;

  beforeEach(async () => {
    assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-fake-tts-"));
  });

  afterEach(async () => {
    await fs.rm(assetsDir, { recursive: true, force: true });
  });

  it("writes a real, decodable WAV file and returns a positive durationMs", async () => {
    const provider = createFakeTtsProvider({ assetsDir });
    const result = await provider.synthesize("Xin chao", {
      projectId: "p1",
      sceneIndex: 0,
      voice: "hn_female_ngochuyen_full_48k-fhg",
    });

    expect(result.durationMs).toBeGreaterThan(0);
    const bytes = await fs.readFile(path.join(assetsDir, result.file));
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });

  it("throws a transient AppError for the configured number of calls, then succeeds", async () => {
    const provider = createFakeTtsProvider({ assetsDir, transientFailuresBeforeSuccess: { 0: 1 } });
    const context = { projectId: "p1", sceneIndex: 0, voice: "v" };

    await expect(provider.synthesize("text", context)).rejects.toSatisfy(
      (error: unknown) => error instanceof AppError && error.errorKind === "transient",
    );
    const result = await provider.synthesize("text", context);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("always throws the configured error when alwaysFail is set for that scene", async () => {
    const configuredError = new AppError({
      code: "TTS_NO_CREDIT",
      errorKind: "needs_user",
      message: "out of Vbee credit",
    });
    const provider = createFakeTtsProvider({ assetsDir, alwaysFail: { 0: configuredError } });

    await expect(
      provider.synthesize("text", { projectId: "p1", sceneIndex: 0, voice: "v" }),
    ).rejects.toBe(configuredError);
  });
});
