import path from "node:path";

import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";
import type { Logger } from "pino";

import { projectIdParamsSchema, type TtsOptions } from "@flow-ex/shared-schemas";

import type { TtsProvider } from "../domain/providers.ts";
import { AppError } from "../domain/app-error.ts";
import { createPipelineEngine } from "../pipeline/pipeline-engine.ts";
import type { PipelineEventBus } from "../pipeline/pipeline-events.ts";
import { createFakeImageProvider } from "../providers/fake/fake-image-provider.ts";
import { createFakeTtsProvider } from "../providers/fake/fake-tts-provider.ts";
import { createVbeeTtsProvider } from "../providers/vbee/vbee-tts-provider.ts";
import { createRemotionVideoRenderer } from "../render/create-remotion-video-renderer.ts";
import type { ProjectStore } from "../store/project-store.ts";

export interface VbeeCredentials {
  appId: string;
  token: string;
  webhookUrl: string;
}

export interface RenderRouteOptions {
  store: ProjectStore;
  eventBus: PipelineEventBus;
  baseLogger: Logger;
  /** When present, real requests go to Vbee (task 004); when absent (no `VBEE_APP_ID`/
   * `VBEE_TOKEN` in the environment), falls back to `FakeTtsProvider` (task 003) so local dev and
   * the existing e2e test suite keep working without real credentials. */
  vbeeCredentials?: VbeeCredentials;
}

/** Picks the real `VbeeTtsProvider` when credentials are configured, else `FakeTtsProvider` —
 * pulled out of the route handler as its own pure function so the SELECTION itself is unit
 * testable without going through a real HTTP request or a real Chrome render. */
export function selectTtsProvider(
  vbeeCredentials: VbeeCredentials | undefined,
  assetsDir: string,
  logger?: Logger,
  ttsOptions?: TtsOptions,
): TtsProvider {
  return vbeeCredentials
    ? createVbeeTtsProvider({ ...vbeeCredentials, assetsDir, logger, ttsOptions })
    : createFakeTtsProvider({ assetsDir });
}

/** Starts a project's pipeline run in the background; progress is observed over SSE
 * (`GET /api/projects/:id/events`, ../.claude/rules/api-design.md), not this response. Wires
 * `FakeImageProvider` (replaced by `FlowImageProvider` in task 005) and either `VbeeTtsProvider`
 * or `FakeTtsProvider` depending on `vbeeCredentials`
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
        imageProvider: createFakeImageProvider({ assetsDir }),
        ttsProvider: selectTtsProvider(
          opts.vbeeCredentials,
          assetsDir,
          opts.baseLogger,
          project.tts,
        ),
        videoRenderer: createRemotionVideoRenderer({ buildAssetUrl }),
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
