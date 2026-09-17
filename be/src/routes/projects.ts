import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";

import {
  projectIdParamsSchema,
  projectObjectSchema,
  scriptInputSchema,
} from "@flow-ex/shared-schemas";

import type { ProjectStore } from "../store/project-store.ts";

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

  done();
};

export default projectsRoutes;
