---
paths: ["be/**"]
---

# Data Layer

## Schema & migrations

- DB: none. Each run is a folder under `projects/<projectId>/` containing `project.json`, `logs/`, and per-scene asset subfolders (`images/`, `audio/`, `captions/`).
- Migrations: `project.json` carries a `schemaVersion` field; a version bump requires a one-time migration function run lazily on load (no separate migration tool, since there is no DB to migrate).
- Table/column naming: n/a (JSON file); use camelCase field names throughout `project.json`.

## Query patterns

- Access `project.json` via a single `be/src/store/project-store.ts` module (repository-style): all reads/writes go through it, nothing else touches the file directly.
- No N+1 concern (no DB), but avoid re-reading `project.json` from disk more than once per request; cache it in memory for the duration of a pipeline run and only reload on process restart.

## Rules

- Keep business logic in the pipeline/service layer, not the store: the store only serializes/deserializes and enforces atomic writes, it never decides what state transition is valid.
- Every write goes through `write-file-atomic` (temp file + rename) AND a per-project `p-queue` (concurrency 1) so two writes to the same `project.json` never interleave — this is the multi-step-atomicity equivalent of a DB transaction here.
