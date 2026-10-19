import { z } from "zod";

export const imageTaskSchema = z.object({
  kind: z.enum(["reference", "scene"]),
  targetId: z.string(),
  sceneIndex: z.number().int().nonnegative().optional(),
  prompt: z.string(),
  aspectRatio: z.enum(["16:9", "9:16"]),
  expectedRevision: z.string(),
  status: z.enum(["missing", "blocked", "ready"]),
  editable: z.boolean(),
  referenceImages: z.array(z.object({ id: z.string(), file: z.string() })),
  blockedBy: z.array(z.string()),
});
export const imageTasksOutputSchema = z.object({
  projectId: z.uuid(),
  imageSource: z.enum(["flow", "codex"]),
  inbox: z.string(),
  tasks: z.array(imageTaskSchema),
  total: z.number().int(),
  nextOffset: z.number().int().optional(),
});
export const imageTasksInputSchema = z.object({
  projectId: z.uuid(),
  kind: z.enum(["reference", "scene"]).optional(),
  status: z.enum(["missing", "blocked", "ready"]).optional(),
  sceneIndex: z.number().int().nonnegative().optional(),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(100).default(50),
});
export const importImageInputSchema = z.object({
  projectId: z.uuid(),
  stagedFile: z.string().min(1),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
});
export const importSceneImageInputSchema = importImageInputSchema.extend({
  sceneIndex: z.number().int().nonnegative(),
});
export const importReferenceImageInputSchema = importImageInputSchema.extend({
  referenceId: z.string().min(1),
});
const importImageFromUrlInputSchema = z.object({
  projectId: z.uuid(),
  url: z.url(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
});
export const importSceneImageFromUrlInputSchema = importImageFromUrlInputSchema.extend({
  sceneIndex: z.number().int().nonnegative(),
});
export const importReferenceImageFromUrlInputSchema = importImageFromUrlInputSchema.extend({
  referenceId: z.string().min(1),
});
export type ImageTask = z.infer<typeof imageTaskSchema>;
export type ImageTasksInput = z.infer<typeof imageTasksInputSchema>;
