import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";
import Fastify, { type FastifyError } from "fastify";
import pino, { type Logger } from "pino";

import { AppError } from "./domain/app-error.ts";
import { createPipelineEventBus, type PipelineEventBus } from "./pipeline/pipeline-events.ts";
import assetsRoutes from "./routes/assets.ts";
import eventsRoutes from "./routes/events.ts";
import projectAssetsRoutes from "./routes/project-assets.ts";
import projectsRoutes from "./routes/projects.ts";
import renderRoutes, { type VbeeCredentials } from "./routes/render.ts";
import type { ProjectStore } from "./store/project-store.ts";

export interface BuildAppOptions {
  store: ProjectStore;
  loggerInstance?: Logger;
  /** Injectable so a test can observe/emit pipeline events directly; defaults to a fresh
   * per-app bus (../.claude/rules/architecture.md). */
  eventBus?: PipelineEventBus;
  /** Present -> real `VbeeTtsProvider`; absent -> `FakeTtsProvider` (task 003/004, see
   * `render.ts`). `server.ts` derives this from `env.VBEE_APP_ID`/`VBEE_TOKEN`. */
  vbeeCredentials?: VbeeCredentials;
}

/** Explicit code -> HTTP status map (see ../.claude/rules/error-handling.md). Anything not
 * listed here falls back to errorKind: needs_user -> 409, everything else -> 500, so a new
 * AppError code never needs an edit here unless it needs a NON-default status. */
const STATUS_BY_APP_ERROR_CODE: Record<string, number> = {
  PROJECT_NOT_FOUND: 404,
  ASSET_PATH_INVALID: 400,
};

function statusForAppError(error: AppError): number {
  const explicit = STATUS_BY_APP_ERROR_CODE[error.code];
  if (explicit !== undefined) {
    return explicit;
  }
  return error.errorKind === "needs_user" ? 409 : 500;
}

/** See ../.claude/rules/api-design.md for the route/error contract. */
export function buildApp(options: BuildAppOptions) {
  const fastify = Fastify(
    options.loggerInstance ? { loggerInstance: options.loggerInstance } : {},
  ).withTypeProvider<ZodTypeProvider>();

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      const status = statusForAppError(error);
      if (status >= 500) {
        // A 5xx AppError is a system fault (e.g. a corrupt file on our own disk), not a
        // client mistake; log the real code/cause but never leak it to the response body.
        request.log.error({ err: error }, "unhandled AppError");
        reply.code(status).send({ error: { code: "INTERNAL_ERROR", message: "Internal error" } });
        return;
      }
      reply.code(status).send({ error: { code: error.code, message: error.message } });
      return;
    }

    // Fastify itself flags malformed input (schema validation, bad JSON body, etc.) with a
    // sub-500 statusCode; treat all of those as a validation error without leaking its
    // internal code/message shape to the client.
    if (error.validation || (typeof error.statusCode === "number" && error.statusCode < 500)) {
      reply
        .code(error.statusCode ?? 400)
        .send({ error: { code: "VALIDATION_ERROR", message: error.message } });
      return;
    }

    request.log.error({ err: error }, "unhandled error");
    reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal error" } });
  });

  const baseLogger = options.loggerInstance ?? pino({ level: "silent" });
  const eventBus = options.eventBus ?? createPipelineEventBus();

  fastify.register(projectsRoutes, { store: options.store });
  fastify.register(assetsRoutes);
  fastify.register(projectAssetsRoutes, { projectsRoot: options.store.projectsRoot });
  fastify.register(renderRoutes, {
    store: options.store,
    eventBus,
    baseLogger,
    vbeeCredentials: options.vbeeCredentials,
  });
  fastify.register(eventsRoutes, { eventBus });

  return fastify;
}
