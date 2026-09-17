import { describe, expect, it } from "vitest";

import {
  approveSceneBodySchema,
  captionSchema,
  captionsFileSchema,
  migrateProjectJson,
  projectSceneParamsSchema,
  projectSceneSchema,
  projectSchema,
  scriptInputSchema,
  ttsOptionsSchema,
} from "./index.ts";

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

  it("defaults reviewEnabled to false when omitted (task 006)", () => {
    const result = scriptInputSchema.safeParse(validScript);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewEnabled).toBe(false);
    }
  });

  it("accepts an explicit reviewEnabled: true", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, reviewEnabled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewEnabled).toBe(true);
    }
  });
});

describe("projectSceneSchema (task 006 review-gate fields)", () => {
  const baseScene = {
    narration: "Xin chao",
    imagePrompt: "a sunny beach",
    status: "awaiting_review" as const,
    attempts: 1,
  };

  it("accepts the new awaiting_review status", () => {
    expect(projectSceneSchema.safeParse(baseScene).success).toBe(true);
  });

  it("defaults imageVariants to [] when omitted (loading a pre-task-006 project.json)", () => {
    const result = projectSceneSchema.safeParse(baseScene);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageVariants).toEqual([]);
    }
  });

  it("accepts a populated imageVariants list", () => {
    const result = projectSceneSchema.safeParse({
      ...baseScene,
      imageVariants: [{ file: "a.png", width: 1376, height: 768 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an imageVariants entry missing width (strict per-variant shape)", () => {
    const result = projectSceneSchema.safeParse({
      ...baseScene,
      imageVariants: [{ file: "a.png", height: 768 }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts the new transcribing status (task 007)", () => {
    const result = projectSceneSchema.safeParse({ ...baseScene, status: "transcribing" });
    expect(result.success).toBe(true);
  });

  it("accepts an optional captionsFile path", () => {
    const result = projectSceneSchema.safeParse({
      ...baseScene,
      captionsFile: "captions/000.json",
    });
    expect(result.success).toBe(true);
  });

  it("omits captionsFile when not yet transcribed", () => {
    const result = projectSceneSchema.safeParse(baseScene);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.captionsFile).toBeUndefined();
    }
  });
});

/**
 * Contract-level EP/BVA matrix for captionSchema/captionsFileSchema (task 007).
 *
 * | text        | timestampMs / confidence | extra field | Expected                 |
 * | ----------- | ------------------------ | ----------- | ------------------------- |
 * | "William"   | number / number          | none        | success                   |
 * | " a" (1 char, leading space) | null / null | none | success                   |
 * | very long string (10000 chars) | 0 / 0     | none        | success                   |
 * | ""  (empty text)               | 0 / 0     | none        | success (empty is valid text) |
 * | valid caption                  | valid     | unknown key | error: strict, unknown key |
 * | array of 0 captions             | —         | —           | success (empty file valid) |
 */
describe("captionSchema / captionsFileSchema", () => {
  const baseCaption = {
    text: "William",
    startMs: 40,
    endMs: 420,
    timestampMs: 230,
    confidence: 0.81,
  };

  it("accepts a normal token", () => {
    expect(captionSchema.safeParse(baseCaption).success).toBe(true);
  });

  it("accepts a 1-character token with null timestampMs/confidence (boundary)", () => {
    const result = captionSchema.safeParse({
      ...baseCaption,
      text: " a",
      timestampMs: null,
      confidence: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a very long token text (boundary: no max length enforced)", () => {
    const result = captionSchema.safeParse({ ...baseCaption, text: "a".repeat(10_000) });
    expect(result.success).toBe(true);
  });

  it("accepts an empty token text", () => {
    const result = captionSchema.safeParse({ ...baseCaption, text: "" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown extra field (strict)", () => {
    const result = captionSchema.safeParse({ ...baseCaption, extra: "nope" });
    expect(result.success).toBe(false);
  });

  it("accepts an empty captions file (a silent scene)", () => {
    expect(captionsFileSchema.safeParse([]).success).toBe(true);
  });

  it("accepts a captions file with multiple tokens in order", () => {
    const result = captionsFileSchema.safeParse([
      baseCaption,
      { ...baseCaption, text: " just", startMs: 420, endMs: 650, timestampMs: 480 },
    ]);
    expect(result.success).toBe(true);
  });
});

describe("projectSceneParamsSchema", () => {
  it("coerces a numeric index string from the URL", () => {
    const result = projectSceneParamsSchema.safeParse({
      id: "8f14e45f-ceea-4a3c-8c8c-000000000000",
      index: "1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.index).toBe(1);
    }
  });

  it("rejects a negative index (boundary)", () => {
    const result = projectSceneParamsSchema.safeParse({
      id: "8f14e45f-ceea-4a3c-8c8c-000000000000",
      index: "-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("approveSceneBodySchema", () => {
  it("accepts an empty body (approve the current imageFile)", () => {
    expect(approveSceneBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts a non-negative variantIndex", () => {
    expect(approveSceneBodySchema.safeParse({ variantIndex: 0 }).success).toBe(true);
  });

  it("rejects a negative variantIndex (boundary)", () => {
    expect(approveSceneBodySchema.safeParse({ variantIndex: -1 }).success).toBe(false);
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

/**
 * Contract-level EP/BVA matrix for the preset↔aspectRatio interplay on scriptInputSchema.
 *
 * | preset given | aspectRatio given | Expected                                    |
 * | ------------ | ------------------ | -------------------------------------------- |
 * | "tiktok"     | none               | resolved preset "tiktok", aspectRatio undefined |
 * | none         | "9:16"             | resolved preset inferred "tiktok"             |
 * | "youtube"    | "9:16" (conflict)  | aspectRatio "9:16" kept as-is (explicit wins downstream via resolveAspectRatio) |
 * | none         | none               | rejected — at least one required             |
 * | "instagram"  | —                  | rejected — unknown preset                    |
 */
describe("scriptInputSchema preset/aspectRatio", () => {
  const base = {
    title: "Cau chuyen mua he",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    scenes: [{ narration: "Xin chao", imagePrompt: "a sunny beach" }],
  };

  it("accepts preset alone and resolves it unchanged", () => {
    const result = scriptInputSchema.parse({ ...base, preset: "tiktok" });
    expect(result.preset).toBe("tiktok");
    expect(result.aspectRatio).toBeUndefined();
  });

  it("accepts aspectRatio alone and infers the matching preset", () => {
    const result = scriptInputSchema.parse({ ...base, aspectRatio: "9:16" });
    expect(result.preset).toBe("tiktok");
    expect(result.aspectRatio).toBe("9:16");
  });

  it("an explicit aspectRatio that conflicts with preset is kept as given (aspectRatio wins over preset)", () => {
    const result = scriptInputSchema.parse({ ...base, preset: "youtube", aspectRatio: "9:16" });
    expect(result.preset).toBe("youtube");
    expect(result.aspectRatio).toBe("9:16");
  });

  it("rejects when neither preset nor aspectRatio is given", () => {
    expect(scriptInputSchema.safeParse(base).success).toBe(false);
  });

  it("rejects an unknown preset value", () => {
    expect(scriptInputSchema.safeParse({ ...base, preset: "instagram" }).success).toBe(false);
  });
});

describe("migrateProjectJson", () => {
  const oldProject = {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Cau chuyen mua he",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    aspectRatio: "9:16",
    reviewEnabled: false,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runStatus: "idle",
    scenes: [
      {
        narration: "Xin chao",
        imagePrompt: "beach",
        status: "pending",
        attempts: 0,
        imageVariants: [],
      },
    ],
  };

  it("infers preset from a v1 project's own aspectRatio and bumps schemaVersion", () => {
    const migrated = migrateProjectJson(oldProject) as Record<string, unknown>;
    expect(migrated.preset).toBe("tiktok");
    expect(migrated.schemaVersion).toBe(2);
  });

  it("a migrated v1 project.json validates against the CURRENT projectSchema", () => {
    const migrated = migrateProjectJson(oldProject);
    const parsed = projectSchema.parse(migrated);
    expect(parsed.preset).toBe("tiktok");
    expect(parsed.aspectRatio).toBe("9:16");
  });

  it("leaves an already-current project untouched", () => {
    const current = { ...oldProject, schemaVersion: 2, preset: "youtube" };
    expect(migrateProjectJson(current)).toEqual(current);
  });
});

describe("scriptInputSchema references (task 013)", () => {
  // EP/BVA matrix on the references[]/scene.referenceIds contract.
  // | references     | scene.referenceIds        | Expected                              |
  // | absent         | absent                    | success, both default to []           |
  // | 1 valid entry  | [] (empty)                | success                               |
  // | 1 valid entry  | [thatId]                  | success                               |
  // | 1 valid entry  | ["unknown-id"]            | error: unknown reference id           |
  // | []             | ["any-id"]                | error: unknown reference id           |
  it("defaults references and referenceIds to [] when both are absent", () => {
    const result = scriptInputSchema.safeParse(validScript);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.references).toEqual([]);
      expect(result.data.scenes[0]?.referenceIds).toEqual([]);
    }
  });

  const oneReference = [
    {
      id: "char-1",
      kind: "character" as const,
      name: "Cô bán cà phê",
      prompt: "a warm, tired barista in her 50s, hà nội style",
    },
  ];

  it("accepts a scene with an empty referenceIds even when references exist", () => {
    const result = scriptInputSchema.safeParse({ ...validScript, references: oneReference });
    expect(result.success).toBe(true);
  });

  it("accepts a scene whose referenceIds points at a declared reference", () => {
    const result = scriptInputSchema.safeParse({
      ...validScript,
      references: oneReference,
      scenes: [{ ...validScript.scenes[0], referenceIds: ["char-1"] }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a scene whose referenceIds points at an UNDECLARED reference", () => {
    const result = scriptInputSchema.safeParse({
      ...validScript,
      references: oneReference,
      scenes: [{ ...validScript.scenes[0], referenceIds: ["nonexistent"] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a scene referenceId when the project has no references at all", () => {
    const result = scriptInputSchema.safeParse({
      ...validScript,
      scenes: [{ ...validScript.scenes[0], referenceIds: ["any-id"] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a reference with an unknown kind (not character/setting)", () => {
    const result = scriptInputSchema.safeParse({
      ...validScript,
      references: [{ ...oneReference[0], kind: "prop" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("projectSchema references (task 013)", () => {
  it("parses a pre-task-013 project.json that has no references/referenceIds fields at all", async () => {
    const { projectSchema } = await import("./index.ts");
    const legacyProject = {
      title: "Old project",
      voice: "hn_female_ngochuyen_full_48k-fhg",
      aspectRatio: "16:9",
      reviewEnabled: false,
      scenes: [
        {
          narration: "Xin chao",
          imagePrompt: "a sunny beach",
          status: "pending",
          attempts: 0,
          imageVariants: [],
        },
      ],
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      runStatus: "idle",
    };
    const result = projectSchema.safeParse(legacyProject);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.references).toEqual([]);
    }
  });
});
