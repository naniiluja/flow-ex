import { describe, expect, it } from "vitest";

import { resolveNarrationOptions } from "@flow-ex/shared-schemas";

import { prepareNarration, vbeeNarrationOptions } from "./narration-request.ts";

/**
 * Contract matrix for `vbeeNarrationOptions(options?)` — the function that decides which resolved
 * narration settings actually reach Vbee's `POST /v1/tts` body (../../.claude/rules/vbee-tts.md).
 *
 * | `options`                                  | Expected                                          |
 * | ------------------------------------------ | ------------------------------------------------- |
 * | `undefined`                                | `{}`                                              |
 * | only `speed`                               | `speed` kept, no other key carries a value        |
 * | resolved preset defaults                   | `clientPause` forwarded, `scenePauseMs` dropped   |
 * | `emphasisIntensity` set explicitly         | dropped (this account 400s on every valid value)  |
 * | `clientPause` with one break only          | exactly that break, no other break invented       |
 *
 * Both exclusions were established by a live probe on 2026-09-20, not from documentation:
 * `scenePauseMs` is local timeline silence Vbee knows nothing about, while `emphasisIntensity` is
 * a real Vbee field (it validates its shape) that this account rejects with a bare `400` for every
 * shape-valid value across all 5 voices tried. `clientPause` in contrast measurably changes the
 * audio: 2.377s at `sentenceBreak: 0.1` versus 8.072s at `2.0` on the same text.
 */
describe("calm narration", () => {
  it("slows default narration and supplies sentence/paragraph pauses", () => {
    expect(resolveNarrationOptions("tiktok")).toMatchObject({
      speed: 0.95,
      clientPause: { sentenceBreak: 0.4, paragraphBreak: 1.4 },
      scenePauseMs: 600,
    });
  });

  it("does not default emphasisIntensity, which this Vbee account rejects outright", () => {
    expect(resolveNarrationOptions("tiktok")).not.toHaveProperty("emphasisIntensity");
  });

  it("merges partial pause overrides without losing the other defaults", () => {
    expect(
      resolveNarrationOptions("youtube", {
        speed: 0.9,
        scenePauseMs: 0,
        clientPause: { sentenceBreak: 1.1 },
      }),
    ).toMatchObject({
      speed: 0.9,
      scenePauseMs: 0,
      clientPause: { sentenceBreak: 1.1, paragraphBreak: 1.4, mediumBreak: 0.2 },
    });
  });

  it("returns an empty object when there are no options at all", () => {
    expect(vbeeNarrationOptions()).toEqual({});
  });

  it("sends the sentence/paragraph pauses Vbee needs to breathe (task 022)", () => {
    const options = vbeeNarrationOptions(resolveNarrationOptions("tiktok"));

    expect(options).toMatchObject({
      speed: 0.95,
      clientPause: {
        mediumBreak: 0.2,
        majorBreak: 0.3,
        sentenceBreak: 0.4,
        paragraphBreak: 1.4,
      },
    });
  });

  it("never sends scenePauseMs, which is local timeline silence rather than a Vbee field", () => {
    const options = vbeeNarrationOptions(resolveNarrationOptions("tiktok"));

    expect(options).not.toHaveProperty("scenePauseMs");
  });

  it("never sends emphasisIntensity, even when a script sets it explicitly", () => {
    const options = vbeeNarrationOptions({ speed: 0.85, emphasisIntensity: 60 });

    expect(options).not.toHaveProperty("emphasisIntensity");
    expect(options.speed).toBe(0.85);
  });

  it("passes a partial clientPause through without inventing the other breaks", () => {
    const options = vbeeNarrationOptions({ clientPause: { sentenceBreak: 1.4 } });

    expect(options.clientPause).toEqual({ sentenceBreak: 1.4 });
  });

  it.each([
    ["  Xin chào  ", "Xin chào."],
    ["Chậm thôi.\n\nMình đi tiếp nhé?", "Chậm thôi.\n\nMình đi tiếp nhé?"],
    ["Cô nói: “Chờ một chút.”", "Cô nói: “Chờ một chút.”"],
  ])("keeps real sentence boundaries: %s", (input, output) => {
    expect(prepareNarration(input)).toBe(output);
  });
});
