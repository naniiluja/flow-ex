import { describe, expect, it } from "vitest";

import type { Caption } from "@remotion/captions";

import { alignCaptionsToNarration } from "./align-captions-to-narration.ts";

function caption(text: string, startMs: number, endMs: number): Caption {
  return { text, startMs, endMs, timestampMs: Math.round((startMs + endMs) / 2), confidence: 0.5 };
}

/**
 * Contract-level matrix for `alignCaptionsToNarration`.
 *
 * | whisper token count vs narration word count | Expected                                    |
 * | -------------------------------------------- | -------------------------------------------- |
 * | equal, whisper misspelled a word             | text replaced with the narration's own word   |
 * | mismatched (whisper split/merged a token)     | returned unchanged (timing kept, no guessing) |
 * | narration has extra whitespace                | still counted correctly, still aligns         |
 * | empty narration                               | returned unchanged                            |
 */
describe("alignCaptionsToNarration", () => {
  it("replaces whisper's misheard word with the original narration word when counts match", () => {
    const whisperCaptions = [caption("Đêm", 0, 300), caption(" ấy", 300, 600)];
    const result = alignCaptionsToNarration(whisperCaptions, "Đâm ấy");

    expect(result.map((c) => c.text)).toEqual(["Đâm", " ấy"]);
    // Timing must be untouched — only text changes.
    expect(result[0]?.startMs).toBe(0);
    expect(result[1]?.endMs).toBe(600);
  });

  it("leaves captions unchanged when whisper's token count does not match the narration's word count", () => {
    const whisperCaptions = [caption("Đêm ấy", 0, 600)]; // whisper merged two words into one token
    const result = alignCaptionsToNarration(whisperCaptions, "Đêm ấy");

    expect(result).toEqual(whisperCaptions);
  });

  it("tolerates extra whitespace in the narration", () => {
    const whisperCaptions = [caption("Đêm", 0, 300), caption(" ấy", 300, 600)];
    const result = alignCaptionsToNarration(whisperCaptions, "  Đêm   ấy  ");

    expect(result.map((c) => c.text)).toEqual(["Đêm", " ấy"]);
  });

  it("returns whisper's captions unchanged for an empty narration", () => {
    const whisperCaptions = [caption("Đêm", 0, 300)];
    const result = alignCaptionsToNarration(whisperCaptions, "");

    expect(result).toEqual(whisperCaptions);
  });
});
