# flow-ex (auto-video) — Frontend

> A sub-package of the CCF monorepo. Inherits the root spec at `../CLAUDE.md`. git lives at the repo root, NOT here.
> STRICTLY SEQUENTIAL, verification-first — see the root spec.

## What this frontend is

A single-page localhost UI: paste/upload the scene JSON, watch the pipeline progress live over SSE
(scene list, per-stage status, a Log tab), pause at the review gate to pick/regenerate an image variant,
and preview the composed video via the Remotion Player before triggering the final render.

## Frontend rules (imported)

> Keep this file < 200 lines AND < 12KB, whichever binds first. Check both with `wc -lc CLAUDE.md`, not by eye: a low line count can still hide a heavy single line.
@.claude/rules/component-design.md
@.claude/rules/state-management.md
@.claude/rules/frontend-conventions.md

> Root rules (tech-stack, logging, testing, error-handling, debugging...) apply from `../.claude/rules/`.
> The API contract defined by the backend (`../be/.claude/rules/api-design.md`) is the source of truth when calling the API.
