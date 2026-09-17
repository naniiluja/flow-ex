import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/BeVietnamPro";
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { groupCaptionsForDisplay } from "./caption-tokenizer.ts";

// `subsets: ["vietnamese"]` (video.md's Captions rule) is what actually pulls in the diacritic
// glyphs (ơ, ệ, ữ...) — the `latin`/`latin-ext` subsets this font also ships do not cover them.
const { fontFamily } = loadFont("normal", { weights: ["700"], subsets: ["vietnamese"] });

const HIGHLIGHT_COLOR = "#39e75f";

export interface TikTokCaptionsProps {
  captions: Caption[];
}

/** Renders one active TikTok-style caption page at a time, highlighting the word whose
 * `[fromMs, toMs)` window contains the current playback time (../../.claude/rules/video.md's
 * Captions section). Purely a function of `useCurrentFrame()`/`useVideoConfig()` plus its
 * `captions` prop — no IO, so it renders identically in the Player preview and the SSR render. */
export function TikTokCaptions({ captions }: TikTokCaptionsProps): React.ReactElement | null {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  // Regroups only when `captions` itself changes, not on every frame — `useCurrentFrame()` above
  // re-renders this component on every frame, and re-tokenizing the whole scene's captions each
  // time is wasted work for a longer scene.
  const { pages } = useMemo(() => groupCaptionsForDisplay(captions), [captions]);
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
        paddingBottom: "10%",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: 64,
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          WebkitTextStroke: "3px black",
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
