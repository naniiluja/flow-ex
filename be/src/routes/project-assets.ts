import path from "node:path";

import fastifyStatic from "@fastify/static";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";

import { AppError } from "../domain/app-error.ts";

export interface ProjectAssetsRouteOptions {
  projectsRoot: string;
}

const paramsSchema = z.object({ id: z.uuid(), "*": z.string() });

/** Serves a project's generated images/audio over HTTP so the Player and the SSR renderer see
 * identical bytes (../../.claude/rules/video.md). Deliberately scoped to `<id>/assets/**` only
 * (../.claude/rules/data-layer.md) via an explicit path-containment check, rather than mounting
 * `@fastify/static`'s own wildcard route across the whole `projectsRoot` — that would also serve
 * `project.json`/`logs/**` on the same public path. `serve: false` below only asks the plugin to
 * decorate `reply.sendFile`, not to register its own catch-all route. */
const projectAssetsRoutes: FastifyPluginCallback<ProjectAssetsRouteOptions> = (
  fastify,
  opts,
  done,
) => {
  fastify.register(fastifyStatic, { root: opts.projectsRoot, serve: false });

  const app = fastify.withTypeProvider<ZodTypeProvider>();
  app.get("/api/projects/:id/assets/*", { schema: { params: paramsSchema } }, (request, reply) => {
    const { id } = request.params;
    const relativeAssetPath = request.params["*"];
    const assetsRoot = path.join(opts.projectsRoot, id, "assets");
    const resolved = path.resolve(assetsRoot, relativeAssetPath);
    if (resolved !== assetsRoot && !resolved.startsWith(assetsRoot + path.sep)) {
      throw new AppError({
        code: "ASSET_PATH_INVALID",
        errorKind: "fatal",
        message: "requested asset path escapes the project's assets folder",
        context: { projectId: id, relativeAssetPath },
      });
    }

    reply.header("Access-Control-Allow-Origin", "*");
    return reply.sendFile(path.relative(opts.projectsRoot, resolved));
  });

  done();
};

export default projectAssetsRoutes;
