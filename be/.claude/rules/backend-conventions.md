---
paths: ["be/**"]
---

# Backend Conventions

## Structure

- Folder organization: `be/src/routes/` (Fastify handlers) → `be/src/pipeline/` (state machine, retry, orchestration) → `be/src/domain/` (types, `AppError`, provider interfaces) ← `be/src/providers/{flow,vbee}/` (concrete providers) and `be/src/store/` (project persistence).
- Dependency injection: plain constructor/factory parameters (e.g. `createPipeline({ imageProvider, ttsProvider, store, logger })`), no DI container/framework.

## Verifiable rules

- Thin handlers, logic in service/pipeline.
- Config via env vars (`VBEE_APP_ID`, `VBEE_TOKEN`, `VBEE_WEBHOOK_URL`, `PORT`, `CHROME_USER_DATA_DIR`, `LOG_LEVEL`, `NODE_ENV`; `PROJECTS_DIR` is an internal override for tests/local runs only, not user-facing), validated once at startup with a zod schema (`be/src/env.ts`); never hardcode secrets: a committed secret outlives its own rotation and leaks through every clone/fork of the repo.
- Every endpoint has a test (per `../.claude/rules/testing.md`).
- Graceful shutdown: catch `SIGINT`/`SIGTERM` and call `fastify.close()` before exit, so an in-flight write finishes instead of corrupting `project.json`. On close, branch on success/failure (`app.close().then(onOk, onError)`); never `void`/`.finally()`-swallow a rejected close, which would exit 0 on a failed shutdown.
- Only wrap a route plugin in `fastify-plugin` (`fp()`) when it must leak a decorator/hook to the PARENT scope. A plain route-registration plugin (like `be/src/routes/projects.ts`) should stay encapsulated and export the bare `FastifyPluginCallback`/`FastifyPluginAsync` function; `fp()` there breaks encapsulation for no benefit.
- `AppError`'s HTTP status comes from an explicit `code → status` table in `be/src/app.ts` (`STATUS_BY_APP_ERROR_CODE`) plus an `errorKind` fallback, never a chained ternary — a new error code should only need a table entry when it needs a non-default status.
