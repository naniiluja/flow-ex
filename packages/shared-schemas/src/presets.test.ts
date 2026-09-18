import { describe, expect, it } from "vitest";

import {
  inferPresetFromAspectRatio,
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
 * | "tiktok"       | 9:16, 1080x1920, fontSize 96/weight 800/paddingBottom 30%, speed 1.15 |
 * | "youtube"      | 16:9, 1920x1080, fontSize 56/weight 700/paddingBottom 8%, speed 1.0   |
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
  it("tiktok: 9:16, 1080x1920, TikTok caption style, speed 1.15", () => {
    expect(PRESETS.tiktok.aspectRatio).toBe("9:16");
    expect(PRESETS.tiktok.width).toBe(1080);
    expect(PRESETS.tiktok.height).toBe(1920);
    expect(PRESETS.tiktok.captionStyle).toEqual({
      fontSize: 96,
      fontWeight: 800,
      paddingBottomPercent: 30,
      combineTokensWithinMs: 600,
    });
    expect(PRESETS.tiktok.ttsSpeed).toBe(1.15);
    expect(PRESETS.tiktok.suggestedDuration).toEqual({ min: 30, max: 60 });
    expect(PRESETS.tiktok.suggestedSceneCount).toEqual({ min: 6, max: 10 });
  });

  it("youtube: 16:9, 1920x1080, YouTube caption style, speed 1.0", () => {
    expect(PRESETS.youtube.aspectRatio).toBe("16:9");
    expect(PRESETS.youtube.width).toBe(1920);
    expect(PRESETS.youtube.height).toBe(1080);
    expect(PRESETS.youtube.captionStyle).toEqual({
      fontSize: 56,
      fontWeight: 700,
      paddingBottomPercent: 8,
      combineTokensWithinMs: 1600,
    });
    expect(PRESETS.youtube.ttsSpeed).toBe(1.0);
    expect(PRESETS.youtube.suggestedDuration).toEqual({ min: 180, max: 480 });
    expect(PRESETS.youtube.suggestedSceneCount).toEqual({ min: 10, max: 24 });
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
    expect(resolveTtsSpeed("tiktok", undefined)).toBe(1.15);
    expect(resolveTtsSpeed("youtube", undefined)).toBe(1.0);
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
