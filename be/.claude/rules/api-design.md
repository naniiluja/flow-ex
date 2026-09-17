---
paths: ["be/**"]
---

# API Design

The API contract is the **source of truth** for the frontend to consume.

## Rules

- API style: REST under `/api/*`, plus one SSE stream per project for live progress: `GET /api/projects/:id/events`.
- Versioning: none yet (single localhost consumer); revisit if a second consumer ever appears.
- Status codes: `200` read/update ok, `201` resource created (`POST /api/projects`), `204` no body, `400` validation error, `404` not found, `409` conflicting state transition (e.g. approving a scene mid-generation), `500` unexpected.
- Request/response shapes: validate at the boundary with zod schemas shared between route and handler; declare shapes explicitly, no implicit `any` body.
- Endpoint naming: plural nouns, nested by ownership — `POST /api/projects`, `GET /api/projects/:id`, `POST /api/projects/:id/scenes/:index/regenerate`, `POST /api/projects/:id/render`.
- `GET /api/projects/:id/assets/*` (`be/src/routes/project-assets.ts`, task 003): serves a project's real generated images/audio from `projects/<id>/assets/**`, used by both the pipeline's render step and (once wired) the Player preview, per `video.md`'s "preview and render see identical bytes" rule.
- `POST /api/projects/:id/render` (`be/src/routes/render.ts`, task 003): starts that project's pipeline run in the background (`202`, no body contract yet) and returns immediately; progress is observed over the SSE stream below, not this response. Wires the fake image/tts providers until tasks 004/005 land the real ones. When the project's `reviewEnabled` is on (task 006), the SAME endpoint is what RESUMES a run paused at `runStatus: "awaiting_review"` once every scene is approved — there is no separate "resume" route.
- `POST /api/projects/:id/scenes/:index/approve` and `POST /api/projects/:id/scenes/:index/regenerate` (`be/src/routes/scenes.ts`, task 006): the review-gate actions, both returning the whole updated `Project` (`200`), never `202` — unlike `/render` they finish synchronously within the request. `approve` accepts an optional `{variantIndex?}` body; `regenerate` takes no body. Neither re-invokes the pipeline engine. `approve` is the one review-gate action that changes a scene's `status`, so it is also the one that emits an `event: scene` on the SSE stream below — `regenerate` only appends a variant and never emits, since its scene's `status` never changes.
- `GET /api/projects/:id/events` (`be/src/routes/events.ts`, task 003): one SSE stream per project. Two named event types: `event: scene` (`{type, projectId, runId, sceneIndex, status}`, on every scene status change) and `event: log` (`{type, projectId, runId, level, time, stage, msg, sceneIndex?, attempt?}`, one per pipeline log line — see `../../.claude/rules/logging.md`).
- **Temporary (task 002 only, still not removed):** `GET /api/samples/*` (`be/src/routes/assets.ts`) still serves the fixed 3-scene sample fixture set for the task-002 render integration test and demo `/preview` page. Task 003 added the REAL per-project route above alongside it rather than replacing it, since the demo page still depends on the fixed samples; remove both the sample route and the demo page together once the real project pipeline covers that page's purpose.

## Error shape

- Every error response is `{ "error": { "code": string, "message": string } }` (see `../.claude/rules/error-handling.md` for the `code`/status mapping). Never leak an `AppError.cause` stack trace into the response body.

## Contract

- Every endpoint must have a clear request/response shape so the FE can be cross-checked during `/ccf:check`.
