import path from "node:path";

import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";
import type { Logger } from "pino";

import { projectIdParamsSchema } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import type { ImageProvider } from "../domain/providers.ts";
import { createPipelineEngine } from "../pipeline/pipeline-engine.ts";
import type { PipelineEventBus } from "../pipeline/pipeline-events.ts";
import {
  selectTranscriptionProvider,
  selectTtsProvider,
  type VbeeCredentials,
  type WhisperOptions,
} from "../providers/select-providers.ts";
import { createRemotionVideoRenderer } from "../render/create-remotion-video-renderer.ts";
import type { ProjectStore } from "../store/project-store.ts";

export interface RenderRouteOptions {
  store: ProjectStore;
  eventBus: PipelineEventBus;
  baseLogger: Logger;
  /** When present, real requests go to Vbee (task 004); when absent (no `VBEE_APP_ID`/
   * `VBEE_TOKEN` in the environment), falls back to `FakeTtsProvider` (task 003) so local dev and
   * the existing e2e test suite keep working without real credentials. */
  vbeeCredentials?: VbeeCredentials;
  /** One `ImageProvider` per project, shared with `routes/scenes.ts`'s regenerate route
   * (../.claude/rules/architecture.md, `../providers/select-providers.ts`'s
   * `createImageProviderFactory` doc comment explains why a single long-lived instance per
   * project matters for `FlowImageProvider`). */
  getImageProvider: (projectId: string) => ImageProvider;
  /** `"whisper"` -> `WhisperTranscriptionProvider` (task 007, needs `whisperOptions`);
   * default/absent -> `FakeTranscriptionProvider`. `server.ts` derives this from
   * `env.TRANSCRIBE_PROVIDER`. Unlike `getImageProvider`, this is built fresh per request
   * (no per-project caching needed): `WhisperTranscriptionProvider` holds no persistent
   * connection to leak, only a lazily-shared install/model-download promise. */
  transcriptionMode?: "fake" | "whisper";
  whisperOptions?: WhisperOptions;
}

/** Starts a project's pipeline run in the background; progress is observed over SSE
 * (`GET /api/projects/:id/events`, ../.claude/rules/api-design.md), not this response. Wires
 * either `FlowImageProvider` or `FakeImageProvider` depending on `flowImageProviderMode` (task
 * 005), and either `VbeeTtsProvider` or `FakeTtsProvider` depending on `vbeeCredentials`
 * (../../.claude/rules/architecture.md provider/strategy pattern). */
const renderRoutes: FastifyPluginCallback<RenderRouteOptions> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/api/projects/:id/render",
    { schema: { params: projectIdParamsSchema } },
    async (request, reply) => {
      const { id } = request.params;
      // 404s up front (via store.read's own AppError) instead of failing asynchronously inside
      // the background run, where nothing in this request would observe it.
      const project = await opts.store.read(id);
      if (project.runStatus === "running") {
        throw new AppError({
          code: "PIPELINE_ALREADY_RUNNING",
          errorKind: "needs_user",
          message: `project ${id} already has a render in progress`,
          context: { projectId: id },
        });
      }

      const address = fastify.server.address();
      if (address === null || typeof address === "string") {
        throw new Error("render route: server is not listening on a TCP address");
      }
      const baseUrl = `http://127.0.0.1:${String(address.port)}`;
      const buildAssetUrl = (projectId: string, relativeAssetPath: string): string =>
        `${baseUrl}/api/projects/${projectId}/assets/${relativeAssetPath}`;

      const assetsDir = path.join(opts.store.projectsRoot, id, "assets");
      const engine = createPipelineEngine({
        store: opts.store,
        imageProvider: opts.getImageProvider(id),
        ttsProvider: selectTtsProvider(
          opts.vbeeCredentials,
          assetsDir,
          opts.baseLogger,
          project.tts,
        ),
        transcriptionProvider: selectTranscriptionProvider(
          opts.transcriptionMode,
          opts.whisperOptions,
          assetsDir,
          opts.baseLogger,
        ),
        videoRenderer: createRemotionVideoRenderer({
          buildAssetUrl,
          projectsRoot: opts.store.projectsRoot,
        }),
        baseLogger: opts.baseLogger,
        eventBus: opts.eventBus,
      });

      engine.run(id).catch((error: unknown) => {
        opts.baseLogger.error({ err: error, projectId: id }, "pipeline.run.unhandled_rejection");
      });

      reply.code(202);
      return { status: "started" };
    },
  );

  done();
};

export default renderRoutes;
