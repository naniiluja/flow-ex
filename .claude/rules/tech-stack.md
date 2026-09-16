# Tech Stack

Philosophy: prefer the **most stable, most widely-supported, least-buggy** stack — mainstream, avoid bleeding-edge. For each library, pick the most popular / best-maintained option.

## Chosen stack

- Language: TypeScript (strict), no `any`.
- Package manager: pnpm 11.x workspace, with a root `pnpm-workspace.yaml` catalog pinning shared versions.
- Runtime: Node 24 LTS, managed via `nvm` (see `~/.zprofile`), env read via `node --env-file=.env`.
- Backend: Fastify 5.12 (`be/`).
- Frontend: React 19 + Vite 8 + Tailwind 4 + shadcn/ui (`fe/`). shadcn's real installed style is `base-nova` (`fe/components.json`), which uses `@base-ui/react` primitives and the `cn` npm package for class merging, not Radix + clsx/tailwind-merge — always check `components.json` for the current style rather than assuming.
- Shared video composition: Remotion 4.0.525, pinned exactly for every `remotion`/`@remotion/*` package (npm has no v5 yet) (`video/`).
- Storage: no DB — one project folder per run, `project.json` written atomically.
- Hosting: localhost only; not deployed.

## Core libraries (one fixed choice per concern)

- Validation at every boundary: zod 4.
- HTTP framework validation: `@fastify/type-provider-zod` 1.x.
- Static hosting + SPA fallback: `@fastify/static` 10.
- Routing (FE): React Router 8.
- Server state (FE): TanStack Query 5, kept updated via SSE.
- Browser automation: Playwright 1.63, `connectOverCDP` into a real Chrome with a dedicated `--user-data-dir`.
- Logging: pino 10 + pino-pretty 13.
- Retry scheduling: hand-written `retryWithSchedule` (see `error-handling.md`) — `p-retry`'s factor model cannot express the fixed 30s/2m/5m schedule.
- Atomic writes: `write-file-atomic` 8, queued per-project so writes never interleave.
- Concurrency limiting: `p-queue` 9 (Flow: concurrency 1; Vbee: concurrency 2, lowered on repeated 429).
- Testing: Vitest 4.1.x (`test.projects`) + `@vitest/coverage-v8` 4.1.x + msw 2.
- Linting: ESLint 10 + typescript-eslint 8.70 (`strictTypeChecked`, `projectService: true`) + eslint-config-prettier 10.
- Formatting: Prettier 3.
- Speech-to-text (captions): whisper.cpp via `@remotion/install-whisper-cpp`, multilingual model, `language: 'vi'`.
- TypeScript version: 6.0.x (typescript-eslint 8.70 requires `<6.1.0`).

## TypeScript module resolution (two modes in this monorepo)
- `be/`, `video/`, `packages/shared-schemas/` run directly under Node's built-in TypeScript type-stripping (`node src/server.ts`, no build step): `tsconfig.base.json` sets `module`/`moduleResolution: NodeNext` and relative imports **must use a literal `.ts` extension** (`from "./app.ts"`), per `nodejs.org/api/typescript` — Node's loader does not remap a `.js` specifier to a co-located `.ts` file.
- `fe/` is consumed by Vite/esbuild, never by Node directly: its `tsconfig.json` overrides to `moduleResolution: "bundler"` + `allowImportingTsExtensions: true`, and its own convention is **extensionless** relative imports (`from "./app"`), matching Vite's official `create-vite` template.
- `exactOptionalPropertyTypes` is deliberately **off** in `tsconfig.base.json`: Fastify's and pino's own type definitions are not written to satisfy it (optional properties without an explicit `| undefined`), so turning it on produces cascading false-positive errors in `be/` unrelated to real bugs, not caught bugs.
- zod 4.6+: use the top-level `z.uuid()` / `z.iso.datetime()`, not the deprecated chained `z.string().uuid()` / `z.string().datetime()`.

## Rules
- Do not add a new library outside the list above without comparing best practices via Context7 and updating this file.
- Pin versions in the pnpm catalog; major upgrades require a recorded reason.
- Never pin `@remotion/*` with a `^` range — a version mismatch between Remotion packages is a documented source of runtime failures.
- Never run a bare `prettier --write .` (or `pnpm format`) without `.prettierignore` excluding `CLAUDE.md` / `**/CLAUDE.md` / `.claude/`: Prettier's markdown formatter merges an `@path` import line that immediately follows a blockquote note into that blockquote (adding a `> ` prefix), which silently breaks CCF's `@import` mechanism. `.prettierignore` at the repo root already excludes these paths — keep that exclusion if `.prettierignore` is ever rewritten.
