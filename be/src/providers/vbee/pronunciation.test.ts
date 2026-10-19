import { describe, expect, it } from "vitest";

import { prepareNarration } from "./narration-request.ts";
import { applyPronunciations } from "./pronunciation.ts";

/**
 * Contract matrix for `applyPronunciations` (the text Vbee's Vietnamese voices READ, never the
 * caption text):
 *
 * | input                          | Expected                                     |
 * | ------------------------------ | -------------------------------------------- |
 * | known name                     | Vietnamese phonetic spelling                 |
 * | same name, other casing        | same replacement                             |
 * | multi-word entry + its parts   | the LONGER entry wins ("Funny Valentine")    |
 * | entry embedded in a longer word| untouched ("Spinach", "Standard")            |
 * | entry next to punctuation      | punctuation kept ("D4C,")                    |
 * | plain Vietnamese               | unchanged                                    |
 */
describe("applyPronunciations", () => {
  it.each([
    ["Valentine", "Va len thai"],
    ["valentine", "Va len thai"],
    ["VALENTINE", "Va len thai"],
    ["Funny Valentine", "Fan ni Va len thai"],
    ["D4C", "Đi pho Xi"],
    ["Steel Ball Run", "Xti Bôn Ran"],
    ["Johnny Joestar", "Giô ni Giô xta"],
  ])("rewrites %s", (input, expected) => {
    expect(applyPronunciations(input)).toBe(expected);
  });

  it("keeps surrounding punctuation", () => {
    expect(applyPronunciations("Stand D4C, của Valentine.")).toBe(
      "Xờ ten Đi pho Xi, của Va len thai.",
    );
  });

  it("prefers the longest entry and never re-replaces its own output", () => {
    expect(applyPronunciations("Golden Spin")).toBe("Gôn đần Xờ pin");
    expect(applyPronunciations("Tusk Act 4")).toBe("Tắc Ách pho");
  });

  it("does not touch an entry embedded in a longer word", () => {
    expect(applyPronunciations("Spinach Standard")).toBe("Spinach Standard");
  });

  it("leaves plain Vietnamese untouched", () => {
    const text = "Anh là đao phủ, nghề của anh là lấy đi mạng sống.";
    expect(applyPronunciations(text)).toBe(text);
  });
});

describe("prepareNarration with pronunciations", () => {
  it("applies the lexicon and still finishes a bare fragment as a sentence", () => {
    expect(prepareNarration("  Gyro đấu với Valentine ")).toBe("Gai rô đấu với Va len thai.");
  });
});
