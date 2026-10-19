import { describe, expect, it } from "vitest";

import {
  inferPresetFromAspectRatio,
  countSentenceMarks,
  estimateNarrationSeconds,
  SENTENCE_BREAK_SECONDS,
  presetSchema,
  PRESETS,
  resolveAspectRatio,
  resolveTtsSpeed,
} from "./presets.ts";

/**
 * Contract-level EP/BVA matrix for the preset table.
 *
 * | preset (class) | Expected                                                          |
 * | -------------- | ------------------------------------------------------------------ |
 * | "tiktok"       | 9:16, 1080x1920, fontSize 96/weight 800/paddingBottom 30%, speed 0.95 |
 * | "youtube"      | 16:9, 1920x1080, fontSize 56/weight 700/paddingBottom 8%, speed 0.95   |
 * | invalid string | presetSchema rejects                                              |
 */
describe("presetSchema", () => {
  it("accepts the two known preset values", () => {
    expect(presetSchema.safeParse("tiktok").success).toBe(true);
    expect(presetSchema.safeParse("youtube").success).toBe(true);
  });

  it("rejects an unknown preset value", () => {
    expect(presetSchema.safeParse("instagram").success).toBe(false);
  });
});

describe("PRESETS", () => {
  it("tiktok: 9:16, 1080x1920, TikTok caption style, speed 0.95", () => {
    expect(PRESETS.tiktok.aspectRatio).toBe("9:16");
    expect(PRESETS.tiktok.width).toBe(1080);
    expect(PRESETS.tiktok.height).toBe(1920);
    expect(PRESETS.tiktok.captionStyle).toEqual({
      fontSize: 96,
      fontWeight: 800,
      paddingBottomPercent: 30,
      combineTokensWithinMs: 600,
    });
    expect(PRESETS.tiktok.ttsSpeed).toBe(0.95);
    expect(PRESETS.tiktok.suggestedDuration).toEqual({ min: 30, max: 60 });
    expect(PRESETS.tiktok.suggestedSceneCount).toEqual({ min: 6, max: 10 });
    expect(PRESETS.tiktok.suggestedSceneDurationSeconds).toEqual({ min: 3, max: 6 });
  });

  it("youtube: 16:9, 1920x1080, YouTube caption style, speed 0.95", () => {
    expect(PRESETS.youtube.aspectRatio).toBe("16:9");
    expect(PRESETS.youtube.width).toBe(1920);
    expect(PRESETS.youtube.height).toBe(1080);
    expect(PRESETS.youtube.captionStyle).toEqual({
      fontSize: 56,
      fontWeight: 700,
      paddingBottomPercent: 8,
      combineTokensWithinMs: 1600,
    });
    expect(PRESETS.youtube.ttsSpeed).toBe(0.95);
    expect(PRESETS.youtube.suggestedDuration).toEqual({ min: 180, max: 480 });
    expect(PRESETS.youtube.suggestedSceneCount).toEqual({ min: 10, max: 24 });
    expect(PRESETS.youtube.suggestedSceneDurationSeconds).toEqual({ min: 8, max: 16 });
  });

  // Task 025: the three length hints have to agree, or a script author following one of them
  // necessarily breaks another. Checked at the midpoint of each range rather than the corners,
  // since the extreme corners of three independent ranges never all line up.
  it.each(["tiktok", "youtube"] as const)(
    "%s: a mid-length scene times a mid-sized scene count lands inside suggestedDuration",
    (preset) => {
      const { suggestedDuration, suggestedSceneCount, suggestedSceneDurationSeconds } =
        PRESETS[preset];
      const midSceneSeconds =
        (suggestedSceneDurationSeconds.min + suggestedSceneDurationSeconds.max) / 2;
      const midSceneCount = (suggestedSceneCount.min + suggestedSceneCount.max) / 2;
      const total = midSceneSeconds * midSceneCount;

      expect(total).toBeGreaterThanOrEqual(suggestedDuration.min);
      expect(total).toBeLessThanOrEqual(suggestedDuration.max);
    },
  );

  it("tiktok: keeps a still image on screen well under what real projects drifted to", () => {
    // Measured on the three most recent TIKTOK projects: 7.2s, 14.1s and 16.0s per scene. The
    // guidance is worth nothing if it merely restates what already happens. Asserted for tiktok
    // only, since that is where the measurement came from — 16s a scene is unremarkable for the
    // long-form youtube preset.
    expect(PRESETS.tiktok.suggestedSceneDurationSeconds.max).toBeLessThan(7);
  });
});

describe("estimateNarrationSeconds", () => {
  it.each([
    [253, 24, 79.4],
    [183, 23, 62.4],
    [190, 12, 57.4],
  ])("predicts the real run of %i words / %i marks within 2%%", (words, marks, actual) => {
    // The three real Johnny Joestar runs the coefficients were least-squares fitted over. A flat
    // words-per-second figure cannot hit all three: 4.5 (pre-task-022) overshot by 43%, 3.3 (one
    // post-022 run) by 15%, and a two-point fit of THIS model was still 5.3% off the third run.
    const predicted = estimateNarrationSeconds(words, marks);

    expect(Math.abs(predicted - actual) / actual).toBeLessThan(0.02);
  });

  it("charges each sentence mark separately, so punctuation changes duration on its own", () => {
    const sameWords = 100;
    const fewStops = estimateNarrationSeconds(sameWords, 5);
    const manyStops = estimateNarrationSeconds(sameWords, 15);

    expect(manyStops - fewStops).toBeCloseTo(10 * SENTENCE_BREAK_SECONDS, 5);
  });

  it("charges nothing but speech when the text has no sentence marks at all", () => {
    // 385 words at the fitted 3.85 words/second, with zero pause to pay for.
    expect(estimateNarrationSeconds(385, 0)).toBeCloseTo(100, 5);
  });
});

describe("countSentenceMarks", () => {
  it.each([
    ["Một câu.", 1],
    ["Hai câu. Ba câu!", 2],
    ["Có dấu hỏi? Có dấu ba chấm…", 2],
    ["Lý do tôi biết muộn: ý chí cạn mỗi ngày.", 2],
    ["Không dấu nào", 0],
  ])("counts the pause-driving marks in %s", (text, expected) => {
    expect(countSentenceMarks(text)).toBe(expected);
  });
});

describe("resolveAspectRatio", () => {
  it("falls back to the preset's own aspect ratio when none is given explicitly", () => {
    expect(resolveAspectRatio({ preset: "tiktok" })).toBe("9:16");
    expect(resolveAspectRatio({ preset: "youtube" })).toBe("16:9");
  });

  it("an explicit aspectRatio WINS over a conflicting preset default", () => {
    expect(resolveAspectRatio({ preset: "tiktok", aspectRatio: "16:9" })).toBe("16:9");
    expect(resolveAspectRatio({ preset: "youtube", aspectRatio: "9:16" })).toBe("9:16");
  });
});

describe("resolveTtsSpeed", () => {
  it("falls back to the preset's own speed when none is given explicitly", () => {
    expect(resolveTtsSpeed("tiktok", undefined)).toBe(0.95);
    expect(resolveTtsSpeed("youtube", undefined)).toBe(0.95);
  });

  it("an explicit speed WINS over the preset default", () => {
    expect(resolveTtsSpeed("tiktok", 0.9)).toBe(0.9);
  });
});

describe("inferPresetFromAspectRatio", () => {
  it("9:16 infers tiktok", () => {
    expect(inferPresetFromAspectRatio("9:16")).toBe("tiktok");
  });

  it("16:9 infers youtube", () => {
    expect(inferPresetFromAspectRatio("16:9")).toBe("youtube");
  });

  it("undefined falls back to youtube", () => {
    expect(inferPresetFromAspectRatio(undefined)).toBe("youtube");
  });
});
