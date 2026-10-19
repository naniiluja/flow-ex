import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";

import { projectIdParamsSchema } from "@flow-ex/shared-schemas";

import { startProjectRun, type StartProjectRunDeps } from "../pipeline/start-project-run.ts";

export type RenderRouteOptions = Omit<StartProjectRunDeps, "getBaseUrl" | "activeRuns"> & { activeRuns?: Set<string> };

const renderRoutes: FastifyPluginCallback<RenderRouteOptions> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const activeRuns = opts.activeRuns ?? new Set<string>();
  app.post("/api/projects/:id/render", { schema: { params: projectIdParamsSchema } }, async (request, reply) => {
    const result = await startProjectRun({ ...opts, activeRuns, getBaseUrl: () => {
      const address = fastify.server.address();
      if (!address || typeof address === "string") throw new Error("render route: app is not listening");
      return `http://127.0.0.1:${String(address.port)}`;
    } }, request.params.id);
    reply.code(202);
    return result;
  });
  done();
};

export default renderRoutes;
