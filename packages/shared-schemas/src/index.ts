import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = 1;

const BITRATES = [8, 16, 32, 64, 128] as const;
const SAMPLE_RATES = [8000, 16000, 22050, 24000, 32000, 44100, 48000] as const;

const bitrateSchema = z.union([
  z.literal(BITRATES[0]),
  z.literal(BITRATES[1]),
  z.literal(BITRATES[2]),
  z.literal(BITRATES[3]),
  z.literal(BITRATES[4]),
]);

const sampleRateSchema = z.union([
  z.literal(SAMPLE_RATES[0]),
  z.literal(SAMPLE_RATES[1]),
  z.literal(SAMPLE_RATES[2]),
  z.literal(SAMPLE_RATES[3]),
  z.literal(SAMPLE_RATES[4]),
  z.literal(SAMPLE_RATES[5]),
  z.literal(SAMPLE_RATES[6]),
]);

const emphasisIntensitySchema = z
  .number()
  .int()
  .min(0)
  .max(100)
  .refine((value) => value % 10 === 0, {
    message: "emphasisIntensity must be a multiple of 10",
  });

const clientPauseSchema = z
  .object({
    majorBreak: z.number().min(0.1).max(10).optional(),
    mediumBreak: z.number().min(0.1).max(10).optional(),
    paragraphBreak: z.number().min(0).max(10).optional(),
    sentenceBreak: z.number().min(0.1).max(10).optional(),
  })
  .strict();

export const ttsOptionsSchema = z
  .object({
    speed: z.number().min(0.25).max(1.9).optional(),
    bitrate: bitrateSchema.optional(),
    sampleRate: sampleRateSchema.optional(),
    emphasisIntensity: emphasisIntensitySchema.optional(),
    clientPause: clientPauseSchema.optional(),
  })
  .strict();

export const aspectRatioSchema = z.enum(["16:9", "9:16"]);

export const sceneSchema = z
  .object({
    narration: z.string().trim().min(1),
    imagePrompt: z.string().trim().min(1),
  })
  .strict();

export const scriptInputSchema = z
  .object({
    title: z.string().trim().min(1),
    voice: z.string().trim().min(1),
    aspectRatio: aspectRatioSchema,
    tts: ttsOptionsSchema.optional(),
    scenes: z.array(sceneSchema).min(1),
  })
  .strict();

export type ScriptInput = z.infer<typeof scriptInputSchema>;

export const projectSchema = scriptInputSchema.extend({
  id: z.uuid(),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  createdAt: z.iso.datetime(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectIdParamsSchema = z
  .object({
    id: z.uuid(),
  })
  .strict();

/** The `{error:{code,message}}` envelope every route error response follows (see
 * be/.claude/rules/api-design.md). Used by the FE to validate error bodies at the boundary,
 * same rule as success responses. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;
