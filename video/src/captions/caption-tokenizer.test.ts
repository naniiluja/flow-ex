import type { Caption } from "@remotion/captions";
import { describe, expect, it } from "vitest";

import { groupCaptionsForDisplay } from "./caption-tokenizer.ts";

function caption(text: string, startMs: number, endMs: number): Caption {
  return { text, startMs, endMs, timestampMs: Math.round((startMs + endMs) / 2), confidence: 1 };
}

/**
 * Contract-level EP/BVA matrix for `groupCaptionsForDisplay(captions, combineTokensWithinMilliseconds)`.
 * `@remotion/captions` itself always strips the leading space off the FIRST token in the whole
 * array (nothing precedes it), and only splits into a new page once the CURRENT page's own span
 * exceeds the combine window AND the next token's text starts with a space — a real gap in time
 * between two tokens does not by itself force a split (see `createTikTokStyleCaptions`'s own
 * `exceedsDuration` check).
 *
 * | captions (class)                                | combine window | Expected                        |
 * | -------------------------------------------------- | -------------- | -------------------------------- |
 * | [] (empty, no tokens)                              | default         | pages: []                       |
 * | single 1-char token (first, so its space is stripped) | default      | 1 page, text has no leading space |
 * | single very long token (10000 chars, first)        | default         | 1 page, token text length preserved |
 * | 2 tokens whose page span stays within the window   | default (1200)  | 1 page combining both            |
 * | 2 tokens whose page span exceeds the window         | default (1200)  | 2 separate pages                 |
 */
describe("groupCaptionsForDisplay", () => {
  it("returns no pages for an empty captions array (boundary)", () => {
    expect(groupCaptionsForDisplay([])).toEqual({ pages: [] });
  });

  it("strips the leading space off a 1-character FIRST token (library behavior)", () => {
    const { pages } = groupCaptionsForDisplay([caption(" a", 0, 100)]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.tokens[0]?.text).toBe("a");
  });

  it("preserves a very long FIRST token's length, minus its leading space (boundary)", () => {
    const longWord = "a".repeat(10_000);
    const { pages } = groupCaptionsForDisplay([caption(` ${longWord}`, 0, 100)]);
    expect(pages[0]?.tokens[0]?.text).toBe(longWord);
  });

  it("combines two tokens into one page when the page's own span stays within the window", () => {
    const { pages } = groupCaptionsForDisplay(
      [caption("Xin", 0, 300), caption(" chao", 300, 600)],
      1200,
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.tokens).toHaveLength(2);
  });

  it("splits into a new page once the current page's span exceeds the combine window", () => {
    const { pages } = groupCaptionsForDisplay(
      [caption("Xin", 0, 1300), caption(" chao", 1300, 1600)],
      1200,
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]?.tokens.map((t) => t.text)).toEqual(["Xin"]);
    expect(pages[1]?.tokens.map((t) => t.text)).toEqual(["chao"]);
  });

  it("preserves Vietnamese diacritics through every token exactly (task 007 AC)", () => {
    const { pages } = groupCaptionsForDisplay([
      caption("Chào", 0, 300),
      caption(" buổi", 300, 600),
      caption(" sáng", 600, 900),
    ]);
    expect(pages[0]?.tokens.map((t) => t.text)).toEqual(["Chào", " buổi", " sáng"]);
  });
});
