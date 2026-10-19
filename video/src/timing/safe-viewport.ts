import { Easing, interpolate } from "remotion";

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

/** CSS placement, in percent of the frame, that makes `viewport` (a window of the source,
 * normalized 0..1) fill the frame: size the element so the window spans the whole frame on each axis,
 * then shift it so the window's top-left corner lands at the frame's top-left. Each axis uses its
 * OWN fraction; one shared scale for both silently distorts the crop whenever the source aspect
 * differs from the frame's. */
export interface ViewportLayout {
  widthPercent: number;
  heightPercent: number;
  leftPercent: number;
  topPercent: number;
}

export function viewportLayout(viewport: ViewportRect): ViewportLayout {
  const widthPercent = 100 / viewport.width;
  const heightPercent = 100 / viewport.height;
  // `0 - x` rather than `-x`: a window at x = 0 must give 0, not negative zero.
  return {
    widthPercent,
    heightPercent,
    leftPercent: 0 - viewport.x * widthPercent,
    topPercent: 0 - viewport.y * heightPercent,
  };
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
 * full duration — a modest, always-safe amount since a higher zoom only shrinks the window.
 * Lowered from 1.15 to 1.06 (2026-09-18, user feedback: 1.15 read as "phèn", too aggressive/cheap
 * a push-in for a whole scene) — most short-form editors (CapCut, Reels-style templates) use a
 * subtle ~5-8% drift over a clip's full length, not a dramatic zoom. */
const KEN_BURNS_ZOOM_FACTOR = 1.06;

/** Eases the zoom in and out instead of drifting linearly — a constant-rate move over a 7-16
 * second scene is what makes a still image read as a still image. `Easing.ease` is wrapped in an
 * arrow rather than passed by reference because `@typescript-eslint/unbound-method` (correctly)
 * rejects handing a method around detached from its object. */
const KEN_BURNS_EASING = Easing.inOut((value: number) => Easing.ease(value));

/**
 * Computes the `object-fit: cover` crop of `imageSize` into `frameSize` (the fraction of the
 * image visible on each axis at zoom=1, with no distortion), then finds the minimum extra zoom
 * needed so that window can be positioned on some side of the logo box without overlapping it.
 */
export function computeSafeViewport(
  imageSize: Size,
  frameSize: Size,
  logo: LogoBox | null,
): SafeViewport {
  const imageAspect = imageSize.width / imageSize.height;
  const frameAspect = frameSize.width / frameSize.height;

  const coverWidthFrac = imageAspect > frameAspect ? frameAspect / imageAspect : 1;
  const coverHeightFrac = imageAspect > frameAspect ? 1 : imageAspect / frameAspect;

  if (logo === null) {
    return {
      coverWidthFrac,
      coverHeightFrac,
      minZoom: 1,
      constrainedAxis: "x",
      safeRegionMin: 0,
      safeRegionMax: 1,
    };
  }

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

/** Which way this scene's Ken Burns move runs. `main-composition.tsx` alternates them per scene:
 * before task 024 every scene made the identical push-in, which across a 6-10 scene video reads as
 * mechanical. Both directions span the SAME zoom range, so neither is more aggressive than the
 * other — only the sign of the motion changes. */
export type KenBurnsDirection = "in" | "out";

/**
 * The visible viewport window at a given Ken Burns progress (0..1), normalized to the source
 * image. Zoom moves between `minZoom` and `minZoom * KEN_BURNS_ZOOM_FACTOR` via `interpolate` with
 * `extrapolateLeft/Right: 'clamp'` (video.md), eased rather than linear — a linear drift over a
 * 7-16 second scene is exactly what makes a still image look like a still image.
 *
 * Zoom NEVER drops below `minZoom` in either direction, which is what keeps the logo-avoidance
 * guarantee intact: the window only shrinks as zoom rises past `minZoom`.
 *
 * The constrained axis is CENTERED inside `[safeRegionMin, safeRegionMax]` (at `minZoom` this has
 * no room to move; as zoom increases the window shrinks and gains room, drifting toward the center
 * of the safe region — extra Ken Burns motion for free, always still clear of the logo since the
 * window never exceeds that range). The free axis is centered on the frame.
 */
export function kenBurnsViewport(
  safe: SafeViewport,
  progress: number,
  direction: KenBurnsDirection = "in",
): ViewportRect {
  const near = safe.minZoom;
  const far = safe.minZoom * KEN_BURNS_ZOOM_FACTOR;
  const zoom = interpolate(progress, [0, 1], direction === "in" ? [near, far] : [far, near], {
    easing: KEN_BURNS_EASING,
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
