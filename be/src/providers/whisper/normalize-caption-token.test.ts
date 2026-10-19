import { describe, expect, it } from "vitest";

import { normalizeCaptionToken } from "./normalize-caption-token.ts";

/**
 * Contract matrix for `normalizeCaptionToken(token)` — the COMPARISON KEY that decides whether a
 * script word and a whisper token are "the same word" during alignment. It is never displayed;
 * the script's own spelling is what reaches the screen.
 *
 * | Input class                        | Expected                                             |
 * | ---------------------------------- | ---------------------------------------------------- |
 * | leading space (whisper convention) | trimmed away                                          |
 * | tone marks / vowel modifiers       | folded, so a mis-toned hearing still matches          |
 * | `đ` / `Đ`                          | folded to `d` (NFD does NOT decompose it)             |
 * | mixed case                         | lower-cased                                           |
 * | trailing punctuation               | stripped                                              |
 * | pure punctuation token             | empty string (matches nothing by accident)            |
 * | digits                             | kept, so "15" can still anchor against "15"           |
 */
describe("normalizeCaptionToken", () => {
  it("drops the leading space whisper puts on every token but the first", () => {
    expect(normalizeCaptionToken(" không")).toBe("khong");
  });

  it.each([
    ["chìm", "chim"],
    ["trìm", "trim"],
    ["cửa", "cua"],
    ["thuỷ", "thuy"],
    ["Ngọn", "ngon"],
  ])("folds tone marks and case: %s -> %s", (input, expected) => {
    expect(normalizeCaptionToken(input)).toBe(expected);
  });

  it.each([
    ["đi", "di"],
    ["Đèn", "den"],
    ["đủ", "du"],
  ])("folds đ to d, which NFD alone leaves behind: %s -> %s", (input, expected) => {
    expect(normalizeCaptionToken(input)).toBe(expected);
  });

  it("strips punctuation that whisper adds or moves around", () => {
    expect(normalizeCaptionToken("sáng,")).toBe("sang");
    expect(normalizeCaptionToken("“Chờ")).toBe("cho");
    expect(normalizeCaptionToken("tiếp.")).toBe("tiep");
  });

  it("returns an empty key for a token that is nothing but punctuation", () => {
    expect(normalizeCaptionToken(" ,")).toBe("");
    expect(normalizeCaptionToken("—")).toBe("");
  });

  it("keeps digits so a normalized number can still anchor", () => {
    expect(normalizeCaptionToken("15.000")).toBe("15000");
    expect(normalizeCaptionToken("D4C")).toBe("d4c");
  });

  it("returns an empty key for an empty or whitespace-only token", () => {
    expect(normalizeCaptionToken("")).toBe("");
    expect(normalizeCaptionToken("   ")).toBe("");
  });
});
