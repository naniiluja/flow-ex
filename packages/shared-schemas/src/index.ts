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

export type TtsOptions = z.infer<typeof ttsOptionsSchema>;

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

/** Per-scene pipeline state (task 003): pending -> generating_image -> generating_audio ->
 * ready_for_render, or failed once its retry schedule is exhausted (see
 * be/.claude/rules/backend-conventions.md and ../../../.claude/rules/error-handling.md). */
export const sceneStatusSchema = z.enum([
  "pending",
  "generating_image",
  "generating_audio",
  "ready_for_render",
  "failed",
]);

export type SceneStatus = z.infer<typeof sceneStatusSchema>;

export const sceneErrorSchema = z
  .object({
    code: z.string(),
    message: z.string(),
  })
  .strict();

/** Project-level render run status: idle (no run started yet), running, completed (output.mp4
 * written), or failed (a scene exhausted its retries or hit a needs_user/fatal error). */
export const runStatusSchema = z.enum(["idle", "running", "completed", "failed"]);

export type RunStatus = z.infer<typeof runStatusSchema>;

/** A scene as stored in project.json: the user's input scene plus its pipeline runtime state.
 * `imageFile`/`audioFile` are paths relative to the project's `assets/` folder. */
export const projectSceneSchema = sceneSchema.extend({
  status: sceneStatusSchema,
  attempts: z.number().int().min(0),
  imageFile: z.string().optional(),
  // The generated image's real pixel size, needed by computeSafeViewport (video.md) to crop
  // correctly when it differs from the fake 1920x1080 default (real Flow images are 1376x768).
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  audioFile: z.string().optional(),
  audioDurationMs: z.number().nonnegative().optional(),
  // Vbee-specific resume state (be/.claude/rules/vbee-tts.md, task 004): written atomically the
  // moment a POST returns 201, BEFORE polling starts, so a crash mid-poll resumes by GETting the
  // SAME request instead of re-submitting (and re-spending credit). A fake/future provider that
  // completes synchronously never sets these.
  audioRequestId: z.string().optional(),
  audioRequestSubmittedAt: z.iso.datetime().optional(),
  lastError: sceneErrorSchema.optional(),
});

export type ProjectScene = z.infer<typeof projectSceneSchema>;

export const projectSchema = scriptInputSchema.extend({
  id: z.uuid(),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  createdAt: z.iso.datetime(),
  scenes: z.array(projectSceneSchema).min(1),
  runId: z.uuid().optional(),
  runStatus: runStatusSchema,
  outputFile: z.string().optional(),
});

export type Project = z.infer<typeof projectSchema>;

/** SSE event contract for `GET /api/projects/:id/events` (be/.claude/rules/api-design.md), the
 * SINGLE definition both `be/src/pipeline/pipeline-events.ts` and
 * `fe/src/hooks/use-project-events.ts` validate against — a duplicated hand-rolled shape on
 * either side can silently drift from the other (architecture.md DRY). */
export const scenePipelineEventSchema = z
  .object({
    type: z.literal("scene"),
    projectId: z.uuid(),
    runId: z.uuid(),
    sceneIndex: z.number().int().nonnegative(),
    status: sceneStatusSchema,
  })
  .strict();

export type ScenePipelineEvent = z.infer<typeof scenePipelineEventSchema>;

export const logPipelineEventSchema = z
  .object({
    type: z.literal("log"),
    projectId: z.uuid(),
    runId: z.uuid(),
    level: z.enum(["info", "warn", "error"]),
    time: z.number(),
    stage: z.string(),
    msg: z.string(),
    sceneIndex: z.number().int().nonnegative().optional(),
    attempt: z.number().int().nonnegative().optional(),
  })
  .strict();

export type LogPipelineEvent = z.infer<typeof logPipelineEventSchema>;

export const pipelineEventSchema = z.discriminatedUnion("type", [
  scenePipelineEventSchema,
  logPipelineEventSchema,
]);

export type PipelineEvent = z.infer<typeof pipelineEventSchema>;

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
