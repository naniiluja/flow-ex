import { interpolate } from "remotion";

/**
 * A logo/watermark bounding box, normalized to the source image (0..1 on both axes).
 */
export interface LogoBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface SafeViewport {
  /** Fraction of the SOURCE IMAGE visible at zoom=1 (an `object-fit: cover` crop matching the
   * frame's aspect ratio), on each axis. */
  coverWidthFrac: number;
  coverHeightFrac: number;
  /** Minimum zoom (>=1) needed so the visible window can be positioned clear of the logo box. */
  minZoom: number;
  /** The axis Ken Burns keeps within a safe range on, to stay clear of the logo box; the other
   * axis is free to be centered without ever risking the logo. */
  constrainedAxis: "x" | "y";
  /** The clear-of-the-logo range (normalized 0..1) on the constrained axis. The window is
   * centered inside it at every zoom level: at `minZoom` the window fills the whole range (no
   * room to move), and as zoom increases past `minZoom` the shrinking window has room to sit
   * anywhere inside `[safeRegionMin, safeRegionMax]` and still stay clear of the logo — an
   * earlier version pinned the window to `safeRegionMin` for the WHOLE motion, which is safe but
   * wastes the rest of that room (e.g. only ever showing the leftmost 31% of a wide image). */
  safeRegionMin: number;
  safeRegionMax: number;
}

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Measured live (task 005, 2026-09-17) from a real Flow-generated image, 16:9, native
 * 1376x768: the Gemini sparkle watermark's diamond + comet-tail sits inside the bottom-right
 * corner, roughly x:[996,1311] y:[653,688]px — this box (x:0.66, y:0.74, covering the remaining
 * 34%x26%) adds a comfortable safety margin around that measured extent rather than a tight
 * pixel-exact crop, since erring generous costs a little extra Ken Burns zoom but erring tight
 * risks a future Flow render nudging the watermark a few pixels outside a razor-thin box.
 * **Still assumed for 9:16** (no real 9:16 image measured yet) — reused here as the working
 * default until a 9:16 image is measured the same way; update this doc comment when it is. */
export const ASSUMED_LOGO_BOX: LogoBox = {
  x: 0.66,
  y: 0.74,
  width: 0.34,
  height: 0.26,
};

/** How much extra the Ken Burns zoom-in adds on top of the minimum safe zoom, over the scene's
 * full duration — a modest, always-safe amount since a higher zoom only shrinks the window. */
const KEN_BURNS_ZOOM_FACTOR = 1.15;

/**
 * Computes the `object-fit: cover` crop of `imageSize` into `frameSize` (the fraction of the
 * image visible on each axis at zoom=1, with no distortion), then finds the minimum extra zoom
 * needed so that window can be positioned on some side of the logo box without overlapping it.
 */
export function computeSafeViewport(imageSize: Size, frameSize: Size, logo: LogoBox): SafeViewport {
  const imageAspect = imageSize.width / imageSize.height;
  const frameAspect = frameSize.width / frameSize.height;

  const coverWidthFrac = imageAspect > frameAspect ? frameAspect / imageAspect : 1;
  const coverHeightFrac = imageAspect > frameAspect ? 1 : imageAspect / frameAspect;

  const candidates: {
    axis: "x" | "y";
    min: number;
    max: number;
    coverDim: number;
  }[] = [
    { axis: "x", min: 0, max: logo.x, coverDim: coverWidthFrac },
    { axis: "x", min: logo.x + logo.width, max: 1, coverDim: coverWidthFrac },
    { axis: "y", min: 0, max: logo.y, coverDim: coverHeightFrac },
    { axis: "y", min: logo.y + logo.height, max: 1, coverDim: coverHeightFrac },
  ];

  let best: { axis: "x" | "y"; min: number; max: number; requiredZoom: number } | null = null;
  for (const candidate of candidates) {
    const space = candidate.max - candidate.min;
    if (space <= 0) {
      continue;
    }
    // The window on this axis (coverDim / zoom) must fit inside the clear space. A tiny relative
    // margin keeps the window strictly smaller than the space even after the floating-point
    // round-trip through division below — without it, a window computed to land EXACTLY on the
    // boundary can come out a hair larger than the space and read as overlapping the logo.
    const requiredZoom = Math.max(1, (candidate.coverDim / space) * (1 + 1e-9));
    if (best === null || requiredZoom < best.requiredZoom) {
      best = { axis: candidate.axis, min: candidate.min, max: candidate.max, requiredZoom };
    }
  }

  if (best === null) {
    throw new Error(
      "safe-viewport: the logo box leaves no clear side to keep the viewport window out of it",
    );
  }

  return {
    coverWidthFrac,
    coverHeightFrac,
    minZoom: best.requiredZoom,
    constrainedAxis: best.axis,
    safeRegionMin: best.min,
    safeRegionMax: best.max,
  };
}

/**
 * The visible viewport window at a given Ken Burns progress (0..1), normalized to the source
 * image. Zoom eases from `minZoom` to `minZoom * KEN_BURNS_ZOOM_FACTOR` via `interpolate` with
 * `extrapolateLeft/Right: 'clamp'` (video.md). The constrained axis is CENTERED inside
 * `[safeRegionMin, safeRegionMax]` (at `minZoom` this has no room to move; as zoom increases the
 * window shrinks and gains room, drifting toward the center of the safe region — extra Ken Burns
 * motion for free, always still clear of the logo since the window never exceeds that range).
 * The free axis is centered on the frame.
 */
export function kenBurnsViewport(safe: SafeViewport, progress: number): ViewportRect {
  const zoom = interpolate(progress, [0, 1], [safe.minZoom, safe.minZoom * KEN_BURNS_ZOOM_FACTOR], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const width = safe.coverWidthFrac / zoom;
  const height = safe.coverHeightFrac / zoom;

  const constrainedDim = safe.constrainedAxis === "x" ? width : height;
  const safeRegionSize = safe.safeRegionMax - safe.safeRegionMin;
  const constrainedPos = safe.safeRegionMin + Math.max(0, safeRegionSize - constrainedDim) / 2;

  if (safe.constrainedAxis === "x") {
    return { x: constrainedPos, y: (1 - height) / 2, width, height };
  }

  return { x: (1 - width) / 2, y: constrainedPos, width, height };
}
