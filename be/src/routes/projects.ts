import fs from "node:fs/promises";
import path from "node:path";

import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";

import { z } from "zod";

import {
  logPipelineEventSchema,
  projectIdParamsSchema,
  projectObjectSchema,
  projectSummarySchema,
  scriptInputSchema,
  type LogPipelineEvent,
} from "@flow-ex/shared-schemas";

import type { ProjectStore } from "../store/project-store.ts";

/** Mirrors `pipeline-engine.ts`'s `logAndEmit`'s NDJSON entry shape (level, time, projectId,
 * runId, stage, msg, sceneIndex?, attempt?, plus an `err` field on error lines) — NOT the same
 * shape as `logPipelineEventSchema` (missing `type: "log"`, and carrying `err` which that strict
 * schema rejects). Parsed defensively per line: a line this shape check rejects is skipped rather
 * than failing the whole read, since the file is append-only application data, not a contract. */
const ndjsonLogLineSchema = z.object({
  level: z.enum(["info", "warn", "error"]),
  time: z.number(),
  projectId: z.uuid(),
  runId: z.uuid(),
  stage: z.string(),
  msg: z.string(),
  sceneIndex: z.number().int().nonnegative().optional(),
  attempt: z.number().int().nonnegative().optional(),
});

/** Cap matches the FE's own `MAX_LOG_LINES` (`use-project-events.ts`) — the two together bound
 * how many lines a client ever holds for one project, whether from history or the live tail. */
const MAX_HISTORY_LOG_LINES = 500;

/** Reads `projects/<id>/logs/run-<runId>.ndjson` for the project's most recent run and maps each
 * line into the SAME `LogPipelineEvent` shape the SSE `log` event uses, so the Log tab can render
 * history and live lines through one component with no special-casing. Returns `[]` (never
 * throws) when the project has no `runId` yet or its log file doesn't exist — a project that
 * hasn't started a run, or whose run predates this file's own retention, has nothing to show. */
async function readRunLogHistory(
  projectsRoot: string,
  projectId: string,
  runId: string | undefined,
): Promise<LogPipelineEvent[]> {
  if (runId === undefined) {
    return [];
  }
  const logPath = path.join(projectsRoot, projectId, "logs", `run-${runId}.ndjson`);
  let raw: string;
  try {
    raw = await fs.readFile(logPath, "utf8");
  } catch {
    return [];
  }
  const lines: LogPipelineEvent[] = [];
  for (const rawLine of raw.split("\n")) {
    if (rawLine.trim() === "") continue;
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawLine);
    } catch {
      continue;
    }
    const result = ndjsonLogLineSchema.safeParse(parsedJson);
    if (!result.success) continue;
    lines.push({ type: "log", ...result.data });
  }
  return lines.slice(-MAX_HISTORY_LOG_LINES);
}

export interface ProjectsRouteOptions {
  store: ProjectStore;
}

const projectsRoutes: FastifyPluginCallback<ProjectsRouteOptions> = (fastify, opts, done) => {
  const { store } = opts;
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/api/projects",
    {
      schema: {
        body: scriptInputSchema,
        response: { 201: projectObjectSchema },
      },
    },
    async (request, reply) => {
      const project = await store.create(request.body);
      reply.code(201);
      return project;
    },
  );

  app.get(
    "/api/projects",
    {
      schema: {
        response: { 200: z.object({ projects: z.array(projectSummarySchema) }) },
      },
    },
    async () => {
      const projects = await store.list();
      return { projects };
    },
  );

  app.get(
    "/api/projects/:id",
    {
      schema: {
        params: projectIdParamsSchema,
        response: { 200: projectObjectSchema },
      },
    },
    async (request) => {
      return store.read(request.params.id);
    },
  );

  // Backs the Log tab's initial history load (fe/src/pages/project-scenes-page.tsx): the SSE
  // stream (`GET /api/projects/:id/events`) only ever emits NEW lines from the moment a client
  // connects, so reloading the page on an already-finished (or already-running) project showed
  // an empty Log tab even though `logs/run-<runId>.ndjson` has the full history on disk.
  app.get(
    "/api/projects/:id/logs",
    {
      schema: {
        params: projectIdParamsSchema,
        response: { 200: z.object({ logLines: z.array(logPipelineEventSchema) }) },
      },
    },
    async (request) => {
      const project = await store.read(request.params.id);
      const logLines = await readRunLogHistory(store.projectsRoot, project.id, project.runId);
      return { logLines };
    },
  );

  done();
};

export default projectsRoutes;
