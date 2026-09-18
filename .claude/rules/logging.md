# Logging (optimized for AI tracing)

Goal: log structured enough that Claude can grep the **full trace** of a run using only the run ID.

## Required

- **Structured logs** (JSON via pino), not free-form strings.
- **Correlation fields on every log line of the same run:** `projectId`, `runId`, `sceneIndex` (when scene-scoped), `stage` (e.g. `image`, `tts`, `render`), `attempt`. Generated at pipeline start, propagated through every child logger.
- Each **cross-boundary call** (HTTP to Vbee, Playwright action against Flow, render start/end) logs both entry and exit with timing.
- Consistent event-name prefixes: `domain.action[.outcome]` (e.g. `vbee.request.submit`, `vbee.request.submit.error`, `flow.image.generate.success`, `pipeline.scene.retry`).

## Log levels

- `error`: needs attention. `warn`: abnormal but handled (e.g. a retry scheduled). `info`: business milestones (scene started/completed, run finished). `debug`: development detail (raw provider payloads, minus secrets).
- Never log secrets/PII: logs replicate to systems with weaker access control than the source data, so a secret written once is exposed everywhere the log travels. Redact `authorization`, `app-id`, `VBEE_TOKEN`, `audioLink`, and any `X-Amz-*` query params via pino's root `redact` option (set once on the root logger, never overridden on a child — a child's `redact` replaces the parent's list instead of merging).
- The per-run NDJSON file (`be/src/logging/ndjson-file.ts`, task 003) and the SSE `log` event both bypass pino's own `redact` option, since they are written directly rather than through the pino serializer. `be/src/pipeline/pipeline-engine.ts` therefore never logs a raw `AppError.context` (where a secret could live) — only `{code, message}` via its own `toSceneError`. A provider that puts a secret into an `AppError`'s `message` string itself (rather than `context`) defeats this; that provider's OWN code is where the redaction responsibility starts (see `vbee-tts.md`'s explicit redact list for `VbeeTtsProvider`, task 004).
- On any error inside `FlowImageProvider`, capture a screenshot + `page.content()` as run artifacts before rethrowing.

## Tooling

- Logging library: pino 10, one root logger with `redact`, passed into `fastify({ logger })`; pipeline code uses `logger.child({...})`.
- Where logs go: `projects/<projectId>/logs/run-<runId>.ndjson` (per-run detail, `be/src/pipeline/pipeline-engine.ts` + `be/src/logging/ndjson-file.ts`, task 003) + pino-pretty on the terminal in dev. The FE exposes a Log tab per project (tails the run's NDJSON over SSE). **Known gap (task 003):** the process-wide `logs/app.ndjson` and a `pino.transport` multi-target root logger described in an earlier draft of this rule were never implemented — `be/src/logger.ts` only wires `pino-pretty` in dev and nothing in production. Add the file target (or drop this line) before task 004 relies on a persistent app-wide log.
