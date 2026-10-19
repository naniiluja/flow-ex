import type { Caption } from "@remotion/captions";
import { describe, expect, it } from "vitest";

import { alignCaptionsToNarration } from "./align-captions-to-narration.ts";

function caption(text: string, startMs: number, endMs: number): Caption {
  return { text, startMs, endMs, timestampMs: endMs, confidence: 0.9 };
}

/** Every returned caption must be usable by `createTikTokStyleCaptions` downstream: spans in
 * order, never inverted, and never zero-length (a zero-length token can never be the "active"
 * word on screen, so it would silently never highlight). */
function expectUsableTimeline(result: Caption[]): void {
  for (const [index, entry] of result.entries()) {
    expect(entry.endMs).toBeGreaterThan(entry.startMs);
    const previous = result[index - 1];
    if (previous !== undefined) {
      expect(entry.startMs).toBeGreaterThanOrEqual(previous.startMs);
      expect(entry.startMs).toBeGreaterThanOrEqual(previous.endMs - 1);
    }
  }
}

/**
 * Contract matrix for `alignCaptionsToNarration(captions, narration)`.
 *
 * The pipeline already knows the EXACT script it sent to Vbee, so whisper is only ever trusted for
 * TIMING; the text on screen always comes from the script. The previous implementation only did
 * that substitution when whisper's token count matched the script's word count exactly, which
 * measured out at a 47.6% bail rate over 231 real scenes — one token of drift discarded a whole
 * scene's correct spelling. This version aligns the two sequences instead.
 *
 * | captions vs narration                    | Expected                                            |
 * | ---------------------------------------- | --------------------------------------------------- |
 * | 1:1, whisper heard it right              | script text, whisper timing untouched                |
 * | 1:1, whisper misheard a word             | script spelling wins, timing still whisper's         |
 * | N script words : 1 token (number collapse)| N captions carved from that token's own span        |
 * | 1 script word : N tokens (word split)     | 1 caption spanning min(start) to max(end)           |
 * | extra token at the head                   | dropped; every script word still timed              |
 * | extra token at the tail                   | dropped; every script word still timed              |
 * | narration empty                           | captions returned unchanged                          |
 * | captions empty                            | empty array                                          |
 * | nothing matches at all                    | one caption per script word, timeline still usable   |
 * | any input                                 | first token has no leading space, the rest do        |
 */
describe("alignCaptionsToNarration", () => {
  it("keeps whisper's timing and the script's spelling when the two line up 1:1", () => {
    const result = alignCaptionsToNarration(
      [caption("Xin", 0, 500), caption(" chao", 500, 900)],
      "Xin chào",
    );

    expect(result.map((c) => c.text)).toEqual(["Xin", " chào"]);
    expect(result.map((c) => [c.startMs, c.endMs])).toEqual([
      [0, 500],
      [500, 900],
    ]);
  });

  it("rescues a word whisper misheard, which is the whole point of the alignment", () => {
    const result = alignCaptionsToNarration(
      [caption("con", 0, 300), caption(" trim", 300, 800), caption(" trong", 800, 1200)],
      "còn chìm trong",
    );

    expect(result.map((c) => c.text)).toEqual(["còn", " chìm", " trong"]);
    expect(result[1]?.startMs).toBe(300);
    expect(result[1]?.endMs).toBe(800);
  });

  it("splits one collapsed token across the several script words it swallowed", () => {
    // Whisper normalizes "mười lăm nghìn" into a single "15.000" token — the single most common
    // reason the old exact-count guard bailed on a real scene.
    const result = alignCaptionsToNarration(
      [caption("15.000", 1000, 2200), caption(" đồng", 2200, 2600)],
      "mười lăm nghìn đồng",
    );

    expect(result.map((c) => c.text)).toEqual(["mười", " lăm", " nghìn", " đồng"]);
    expect(result[0]?.startMs).toBe(1000);
    expect(result[2]?.endMs).toBe(2200);
    expectUsableTimeline(result);
  });

  it("merges several tokens back into the one script word they split apart", () => {
    const result = alignCaptionsToNarration(
      [caption("c", 200, 400), caption("ửa", 400, 900), caption(" sổ", 900, 1300)],
      "cửa sổ",
    );

    expect(result.map((c) => c.text)).toEqual(["cửa", " sổ"]);
    expect(result[0]?.startMs).toBe(200);
    expect(result[0]?.endMs).toBe(900);
    expect(result[1]?.startMs).toBe(900);
    expect(result[1]?.endMs).toBe(1300);
  });

  it("drops a token whisper hallucinated before the script actually starts", () => {
    const result = alignCaptionsToNarration(
      [caption("ừm", 0, 200), caption(" Xin", 200, 600), caption(" chào", 600, 1000)],
      "Xin chào",
    );

    expect(result.map((c) => c.text)).toEqual(["Xin", " chào"]);
    expect(result[0]?.startMs).toBe(200);
    expectUsableTimeline(result);
  });

  it("drops a token whisper hallucinated after the script ends", () => {
    const result = alignCaptionsToNarration(
      [caption("Xin", 0, 400), caption(" chào", 400, 900), caption(" ạ", 900, 1100)],
      "Xin chào",
    );

    expect(result.map((c) => c.text)).toEqual(["Xin", " chào"]);
    expectUsableTimeline(result);
  });

  it("returns the whisper captions untouched when there is no narration to align to", () => {
    const captions = [caption("bất", 0, 300), caption(" kỳ", 300, 600)];

    expect(alignCaptionsToNarration(captions, "   ")).toEqual(captions);
  });

  it("returns an empty array when whisper produced no tokens at all", () => {
    expect(alignCaptionsToNarration([], "Xin chào")).toEqual([]);
  });

  it("still times every script word when nothing matches, rather than collapsing to zero", () => {
    const result = alignCaptionsToNarration(
      [caption("zzz", 0, 500), caption(" yyy", 500, 1000)],
      "hoàn toàn khác",
    );

    expect(result.map((c) => c.text)).toEqual(["hoàn", " toàn", " khác"]);
    expect(result[0]?.startMs).toBe(0);
    expect(result.at(-1)?.endMs).toBe(1000);
    expectUsableTimeline(result);
  });

  it("gives a word with no token of its own a real span, never a 0ms placeholder", () => {
    const result = alignCaptionsToNarration([caption("90", 500, 1400)], "chín mươi");

    expect(result).toHaveLength(2);
    expectUsableTimeline(result);
    expect(result[0]?.startMs).toBe(500);
    expect(result[1]?.endMs).toBe(1400);
  });

  it("keeps createTikTokStyleCaptions' leading-space convention on every token but the first", () => {
    const result = alignCaptionsToNarration(
      [caption("Ba", 0, 200), caption(" từ", 200, 400), caption(" đây", 400, 700)],
      "Ba từ đây",
    );

    expect(result[0]?.text).toBe("Ba");
    expect(result[1]?.text).toBe(" từ");
    expect(result[2]?.text).toBe(" đây");
  });

  it("rescues a zero-length token, which whisper.cpp really does emit", () => {
    // Real examples from this project's own caption files: {" ý", 1040, 1040} and
    // {" do.", 3600, 3600}. A zero-length window can never contain a frame's timestamp, so that
    // word would never once highlight on screen.
    const result = alignCaptionsToNarration(
      [caption("ý", 1000, 1000), caption(" chí", 1000, 1400)],
      "ý chí",
    );

    expectUsableTimeline(result);
    expect(result[0]?.endMs).toBeGreaterThan(result[0]?.startMs ?? 0);
  });

  it("carries whisper's confidence through for a matched word and nulls it for a derived one", () => {
    const result = alignCaptionsToNarration([caption("90", 500, 1400)], "chín mươi");

    expect(result.some((c) => c.confidence === null)).toBe(true);
  });
});
