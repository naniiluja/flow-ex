import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";
import type { Logger } from "pino";

import {
  approveSceneBodySchema,
  projectObjectSchema,
  projectSceneParamsSchema,
} from "@flow-ex/shared-schemas";

import type { ImageProvider } from "../domain/providers.ts";
import type { PipelineEventBus } from "../pipeline/pipeline-events.ts";
import { approveSceneReview, regenerateSceneReview } from "../pipeline/scene-review.ts";
import type { ProjectStore } from "../store/project-store.ts";

export interface ScenesRouteOptions {
  store: ProjectStore;
  baseLogger: Logger;
  eventBus: PipelineEventBus;
  getImageProvider: (projectId: string) => ImageProvider;
  activeRuns?: Set<string>;
}

/**
 * The review-gate routes task 006 adds on top of the pipeline's own `awaiting_review` pause
 * (../../.claude/rules/flow-automation.md): approve picks one already-generated variant and
 * advances the scene; regenerate calls `ImageProvider.generateImage` again for the SAME scene,
 * appending a new variant without touching its status. Neither route re-invokes the pipeline
 * engine — the FE previews the result and triggers the final `POST /render` itself once every
 * scene is approved (../../.claude/plan/task-006-review-gate.md's "Preview qua Player trước khi
 * bấm Render cuối"). Both handlers stay thin: all the real logic lives in
 * `../pipeline/scene-review.ts` (../.claude/rules/backend-conventions.md).
 */
const scenesRoutes: FastifyPluginCallback<ScenesRouteOptions> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/api/projects/:id/scenes/:index/approve",
    {
      schema: {
        params: projectSceneParamsSchema,
        body: approveSceneBodySchema,
        response: { 200: projectObjectSchema },
      },
    },
    async (request) => {
      const { id, index } = request.params;
      const project = await approveSceneReview(opts.store, id, index, request.body.variantIndex, opts.activeRuns);
      // `approve` is the one review-gate mutation that changes a scene's STATUS (regenerate never
      // does), so it is the one that must reach the SSE `scene` event stream per api-design.md's
      // "on every scene status change" — the pipeline engine itself never runs during a pause, so
      // nothing else would ever emit this.
      const scene = project.scenes[index];
      if (scene !== undefined && project.runId !== undefined) {
        opts.eventBus.emit(id, {
          type: "scene",
          projectId: id,
          runId: project.runId,
          sceneIndex: index,
          status: scene.status,
        });
      }
      return project;
    },
  );

  app.post(
    "/api/projects/:id/scenes/:index/regenerate",
    { schema: { params: projectSceneParamsSchema, response: { 200: projectObjectSchema } } },
    async (request) => {
      const { id, index } = request.params;
      return regenerateSceneReview(
        opts.store,
        opts.getImageProvider(id),
        opts.baseLogger,
        id,
        index,
      );
    },
  );

  done();
};

export default scenesRoutes;
