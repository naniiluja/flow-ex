import { describe, expect, it } from "vitest";

import { scriptInputSchema, ttsOptionsSchema } from "./index.ts";

const validScript = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  scenes: [{ narration: "Xin chao", imagePrompt: "a sunny beach" }],
};

describe("scriptInputSchema", () => {
  // EP/BVA matrix on the script input's public contract.
  // | title      | aspectRatio | scenes           | Expected                     |
  // | non-empty  | "16:9"      | 1 item            | success                       |
  // | non-empty  | "9:16"      | 1 item            | success                       |
  // | empty ""   | "16:9"      | 1 item            | error: title required        |
  // | non-empty  | "4:3" (bad) | 1 item            | error: invalid aspectRatio    |
  // | non-empty  | "16:9"      | [] (empty, min-1) | error: scenes must have >= 1 |
  // | non-empty  | "16:9"      | 1 item, extra key | error: strict, unknown key    |
  it.each([{ aspectRatio: "16:9" as const }, { aspectRatio: "9:16" as const }])(
    "accepts a valid script with aspectRatio $aspectRatio",
    ({ aspectRatio }) => {
      const result = scriptInputSchema.safeParse({ ...validScript, aspectRatio });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an empty title (boundary: min length 1)", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an aspectRatio outside the enum", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, aspectRatio: "4:3" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty scenes array (boundary: min length 1)", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, scenes: [] });
    expect(result.success).toBe(false);
  });

  it("accepts scenes with exactly 1 item (boundary)", () => {
    const result = scriptInputSchema.safeParse(validScript);
    expect(result.success).toBe(true);
  });

  it("rejects a scene missing imagePrompt", () => {
    const result = scriptInputSchema.safeParse({
      ...validScript,
      scenes: [{ narration: "Xin chao" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level field (strict schema)", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, extra: "nope" });
    expect(result.success).toBe(false);
  });

  it("accepts a script with no tts block (optional)", () => {
    const result = scriptInputSchema.safeParse(validScript);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tts).toBeUndefined();
    }
  });
});

describe("ttsOptionsSchema", () => {
  // EP/BVA matrix on tts.speed, tts.bitrate, tts.sampleRate, tts.emphasisIntensity.
  // | speed      | Expected                          |
  // | 0.25 (min) | success                           |
  // | 0.24       | error: below min                 |
  // | 1.9 (max)  | success                           |
  // | 1.91       | error: above max                 |
  it("accepts speed at the lower boundary (0.25)", () => {
    expect(ttsOptionsSchema.safeParse({ speed: 0.25 }).success).toBe(true);
  });

  it("rejects speed just below the lower boundary (0.24)", () => {
    expect(ttsOptionsSchema.safeParse({ speed: 0.24 }).success).toBe(false);
  });

  it("accepts speed at the upper boundary (1.9)", () => {
    expect(ttsOptionsSchema.safeParse({ speed: 1.9 }).success).toBe(true);
  });

  it("rejects speed just above the upper boundary (1.91)", () => {
    expect(ttsOptionsSchema.safeParse({ speed: 1.91 }).success).toBe(false);
  });

  it.each([8, 16, 32, 64, 128])("accepts a valid bitrate class (%i)", (bitrate) => {
    expect(ttsOptionsSchema.safeParse({ bitrate }).success).toBe(true);
  });

  it("rejects a bitrate outside the allowed set (100)", () => {
    expect(ttsOptionsSchema.safeParse({ bitrate: 100 }).success).toBe(false);
  });

  it.each([8000, 16000, 22050, 24000, 32000, 44100, 48000])(
    "accepts a valid sampleRate class (%i)",
    (sampleRate) => {
      expect(ttsOptionsSchema.safeParse({ sampleRate }).success).toBe(true);
    },
  );

  it("rejects a sampleRate outside the allowed set (11025)", () => {
    expect(ttsOptionsSchema.safeParse({ sampleRate: 11025 }).success).toBe(false);
  });

  it("accepts emphasisIntensity at the boundaries (0 and 100)", () => {
    expect(ttsOptionsSchema.safeParse({ emphasisIntensity: 0 }).success).toBe(true);
    expect(ttsOptionsSchema.safeParse({ emphasisIntensity: 100 }).success).toBe(true);
  });

  it("rejects emphasisIntensity not a multiple of 10", () => {
    expect(ttsOptionsSchema.safeParse({ emphasisIntensity: 55 }).success).toBe(false);
  });

  it("rejects emphasisIntensity outside 0-100", () => {
    expect(ttsOptionsSchema.safeParse({ emphasisIntensity: 110 }).success).toBe(false);
  });

  it("accepts clientPause at its documented boundaries", () => {
    const result = ttsOptionsSchema.safeParse({
      clientPause: {
        majorBreak: 0.1,
        mediumBreak: 10,
        paragraphBreak: 0,
        sentenceBreak: 10,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects clientPause.majorBreak below its minimum (0.09)", () => {
    const result = ttsOptionsSchema.safeParse({ clientPause: { majorBreak: 0.09 } });
    expect(result.success).toBe(false);
  });
});
