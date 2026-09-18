import { describe, expect, it } from "vitest";

import {
  ASSUMED_LOGO_BOX,
  computeSafeViewport,
  kenBurnsViewport,
  type LogoBox,
  type Size,
  type ViewportRect,
} from "./safe-viewport.ts";

/** True when a viewport window overlaps a logo box (both normalized to the image). Test-only:
 * production code never needs to ask this, since `computeSafeViewport` guarantees it up front. */
function rectsOverlap(a: ViewportRect, b: LogoBox): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  return a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y;
}

const FRAME_16_9: Size = { width: 1920, height: 1080 };
const FRAME_9_16: Size = { width: 1080, height: 1920 };

/**
 * Contract-level EP/BVA matrix for computeSafeViewport(imageSize, frameSize, logo) +
 * kenBurnsViewport(safe, progress).
 *
 * | image aspect vs frame aspect  | logo position       | progress checked      | Expected            |
 * | ------------------------------ | -------------------- | ---------------------- | -------------------- |
 * | equal (16:9 image, 16:9 frame)  | bottom-right (assumed)| 0, 0.001, 0.5, 0.999, 1| never overlaps logo  |
 * | equal                            | top-left              | 0, 0.5, 1              | never overlaps logo  |
 * | image WIDER than frame (crop X) | bottom-right          | 0, 0.5, 1              | never overlaps, no distortion |
 * | image TALLER than frame (crop Y)| bottom-right          | 0, 0.5, 1              | never overlaps, no distortion |
 * | logo covers whole image         | n/a                   | n/a                    | throws               |
 */
describe("computeSafeViewport + kenBurnsViewport", () => {
  it.each([0, 0.001, 0.5, 0.999, 1])(
    "never overlaps the assumed bottom-right logo box at progress=%s (matching aspect)",
    (progress) => {
      const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, ASSUMED_LOGO_BOX);
      const viewport = kenBurnsViewport(safe, progress);
      expect(rectsOverlap(viewport, ASSUMED_LOGO_BOX)).toBe(false);
    },
  );

  it.each([0, 0.5, 1])("never overlaps a top-left logo box at progress=%s", (progress) => {
    const logo: LogoBox = { x: 0, y: 0, width: 0.2, height: 0.15 };
    const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, logo);
    const viewport = kenBurnsViewport(safe, progress);
    expect(rectsOverlap(viewport, logo)).toBe(false);
  });

  it("zooms in over progress (real motion, not a frozen frame)", () => {
    const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, ASSUMED_LOGO_BOX);
    const start = kenBurnsViewport(safe, 0);
    const end = kenBurnsViewport(safe, 1);
    expect(end.width).toBeLessThan(start.width);
    expect(end.height).toBeLessThan(start.height);
  });

  it.each([0, 0.5, 1])(
    "never overlaps the logo and never distorts when the image is WIDER than the frame (progress=%s)",
    (progress) => {
      // A real Flow image (1376x768, aspect ~1.79) rendered into a 16:9 frame (aspect 1.778):
      // wider, so cover-fit crops the sides slightly.
      const imageSize: Size = { width: 1376, height: 768 };
      const safe = computeSafeViewport(imageSize, FRAME_16_9, ASSUMED_LOGO_BOX);
      const viewport = kenBurnsViewport(safe, progress);
      expect(rectsOverlap(viewport, ASSUMED_LOGO_BOX)).toBe(false);
      // No distortion: the window's aspect ratio (in real image pixels) must equal the frame's.
      const windowAspect =
        (viewport.width * imageSize.width) / (viewport.height * imageSize.height);
      expect(windowAspect).toBeCloseTo(FRAME_16_9.width / FRAME_16_9.height, 5);
    },
  );

  it.each([0, 0.5, 1])(
    "never overlaps the logo and never distorts when the image aspect differs a lot from a 9:16 frame (progress=%s)",
    (progress) => {
      // Same 1376x768 Flow image, but rendered into a 9:16 frame: much taller than the frame,
      // so cover-fit crops the top/bottom heavily.
      const imageSize: Size = { width: 1376, height: 768 };
      const safe = computeSafeViewport(imageSize, FRAME_9_16, ASSUMED_LOGO_BOX);
      const viewport = kenBurnsViewport(safe, progress);
      expect(rectsOverlap(viewport, ASSUMED_LOGO_BOX)).toBe(false);
      const windowAspect =
        (viewport.width * imageSize.width) / (viewport.height * imageSize.height);
      expect(windowAspect).toBeCloseTo(FRAME_9_16.width / FRAME_9_16.height, 5);
    },
  );

  it("keeps the viewport window fully inside the image (no blank edge)", () => {
    const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, ASSUMED_LOGO_BOX);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const viewport = kenBurnsViewport(safe, progress);
      expect(viewport.x).toBeGreaterThanOrEqual(-1e-9);
      expect(viewport.y).toBeGreaterThanOrEqual(-1e-9);
      expect(viewport.x + viewport.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(viewport.y + viewport.height).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("throws when a logo box covering the whole image leaves no clear side", () => {
    const fullFrameLogo: LogoBox = { x: 0, y: 0, width: 1, height: 1 };
    expect(() => computeSafeViewport(FRAME_16_9, FRAME_16_9, fullFrameLogo)).toThrow();
  });

  it("returns a minZoom close to 1 for a tiny logo box (boundary)", () => {
    const tinyLogo: LogoBox = { x: 0.95, y: 0.95, width: 0.05, height: 0.05 };
    const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, tinyLogo);
    expect(safe.minZoom).toBeGreaterThanOrEqual(1);
    expect(safe.minZoom).toBeLessThan(1.1);
    expect(rectsOverlap(kenBurnsViewport(safe, 0), tinyLogo)).toBe(false);
    expect(rectsOverlap(kenBurnsViewport(safe, 1), tinyLogo)).toBe(false);
  });

  it("centers the constrained axis inside the safe region as zoom increases, instead of pinning to one edge", () => {
    // Logo on the right half, so the safe region on x is [0, 0.5] and there is real room to drift
    // into as the window shrinks with zoom (unlike a pinned-to-min-edge implementation, which
    // would keep viewport.x == safeRegionMin at every progress).
    const rightHalfLogo: LogoBox = { x: 0.5, y: 0, width: 0.5, height: 1 };
    const safe = computeSafeViewport(FRAME_16_9, FRAME_16_9, rightHalfLogo);
    expect(safe.constrainedAxis).toBe("x");

    const atMinZoom = kenBurnsViewport(safe, 0);
    const atMaxZoom = kenBurnsViewport(safe, 1);

    // At minZoom the window fills the whole safe region exactly: no room to move yet.
    expect(atMinZoom.x).toBeCloseTo(safe.safeRegionMin, 5);
    expect(atMinZoom.x + atMinZoom.width).toBeCloseTo(safe.safeRegionMax, 5);

    // As zoom increases past minZoom, the window shrinks and, because it stays CENTERED inside
    // the safe region, opens up an equal gap on BOTH edges — a pinned-to-min-edge implementation
    // would instead keep viewport.x == safeRegionMin (gap only on the far edge).
    expect(atMaxZoom.x).toBeGreaterThan(safe.safeRegionMin);
    expect(atMaxZoom.x + atMaxZoom.width).toBeLessThan(safe.safeRegionMax);
    const gapAtStart = atMaxZoom.x - safe.safeRegionMin;
    const gapAtEnd = safe.safeRegionMax - (atMaxZoom.x + atMaxZoom.width);
    expect(gapAtStart).toBeCloseTo(gapAtEnd, 5);
  });
});
