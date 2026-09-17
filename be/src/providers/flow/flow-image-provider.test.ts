import { createServer, type Server } from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AppError } from "../../domain/app-error.ts";
import { connectToFlowChrome } from "./chrome-connection.ts";
import {
  captureErrorArtifacts,
  createFlowImageProvider,
  downloadImage,
  toDomainError,
} from "./flow-image-provider.ts";

vi.mock("./chrome-connection.ts", () => ({ connectToFlowChrome: vi.fn() }));

/**
 * EP/BVA + decision table for `toDomainError`, `downloadImage`, and `captureErrorArtifacts` —
 * the three pure/thin helpers `generateImage` composes (../../.claude/rules/flow-automation.md's
 * "Provider design").
 *
 * `toDomainError`:
 * | input                          | Expected                                             |
 * | --------------------------------- | -------------------------------------------------------- |
 * | already an `AppError`               | returned UNCHANGED (same instance)                    |
 * | a plain `Error`                       | wrapped as `FLOW_AUTOMATION_ERROR` / `transient`    |
 * | a non-Error thrown value (string)       | wrapped, message is `String(value)`               |
 *
 * `downloadImage`:
 * | response                                    | Expected                                    |
 * | ----------------------------------------------- | ----------------------------------------------- |
 * | 200, Content-Type: image/jpeg                     | extension "jpg"                             |
 * | 200, Content-Type: application/octet-stream         | extension falls back to "png"             |
 * | non-2xx status                                        | throws AppError, errorKind "transient" |
 *
 * `captureErrorArtifacts`:
 * | assetsDir                          | Expected                                         |
 * | -------------------------------------- | ----------------------------------------------------- |
 * | valid, page open                         | writes a .png + .html, returns the artifacts dir |
 * | a value that makes path.dirname throw      | resolves to undefined, never throws (best-effort) |
 */
describe("flow-image-provider helpers", () => {
  describe("toDomainError", () => {
    it("returns an AppError unchanged", () => {
      const original = new AppError({
        code: "FLOW_NOT_LOGGED_IN",
        errorKind: "needs_user",
        message: "not logged in",
      });
      expect(toDomainError(original)).toBe(original);
    });

    it("wraps a plain Error as transient", () => {
      const wrapped = toDomainError(new Error("boom"));
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.code).toBe("FLOW_AUTOMATION_ERROR");
      expect(wrapped.errorKind).toBe("transient");
      expect(wrapped.message).toBe("boom");
    });

    it("wraps a non-Error thrown value using String(value)", () => {
      const wrapped = toDomainError("just a string");
      expect(wrapped.message).toBe("just a string");
    });
  });

  describe("downloadImage", () => {
    let server: Server;
    let baseUrl: string;
    let browser: Browser;
    let context: BrowserContext;
    let responseBody: Buffer;
    let responseContentType: string;
    let responseStatus: number;

    beforeAll(async () => {
      server = createServer((_req, res) => {
        res.writeHead(responseStatus, { "content-type": responseContentType });
        res.end(responseBody);
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      if (address === null || typeof address === "string") {
        throw new Error("expected a TCP address");
      }
      baseUrl = `http://127.0.0.1:${String(address.port)}`;
      browser = await chromium.launch();
    });

    afterAll(async () => {
      await browser.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    afterEach(async () => {
      await context.close();
    });

    it("picks the .jpg extension for an image/jpeg response", async () => {
      responseStatus = 200;
      responseContentType = "image/jpeg";
      responseBody = Buffer.from([1, 2, 3]);
      context = await browser.newContext();

      const result = await downloadImage(context, `${baseUrl}/image`);

      expect(result.extension).toBe("jpg");
      expect(result.buffer).toEqual(responseBody);
    });

    it("falls back to png for an unrecognized content type", async () => {
      responseStatus = 200;
      responseContentType = "application/octet-stream";
      responseBody = Buffer.from([4, 5, 6]);
      context = await browser.newContext();

      const result = await downloadImage(context, `${baseUrl}/image`);

      expect(result.extension).toBe("png");
    });

    it("throws a transient AppError on a non-2xx response", async () => {
      responseStatus = 500;
      responseContentType = "text/plain";
      responseBody = Buffer.from("server error");
      context = await browser.newContext();

      await expect(downloadImage(context, `${baseUrl}/image`)).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof AppError &&
          error.code === "FLOW_IMAGE_DOWNLOAD_FAILED" &&
          error.errorKind === "transient",
      );
    });
  });

  describe("captureErrorArtifacts", () => {
    let browser: Browser;
    let page: Page;
    let projectRoot: string;

    beforeAll(async () => {
      browser = await chromium.launch();
    });

    afterAll(async () => {
      await browser.close();
    });

    afterEach(async () => {
      await page.close();
      await fs.rm(projectRoot, { recursive: true, force: true });
    });

    it("writes a screenshot and the page HTML, returning the artifacts dir", async () => {
      projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "flow-artifacts-"));
      page = await browser.newPage();
      await page.setContent("<html><body>fixture</body></html>");
      const assetsDir = path.join(projectRoot, "assets");

      const artifactsDir = await captureErrorArtifacts(page, assetsDir, 2, undefined);
      if (artifactsDir === undefined) throw new Error("expected an artifacts dir");

      expect(artifactsDir).toBe(path.join(projectRoot, "logs", "flow-errors"));
      const files = await fs.readdir(artifactsDir);
      expect(files.some((f) => f.startsWith("002-") && f.endsWith(".png"))).toBe(true);
      expect(files.some((f) => f.startsWith("002-") && f.endsWith(".html"))).toBe(true);
    });

    it("resolves to undefined instead of throwing when assetsDir is unusable", async () => {
      projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "flow-artifacts-"));
      page = await browser.newPage();
      await page.setContent("<html><body>fixture</body></html>");

      // path.dirname requires a string; a caller bug (e.g. an undefined assetsDir) must not
      // itself become the error that surfaces instead of the real failure being handled.
      const artifactsDir = await captureErrorArtifacts(
        page,
        undefined as unknown as string,
        0,
        undefined,
      );

      expect(artifactsDir).toBeUndefined();
    });
  });

  describe("createFlowImageProvider's connection cache (task 005 regression)", () => {
    it("retries connecting on the NEXT call instead of repeating a cached failure forever", async () => {
      const mockConnect = vi.mocked(connectToFlowChrome);
      mockConnect.mockReset();
      mockConnect.mockRejectedValue(
        new AppError({ code: "FLOW_CHROME_SPAWN_FAILED", errorKind: "transient", message: "no" }),
      );

      const provider = createFlowImageProvider({
        userDataDir: "/tmp/does-not-matter",
        cdpPort: 0,
        assetsDir: "/tmp/does-not-matter/assets",
      });

      const first = await provider
        .generateImage("prompt", { projectId: "p1", sceneIndex: 0, aspectRatio: "16:9" })
        .catch((error: unknown) => error);
      const second = await provider
        .generateImage("prompt", { projectId: "p1", sceneIndex: 1, aspectRatio: "16:9" })
        .catch((error: unknown) => error);

      expect(first).toBeInstanceOf(AppError);
      expect(second).toBeInstanceOf(AppError);
      // The point of the fix: a SECOND real attempt was made, not an instant replay of the
      // first rejection (which a naive `connection ??= ...` cache would otherwise do forever).
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });
});
