# Error Handling

## Taxonomy

- Distinguish **expected business errors** (validation, not-found, missing credit) from **system errors** (bugs, downstream failures).
- User-facing vs internal errors: different messages; never leak internal detail outward, since a stack trace or query string in a user-facing response hands an attacker a map of the system.
- Every domain error is an `AppError { code, errorKind, message, cause, context }` where `errorKind` is one of:
  - `transient` — retry per the schedule below (network error, timeout, 429, 5xx, malformed body on a non-401 status).
  - `needs_user` — stop the run and surface it in the UI/log (not logged in, out of Vbee credit, unknown `voiceCode`, any 401 regardless of body shape).
  - `fatal` — stop this scene/run, do not retry (bad input that will never succeed, e.g. a 400 unrelated to credit).

## Verifiable rules

- **No silent catch.** A caught error must be logged (with `projectId`/`runId`/`sceneIndex`) or re-thrown wrapped in `AppError` with context.
- Wrap errors with context when crossing a boundary (HTTP call, Playwright action, filesystem write); don't swallow the original stack trace (`cause`).
- Retry only `transient` errors with backoff; never retry `needs_user` or `fatal`.

## Retry schedule

- 1 initial attempt + 3 retries at ~30s, ~2m, ~5m, each with jitter, via the hand-written `retryWithSchedule([30_000, 120_000, 300_000], jitter, shouldRetry, signal)` (see `tech-stack.md` for why `p-retry` doesn't fit). Cancellable via `AbortSignal`.
- After the schedule is exhausted, the scene/run is marked failed and requires manual retry from the UI.
- **Known gap (task 003, still open after task 005):** `be/src/pipeline/pipeline-engine.ts` currently marks a scene `failed` the same way whether its retry schedule was exhausted OR a provider threw `needs_user` — both produce the same `PIPELINE_SCENE_ALREADY_FAILED` block on the next run, with no route to clear it. Task 005 shipped the first REAL `needs_user` producer for images (`FLOW_NOT_LOGGED_IN`), so this is no longer theoretical: a Flow login that lapses mid-run now needs a manual `project.json` edit to unstick, since neither `regenerate` (requires `awaiting_review`) nor any other route can move a scene out of `failed`. Deliberately NOT fixed in task 005/006/007 (scope discipline — none of their acceptance criteria call for it, and threading `errorKind` through persisted state plus a real resume path is its own vertical slice, not a one-line patch). Needs its own task before it's relied on in practice: `sceneErrorSchema` (`packages/shared-schemas`) needs an `errorKind` field on `lastError`, and the pipeline needs a way to resume a `needs_user`-failed scene without re-running its exhausted retry schedule.

## Error format

- Standard error type/shape: `AppError { code: string, errorKind: 'transient'|'needs_user'|'fatal', message: string, cause?: unknown, context?: Record<string, unknown> }`.
- Error code / HTTP status mapping (API responses): validation failure → 400 `{error:{code:"VALIDATION_ERROR",message}}` (covers both zod schema failures and a malformed request body Fastify itself rejects); not found → 404 `{error:{code:"<RESOURCE>_NOT_FOUND",message}}`, one resource-specific code per resource (e.g. `PROJECT_NOT_FOUND`, later `SCENE_NOT_FOUND`) rather than a single generic `NOT_FOUND`, so a client can branch on exactly what was missing (the plain `{code:"NOT_FOUND"}` from `be/src/app.ts`'s `setNotFoundHandler` is the one exception, for a route match failure/missing static file with no `AppError` behind it at all — see `be/.claude/rules/api-design.md`); `needs_user` maps to 409 via the `errorKind` fallback (first real producer: `PIPELINE_ALREADY_RUNNING`, `POST /api/projects/:id/render` rejecting a second render while one is genuinely still running IN THIS PROCESS — task 007 fixed a real bug here: the ORIGINAL task-003 guard rejected based on the PERSISTED `runStatus: "running"` alone, which permanently blocked the crash-resume path `pipeline-engine.ts` is built to support, since a crashed/restarted process leaves that status behind with no live run to match it; `be/src/routes/render.ts` now tracks genuinely active runs in an in-process `Set` instead); an `AppError` with no explicit status mapping and any other unhandled error → 500 `{error:{code:"INTERNAL_ERROR",message:"..."}}` with no internal detail in the message. The mapping itself lives in `be/src/app.ts`'s `STATUS_BY_APP_ERROR_CODE` table plus the `errorKind` fallback, not a chained if/else, so a new code only needs an entry there when it needs a non-default status.
