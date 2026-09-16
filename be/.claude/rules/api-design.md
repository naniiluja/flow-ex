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

## Error shape

- Every error response is `{ "error": { "code": string, "message": string } }` (see `../.claude/rules/error-handling.md` for the `code`/status mapping). Never leak an `AppError.cause` stack trace into the response body.

## Contract

- Every endpoint must have a clear request/response shape so the FE can be cross-checked during `/ccf:check`.
