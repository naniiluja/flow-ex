# Architecture

## Layering & boundaries

`be/`: routes (Fastify) → pipeline/services → domain (project state machine, scene model) ← providers (`ImageProvider`, `TtsProvider` implementations). `video/`: pure composition + timing math, no IO, consumed by the backend renderer.

## Dependency direction

- Dependencies flow one way only: routes/handlers → services/pipeline → domain ← providers (providers implement domain interfaces, domain never imports a concrete provider).
- Business logic does NOT depend on frameworks/IO directly: the pipeline engine takes `ImageProvider`/`TtsProvider` as constructor params, never imports Playwright or the Vbee HTTP client directly.

## Design patterns

- Backend: layered service architecture with the provider/strategy pattern for `ImageProvider` (Flow) and `TtsProvider` (Vbee), so a provider can be swapped or faked in tests without touching the pipeline.

## Where things go

- `be/src/routes/` — Fastify route handlers (thin).
- `be/src/pipeline/` — state machine, retry scheduling, orchestration (covered by the 80% coverage target).
- `be/src/providers/flow/` — `FlowImageProvider` (Playwright/CDP).
- `be/src/providers/vbee/` — `VbeeTtsProvider`.
- `be/src/store/` — project folder + `project.json` atomic read/write.
- `packages/shared-schemas/` — zod schemas for the scene/script/project JSON contract, imported by `be/` and `video/` (`@flow-ex/shared-schemas`) so the shape is defined once, per DRY.
- `video/src/compositions/` — Remotion `TransitionSeries` composition; `video/src/timing/` — duration math + safe-viewport (covered by the 80% coverage target); `video/src/captions/` — TikTok-style caption component.

## Verifiable rules

- Each module has one clear responsibility (Single Responsibility).
- No circular imports between layers: a cycle makes each side untestable in isolation and hides the true dependency direction.
