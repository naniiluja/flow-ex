---
paths: ["be/**"]
---

# Data Layer

## Schema & migrations

- DB: none. Each run is a folder under `projects/<projectId>/` containing `project.json`, `logs/`, `output.mp4` (once rendered), and an `assets/` folder holding per-scene subfolders (`assets/images/`, `assets/audio/`, `assets/captions/`). Generated assets are nested one level under `assets/` (not directly under the project folder) SPECIFICALLY so `GET /api/projects/:id/assets/*` (`be/src/routes/project-assets.ts`, task 003) can serve that one subtree over HTTP via a single `@fastify/static` wildcard root without also exposing `project.json`/`logs/` on the same public path — a plain per-project wildcard route without this boundary would leak both.
- Migrations: `project.json` carries a `schemaVersion` field; a version bump requires a one-time migration function run lazily on load (no separate migration tool, since there is no DB to migrate).
- Table/column naming: n/a (JSON file); use camelCase field names throughout `project.json`.

## Query patterns

- Access `project.json` via a single `be/src/store/project-store.ts` module (repository-style): all reads/writes go through it, nothing else touches the file directly.
- No N+1 concern (no DB). `ProjectStore.update()` (task 003) deliberately re-reads `project.json` from disk on EVERY call rather than caching it in memory across a pipeline run: that re-read from the actual on-disk state is exactly what makes a killed-and-resumed pipeline process safe (`be/src/pipeline/pipeline-resume-process-kill.test.ts`) — a run that trusted a stale in-memory copy after a crash could overwrite progress another process already persisted. The cost is one small file read per scene state transition, not per request.

## Rules

- Keep business logic in the pipeline/service layer, not the store: the store only serializes/deserializes and enforces atomic writes, it never decides what state transition is valid.
- Every write goes through `write-file-atomic` (temp file + rename) AND a per-project `p-queue` (concurrency 1) so two writes to the same `project.json` never interleave — this is the multi-step-atomicity equivalent of a DB transaction here.
