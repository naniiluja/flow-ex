import type { Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import type { CaptionStyleConfig } from "@flow-ex/shared-schemas";

import { groupCaptionsForDisplay } from "./caption-tokenizer.ts";
import { loadCaptionFont, type CaptionFontWeight } from "./font.ts";

// `subsets: ["vietnamese"]` (video.md's Captions rule) is what actually pulls in the diacritic
// glyphs (ơ, ệ, ữ...) — the `latin`/`latin-ext` subsets this font also ships do not cover them.
const HIGHLIGHT_COLOR = "#39e75f";

// Only "700"/"800" are registered with `loadCaptionFont` (font.ts's `ALLOWED_WEIGHTS`); every
// preset in `presets.ts` picks one of these two, so this narrows the preset's plain `number` down
// to the font loader's own literal-union type without duplicating the weight list here.
function toCaptionFontWeight(weight: number): CaptionFontWeight {
  return weight >= 800 ? "800" : "700";
}

export interface TikTokCaptionsProps {
  captions: Caption[];
  /** Task 009: font size/weight/padding/token-combine window, taken from
   * `PRESETS[preset].captionStyle` (`@flow-ex/shared-schemas`) — no longer hard-coded here. */
  captionStyle: CaptionStyleConfig;
}

/** Renders one active TikTok-style caption page at a time, highlighting the word whose
 * `[fromMs, toMs)` window contains the current playback time (../../.claude/rules/video.md's
 * Captions section). Purely a function of `useCurrentFrame()`/`useVideoConfig()` plus its
 * `captions`/`captionStyle` props — no IO, so it renders identically in the Player preview and
 * the SSR render. */
export function TikTokCaptions({
  captions,
  captionStyle,
}: TikTokCaptionsProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // `loadCaptionFont` (unlike a bare `loadFont()` call) registers a `delayRender()` handle and
  // only `continueRender()`s once the font's own `waitUntilDone()` resolves, so SSR can no
  // longer render a frame before the font is actually ready (task 008's fix — the previous code
  // discarded `waitUntilDone` entirely). Weight now follows the active preset's `captionStyle`
  // (task 009) instead of a hard-coded "800".
  const { fontFamily } = loadCaptionFont({
    weight: toCaptionFontWeight(captionStyle.fontWeight),
    subsets: ["vietnamese"],
  });

  // Regroups when `captions` OR the preset's own combine window changes, not on every frame —
  // `useCurrentFrame()` above re-renders this component on every frame, and re-tokenizing the
  // whole scene's captions each time is wasted work for a longer scene.
  const { pages } = useMemo(
    () => groupCaptionsForDisplay(captions, captionStyle.combineTokensWithinMs),
    [captions, captionStyle.combineTokensWithinMs],
  );
  const activePage = pages.find(
    (page) => currentMs >= page.startMs && currentMs < page.startMs + page.durationMs,
  );
  if (activePage === undefined) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: `${String(captionStyle.paddingBottomPercent)}%`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: captionStyle.fontSize,
          fontWeight: captionStyle.fontWeight,
          // Vietnamese double-stacked diacritics (ế, ữ, ệ...) stack a tone mark on top of a
          // vowel modifier; the browser's default ~1.2 line-height clips the topmost mark. 1.35
          // gives it enough vertical room without visibly increasing the gap between caption
          // pages, and is fixed regardless of preset since every preset uses the same font.
          lineHeight: 1.35,
          color: "white",
          textAlign: "center",
          // A thinner 2px stroke (down from 3px) plus a soft multi-layer shadow reads as a
          // rounded outline instead of the harder, more bitmap-like edge a bare thick
          // `WebkitTextStroke` produces around tight diacritic marks.
          WebkitTextStroke: "2px black",
          textShadow: "0 0 6px black, 0 0 3px black, 0 2px 4px black",
          paintOrder: "stroke fill",
          maxWidth: "85%",
        }}
      >
        {activePage.tokens.map((token, index) => {
          const isActive = currentMs >= token.fromMs && currentMs < token.toMs;
          return (
            // `token.text` already carries its own leading space for every token past the
            // page's first (createTikTokStyleCaptions's own convention, verified against its
            // real output) — re-adding one here would double it up.
            <span
              key={`${String(index)}-${token.text}`}
              style={{ color: isActive ? HIGHLIGHT_COLOR : "white" }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
