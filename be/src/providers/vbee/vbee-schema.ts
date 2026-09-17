import { z } from "zod";

/** Vbee's own HTTP response shapes (../../.claude/rules/vbee-tts.md), verified live 2026-09-16.
 * The scene JSON's `tts` options block itself is `@flow-ex/shared-schemas`'s `ttsOptionsSchema`
 * (one definition, reused here to build the POST body — not redefined). */

export const vbeeSubmitResponseSchema = z
  .object({
    requestId: z.string(),
    status: z.literal("PROCESSING"),
  })
  .strict();

export type VbeeSubmitResponse = z.infer<typeof vbeeSubmitResponseSchema>;

const vbeePollingProcessingSchema = z
  .object({
    requestId: z.string(),
    status: z.literal("PROCESSING"),
  })
  .strict();

const vbeePollingCompletedSchema = z
  .object({
    requestId: z.string(),
    status: z.literal("COMPLETED"),
    audioLink: z.string(),
  })
  .strict();

export const vbeePollingResponseSchema = z.union([
  vbeePollingProcessingSchema,
  vbeePollingCompletedSchema,
]);

export type VbeePollingResponse = z.infer<typeof vbeePollingResponseSchema>;

/** Vbee's own `{error:{code,message}}` shape (distinct from this app's own `apiErrorBodySchema`
 * in `@flow-ex/shared-schemas`, which is what THIS app's routes return to the FE — these two
 * happen to share a shape but describe different systems). */
export const vbeeErrorBodySchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .strict();

export type VbeeErrorBody = z.infer<typeof vbeeErrorBodySchema>;
