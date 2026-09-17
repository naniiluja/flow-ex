import type { Caption } from "@remotion/captions";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// This module loads its caption font ONCE at import time (`tiktok-captions.tsx`'s top-level
// `loadCaptionFont(...)` call). The real bug this task fixes (`loadFont()`'s `waitUntilDone`
// promise silently discarded, so SSR could render before the Vietnamese font finished loading)
// is invisible to a test that only reads rendered OUTPUT — it must instead spy on the REAL
// `remotion` module's `delayRender`/`continueRender` and assert they were called as a PAIRED
// handle, which is exactly what a fire-and-forget `loadFont()` call (no `delayRender` at all)
// would fail.
const delayRenderMock = vi.fn<(label?: string) => number>();
const continueRenderMock = vi.fn<(handle: number) => void>();

// `useCurrentFrame`/`useVideoConfig` normally require a real Remotion `<Composition>`/`<Player>`
// context, which this unit test does not mount; stub them to a fixed frame/fps so
// `TikTokCaptions` can be rendered standalone via `react-dom/server` to inspect its styling,
// while keeping every OTHER export (including `AbsoluteFill`) real.
vi.mock("remotion", async () => {
  const actual = await vi.importActual<typeof import("remotion")>("remotion");
  return {
    ...actual,
    delayRender: delayRenderMock,
    continueRender: continueRenderMock,
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({ fps: 30, width: 1080, height: 1920, durationInFrames: 30 }),
  };
});

let waitUntilDoneImpl: () => Promise<undefined> = () => Promise.resolve(undefined);
vi.mock("@remotion/google-fonts/BeVietnamPro", () => ({
  loadFont: () => ({
    fontFamily: "Be Vietnam Pro",
    fonts: {},
    unicodeRanges: {},
    waitUntilDone: waitUntilDoneImpl,
  }),
}));

function caption(text: string, startMs: number, endMs: number): Caption {
  return { text, startMs, endMs, timestampMs: Math.round((startMs + endMs) / 2), confidence: 1 };
}

beforeEach(() => {
  vi.resetModules();
  delayRenderMock.mockReset();
  continueRenderMock.mockReset();
  let handle = 0;
  delayRenderMock.mockImplementation(() => {
    handle += 1;
    return handle;
  });
  waitUntilDoneImpl = () => Promise.resolve(undefined);
});

describe("TikTokCaptions font loading", () => {
  it("delays the render for the font and continues it with the SAME handle once loaded", async () => {
    await import("./tiktok-captions.tsx");

    expect(delayRenderMock).toHaveBeenCalledTimes(1);
    const handle = delayRenderMock.mock.results[0]?.value as number;

    // Flush the microtask queue so font.ts's `waitUntilDone().finally(...)` chain runs.
    await Promise.resolve();
    await Promise.resolve();

    expect(continueRenderMock).toHaveBeenCalledTimes(1);
    expect(continueRenderMock).toHaveBeenCalledWith(handle);
  });

  it("styles the active caption text with the Vietnamese-safe line-height, weight, and stroke", async () => {
    const { TikTokCaptions } = await import("./tiktok-captions.tsx");

    const captions: Caption[] = [caption("Đêm", 0, 300), caption(" ấy", 300, 600)];

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(TikTokCaptions, { captions }),
    );

    expect(html).toContain("Đêm");
    expect(html).toMatch(/line-height:1\.35/);
    expect(html).toMatch(/font-weight:800/);
    expect(html).toMatch(/-webkit-text-stroke:2px black/);
  });
});
