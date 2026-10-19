import { describe, expect, it } from "vitest";

import { NARRATION_DEFAULTS, resolveNarrationOptions } from "./narration.ts";

/**
 * Contract for the narration defaults the user chose by ear (2026-10-18, `voice-tuning.md`): short
 * sentence and comma pauses so the voice does not sound chopped, and a long paragraph break kept
 * as the dramatic pause.
 *
 * | tts input                     | Expected                                             |
 * | ----------------------------- | ---------------------------------------------------- |
 * | undefined                     | speed 0.95, pauses 0.2 / 0.3 / 0.4 / 1.4             |
 * | { clientPause: { sentenceBreak: 0.1 } } | that one pause wins, the rest stay default |
 * | { speed: 1 }                  | speed 1, pauses stay default                         |
 */
describe("narration defaults", () => {
  it("ships the pauses and speed the user picked by ear", () => {
    expect(NARRATION_DEFAULTS.clientPause).toEqual({
      mediumBreak: 0.2,
      majorBreak: 0.3,
      sentenceBreak: 0.4,
      paragraphBreak: 1.4,
    });
    expect(resolveNarrationOptions("tiktok").speed).toBe(0.95);
  });

  it("an explicit pause wins and the other pauses keep their defaults", () => {
    const options = resolveNarrationOptions("tiktok", { clientPause: { sentenceBreak: 0.1 } });
    expect(options.clientPause?.sentenceBreak).toBe(0.1);
    expect(options.clientPause?.paragraphBreak).toBe(1.4);
  });

  it("an explicit speed wins and leaves the pauses alone", () => {
    const options = resolveNarrationOptions("youtube", { speed: 1 });
    expect(options.speed).toBe(1);
    expect(options.clientPause?.sentenceBreak).toBe(0.4);
  });
});
