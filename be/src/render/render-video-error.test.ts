import { describe, expect, it, vi } from "vitest";

import type { Logger } from "pino";

// Mocked BEFORE importing render-video.ts so the module under test picks up the fakes — no real
// Chrome/render happens here, this is a fast unit test of the logging + AppError-wrapping logic
// only (the real end-to-end render is covered by render-video.test.ts).
vi.mock("@remotion/bundler", () => ({
  bundle: vi.fn().mockResolvedValue("file:///fake-bundle"),
}));
vi.mock("@remotion/renderer", () => ({
  selectComposition: vi.fn().mockResolvedValue({}),
  renderMedia: vi.fn().mockRejectedValue(new Error("boom: renderer exploded")),
}));

const { renderVideo } = await import("./render-video.ts");
const { AppError } = await import("../domain/app-error.ts");

function makeMockLogger() {
  return { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
}

describe("renderVideo error handling (unit, renderer mocked)", () => {
  it("logs render.media.start then render.media.error, and wraps the failure in AppError", async () => {
    const logger = makeMockLogger();

    await expect(
      renderVideo({
        scenes: [
          {
            imageUrl: "a.png",
            imageWidth: 100,
            imageHeight: 100,
            audioUrl: "a.wav",
            durationMs: 1000,
          },
        ],
        aspectRatio: "16:9",
        outputLocation: "/tmp/does-not-matter.mp4",
        logger: logger as unknown as Logger,
      }),
    ).rejects.toThrow(AppError);

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "render", sceneCount: 1 }),
      "render.media.start",
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "render", sceneCount: 1 }),
      "render.media.error",
    );
    expect(logger.info).not.toHaveBeenCalledWith(expect.anything(), "render.media.success");
  });

  it("never logs (does not throw when logging) if no logger is passed", async () => {
    await expect(
      renderVideo({
        scenes: [
          {
            imageUrl: "a.png",
            imageWidth: 100,
            imageHeight: 100,
            audioUrl: "a.wav",
            durationMs: 1000,
          },
        ],
        aspectRatio: "16:9",
        outputLocation: "/tmp/does-not-matter.mp4",
      }),
    ).rejects.toThrow(AppError);
  });
});
