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
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

/** A reusable character/setting reference (task 013), generated ONCE via Flow's native
 * "Nhân vật"/"Cảnh" asset picker (be/.claude/rules/flow-automation.md's reference-image section)
 * and then attached to any scene's prompt via `referenceIds` below, so the same face/place stays
 * visually consistent across every scene that reuses it instead of Flow re-imagining it per call. */
export const referenceSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum(["character", "setting"]),
    name: z.string().trim().min(1),
    prompt: z.string().trim().min(1),
  })
  .strict();

export type Reference = z.infer<typeof referenceSchema>;

export const sceneSchema = z
  .object({
    narration: z.string().trim().min(1),
    imagePrompt: z.string().trim().min(1),
    // Which project-level `references[].id` this scene's image should stay consistent with
    // (task 013). Empty/absent means the scene has no reference to attach — unrelated to
    // `.strict()`'s "no unknown fields" rule, this is a deliberately optional KNOWN field.
    referenceIds: z.array(z.string().trim().min(1)).default([]),
  })
  .strict();

/** Base object shape shared by `scriptInputSchema` and `projectSchema` (task 013): kept as a
 * plain `ZodObject` (no `.refine()` yet) specifically so `projectSchema` below can still
 * `.extend()` it with runtime-only fields — `.refine()` returns a `ZodEffects` wrapper that no
 * longer exposes `.extend()`, so the cross-reference check is applied separately by each of the
 * two schemas that need it, right after their own final shape is settled. */
const scriptInputBaseSchema = z
  .object({
    title: z.string().trim().min(1),
    voice: z.string().trim().min(1),
    aspectRatio: aspectRatioSchema,
    tts: ttsOptionsSchema.optional(),
    // Task 006's "Dừng để duyệt" switch: an opt-in per run, decided at project creation and
    // persisted so a resumed run reads the SAME choice rather than re-asking (../../be/.claude
    // /rules/flow-automation.md's review-gate design). Defaults off so tasks 002-005's existing
    // fake-provider e2e flow keeps completing straight through, unchanged.
    reviewEnabled: z.boolean().default(false),
    // Project-level character/setting bible (task 013); scenes opt in via `referenceIds`.
    // Defaults to [] so every project created before task 013 still parses.
    references: z.array(referenceSchema).default([]),
    scenes: z.array(sceneSchema).min(1),
  })
  .strict();

/** Every `scene.referenceIds` entry must point at a `references[].id` declared on the SAME
 * object — shared by `scriptInputSchema` and `projectSchema` so the check can't drift between
 * the two call sites. */
function referenceIdsAreDeclared(input: {
  references: Reference[];
  scenes: { referenceIds: string[] }[];
}): boolean {
  const knownIds = new Set(input.references.map((reference) => reference.id));
  return input.scenes.every((scene) =>
    scene.referenceIds.every((referenceId) => knownIds.has(referenceId)),
  );
}

const REFERENCE_IDS_REFINEMENT = {
  message: "every scene.referenceIds entry must match a references[].id declared on the project",
  path: ["scenes"],
} as const;

export const scriptInputSchema = scriptInputBaseSchema.refine(
  referenceIdsAreDeclared,
  REFERENCE_IDS_REFINEMENT,
);

export type ScriptInput = z.infer<typeof scriptInputSchema>;

/** Per-scene pipeline state (task 003): pending -> generating_image -> generating_audio ->
 * ready_for_render, or failed once its retry schedule is exhausted (see
 * be/.claude/rules/backend-conventions.md and ../../../.claude/rules/error-handling.md).
 * Task 006 inserts `awaiting_review` between `generating_image` and `generating_audio`, taken
 * ONLY when the project's `reviewEnabled` switch is on. Task 007 inserts `transcribing` between
 * `generating_audio` and `ready_for_render`: once the audio file exists, whisper.cpp generates
 * its word-level caption timestamps before the scene is considered render-ready
 * (../../.claude/rules/video.md's Captions section). */
export const sceneStatusSchema = z.enum([
  "pending",
  "generating_image",
  "awaiting_review",
  "generating_audio",
  "transcribing",
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

/** Project-level render run status: idle (no run started yet), running, awaiting_review (task
 * 006: every scene has finished its image step and `reviewEnabled` is on, but at least one scene
 * is still `awaiting_review` — the run is paused, not failed, and resumes on the NEXT
 * `POST /render` call once every scene is approved), completed (output.mp4 written), or failed
 * (a scene exhausted its retries or hit a needs_user/fatal error). */
export const runStatusSchema = z.enum([
  "idle",
  "running",
  "awaiting_review",
  "completed",
  "failed",
]);

export type RunStatus = z.infer<typeof runStatusSchema>;

/** One generated image kept for the review grid (task 006): every successful `generateImage`
 * call appends one entry, in generation order, whether reviewEnabled or not (imageVariants[0] is
 * always the image `imageFile` currently points at when review is off). */
export const imageVariantSchema = z
  .object({
    file: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

export type ImageVariant = z.infer<typeof imageVariantSchema>;

/** One word-level caption token, structurally identical to `@remotion/captions`'s own `Caption`
 * type (task 007) — duck-typed here rather than importing that package, so `packages/shared-schemas`
 * stays free of a Remotion dependency (only `be/` and `video/` need the real library). Written by
 * `be/src/providers/whisper/whisper-transcription-provider.ts` into
 * `projects/<id>/assets/captions/<sceneIndex>.json`, and validated at that read boundary by
 * `be/src/render/create-remotion-video-renderer.ts` before the JSON reaches the render pipeline. */
export const captionSchema = z
  .object({
    text: z.string(),
    startMs: z.number(),
    endMs: z.number(),
    timestampMs: z.number().nullable(),
    confidence: z.number().nullable(),
    pageBreakAfter: z.boolean().optional(),
  })
  .strict();

export type CaptionData = z.infer<typeof captionSchema>;

export const captionsFileSchema = z.array(captionSchema);

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
  // Every image ever generated for this scene (the first Flow call plus every "Sinh lại"
  // regenerate, be/.claude/rules/flow-automation.md); `imageFile`/Width/Height always mirror the
  // variant the pipeline/FE currently treats as selected. Defaults to [] so a project created
  // before task 006 still parses.
  imageVariants: z.array(imageVariantSchema).default([]),
  audioFile: z.string().optional(),
  audioDurationMs: z.number().nonnegative().optional(),
  // Vbee-specific resume state (be/.claude/rules/vbee-tts.md, task 004): written atomically the
  // moment a POST returns 201, BEFORE polling starts, so a crash mid-poll resumes by GETting the
  // SAME request instead of re-submitting (and re-spending credit). A fake/future provider that
  // completes synchronously never sets these.
  audioRequestId: z.string().optional(),
  audioRequestSubmittedAt: z.iso.datetime().optional(),
  // Task 007: path (relative to the project's assets folder, e.g. "captions/000.json") to this
  // scene's word-level caption timestamps, written once whisper.cpp transcribes its audio file.
  captionsFile: z.string().optional(),
  lastError: sceneErrorSchema.optional(),
});

export type ProjectScene = z.infer<typeof projectSceneSchema>;

/** A project-level reference as stored in project.json: the input reference plus the Flow-generated
 * asset that backs it (task 013). `imageFile` is unset until the pipeline's reference phase (phase
 * 0, before any scene's own image step) generates it once. */
export const projectReferenceSchema = referenceSchema.extend({
  imageFile: z.string().optional(),
});

export type ProjectReference = z.infer<typeof projectReferenceSchema>;

export const projectSchema = scriptInputBaseSchema
  .extend({
    id: z.uuid(),
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    createdAt: z.iso.datetime(),
    references: z.array(projectReferenceSchema).default([]),
    scenes: z.array(projectSceneSchema).min(1),
    runId: z.uuid().optional(),
    runStatus: runStatusSchema,
    outputFile: z.string().optional(),
  })
  .refine(referenceIdsAreDeclared, REFERENCE_IDS_REFINEMENT);

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

/** Route params for `POST /api/projects/:id/scenes/:index/{approve,regenerate}`
 * (../../be/.claude/rules/api-design.md, task 006). */
export const projectSceneParamsSchema = z
  .object({
    id: z.uuid(),
    index: z.coerce.number().int().nonnegative(),
  })
  .strict();

/** Optional body for the approve route: pick a specific variant by its index into
 * `imageVariants`; omitted means "keep whatever `imageFile` already points at" (the most
 * recently generated variant, since every regenerate overwrites it too). */
export const approveSceneBodySchema = z
  .object({
    variantIndex: z.number().int().nonnegative().optional(),
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
