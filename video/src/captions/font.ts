import { loadFont } from "@remotion/google-fonts/Inter";
import { continueRender, delayRender } from "remotion";

/** The subset that ships Vietnamese diacritic glyphs (ơ, ệ, ữ...) — `latin`/`latin-ext` alone do
 * not cover them (../../.claude/rules/video.md's Captions rule). Every call MUST include it or
 * Vietnamese diacritics will not render. **This subset alone is NOT enough**: Google Fonts scopes
 * each subset file by a CSS `unicode-range`, and "vietnamese" does not cover plain ASCII —
 * `tiktok-captions.tsx` MUST also request `"latin"` alongside this one, or every plain letter
 * (C, n, g, s...) silently falls back to the browser's default serif while only the diacritic
 * letters use the loaded font. Found 2026-09-18: EVERY real render since task 008 had this
 * exact per-character font mix, invisible unless you zoom into a real rendered frame and check
 * plain-ASCII letterforms specifically (checking only the diacritics, as earlier verification
 * passes did, hides it completely). */
const REQUIRED_SUBSET = "vietnamese";

// TRIED Montserrat as a replacement (2026-09-18) after user feedback that captions kept looking
// "bể". REVERTED THE SAME DAY: a real render of the word "cửa" (c + ử + a) came back as "c??a" —
// Montserrat's `vietnamese` subset in this @remotion/google-fonts version is missing the
// horn+hook-above combination glyph (ử), a genuine tofu/missing-glyph bug, not a stroke/rendering
// nit. Do not re-attempt Montserrat without first checking its glyph coverage for every
// Vietnamese diacritic combination in an actual rendered frame, not just a visual read.
//
// THEN tried Inter as an SF-Pro-like alternative (2026-09-18, user asked for an Apple-style
// font — SF Pro itself is not a Google Font and cannot be embedded here). Investigating why Inter
// (and, in hindsight, Be Vietnam Pro before it) still looked serif in real renders is what
// surfaced the missing-"latin"-subset bug documented on `REQUIRED_SUBSET` above; that was the
// real, long-standing cause of every prior "bể font" complaint, not the font family choice
// itself. Keeping Inter now that the real bug is fixed.
const ALLOWED_WEIGHTS = ["700", "800"] as const;
export type CaptionFontWeight = (typeof ALLOWED_WEIGHTS)[number];

const ALLOWED_SUBSETS = ["vietnamese", "latin", "latin-ext"] as const;
export type CaptionFontSubset = (typeof ALLOWED_SUBSETS)[number];

export interface LoadCaptionFontOptions {
  weight?: CaptionFontWeight;
  subsets?: readonly CaptionFontSubset[];
}

export interface LoadCaptionFontResult {
  fontFamily: string;
}

// Options come from a caller-chosen preset (CLAUDE.md's "sau này dễ đổi theo preset"), so they
// are validated at runtime rather than trusted purely from the TypeScript type. Keyed by a stable
// string derived from the options so a second call with the SAME options reuses the cached
// result instead of registering a second `delayRender` handle for a font that is already loading
// (or already loaded) — a duplicate handle would just be redundant work, but worse, a duplicate
// `waitUntilDone()` promise chain competing with the first is exactly the kind of double-await
// bug this task is fixing loadFont's OWN missing await for.
const fontCache = new Map<string, LoadCaptionFontResult>();

function cacheKey(weight: CaptionFontWeight, subsets: readonly CaptionFontSubset[]): string {
  return `${weight}:${[...subsets].sort().join(",")}`;
}

/** Loads the caption font (Be Vietnam Pro, per video.md) and blocks Remotion's SSR render until
 * the font is actually ready, via `delayRender()`/`continueRender()` — the bug this task fixes is
 * `tiktok-captions.tsx` calling `loadFont()` and discarding its `waitUntilDone()` promise, so SSR
 * could render a frame before the font finished loading and draw Vietnamese diacritics wrong.
 * Cached per (weight, subsets) combination so a re-render (e.g. a second scene reusing the same
 * font) does not delay the render a second time for an already-loaded font. */
export function loadCaptionFont(options: LoadCaptionFontOptions = {}): LoadCaptionFontResult {
  const weight = options.weight ?? "700";
  const subsets = options.subsets ?? [REQUIRED_SUBSET];

  if (!ALLOWED_WEIGHTS.includes(weight)) {
    throw new Error(`loadCaptionFont: unsupported font weight "${weight}"`);
  }
  if (subsets.some((subset) => !ALLOWED_SUBSETS.includes(subset))) {
    throw new Error(`loadCaptionFont: unsupported font subset in [${subsets.join(", ")}]`);
  }
  if (!subsets.includes(REQUIRED_SUBSET)) {
    throw new Error(
      `loadCaptionFont: subsets must include "${REQUIRED_SUBSET}" or Vietnamese diacritics will not render`,
    );
  }

  const key = cacheKey(weight, subsets);
  const cached = fontCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const { fontFamily, waitUntilDone } = loadFont("normal", {
    weights: [weight],
    subsets: [...subsets],
  });
  const result: LoadCaptionFontResult = { fontFamily };
  fontCache.set(key, result);

  const handle = delayRender(`loading caption font ${fontFamily} (${weight})`);
  // `waitUntilDone()` rejecting (a blocked/missing font file) must still unblock the render
  // rather than hang the whole SSR render forever — `.finally` runs `continueRender` on either
  // outcome, and the `.catch` after it only exists to prevent an unhandled rejection now that the
  // promise IS awaited (this task's whole point), not to hide a real failure: video/ has no
  // logger of its own (video.md: pure composition + timing math, no IO), so there is nothing
  // this module could log to that the render's own error surface doesn't already show.
  waitUntilDone()
    .finally(() => {
      continueRender(handle);
    })
    .catch(() => undefined);

  return result;
}
