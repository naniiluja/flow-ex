import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { FastifyPluginCallback } from "fastify";

import { projectIdParamsSchema } from "@flow-ex/shared-schemas";

import type { PipelineEventBus } from "../pipeline/pipeline-events.ts";

export interface EventsRouteOptions {
  eventBus: PipelineEventBus;
}

const HEARTBEAT_INTERVAL_MS = 25_000;

/** `GET /api/projects/:id/events` (../.claude/rules/api-design.md): one SSE stream per project,
 * pushing every `scene`/`log` event the pipeline engine emits for that project id, so the FE
 * scene list and Log tab update live without polling. Uses `reply.hijack()` + `reply.raw`, since
 * no SSE plugin in the dependency list targets Fastify 5 yet. */
const eventsRoutes: FastifyPluginCallback<EventsRouteOptions> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    "/api/projects/:id/events",
    { schema: { params: projectIdParamsSchema } },
    (request, reply) => {
      const { id } = request.params;
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      // Flushes the headers immediately so the client's connection opens without waiting for the
      // first real event, which may be seconds away.
      reply.raw.write(":ok\n\n");

      const unsubscribe = opts.eventBus.subscribe(id, (event) => {
        reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        reply.raw.write(":heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        reply.raw.end();
      });
    },
  );

  done();
};

export default eventsRoutes;
