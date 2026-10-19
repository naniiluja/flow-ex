# Tech Stack

Philosophy: prefer the **most stable, most widely-supported, least-buggy** stack — mainstream, avoid bleeding-edge. For each library, pick the most popular / best-maintained option.

## Chosen stack

- Language: TypeScript (strict), no `any`.
- Package manager: pnpm 11.x workspace, with a root `pnpm-workspace.yaml` catalog pinning shared versions.
- Runtime: Node 24 LTS, managed via `nvm` (see `~/.zprofile`), env read via `node --env-file=.env`.
- Backend: Fastify 5.12 (`be/`).
- Shared video composition: Remotion 4.0.525, pinned exactly for every `remotion`/`@remotion/*` package (npm has no v5 yet) (`video/`).
- Storage: no DB — one project folder per run, `project.json` written atomically.
- Hosting: localhost only; not deployed.

## Core libraries (one fixed choice per concern)

- Validation at every boundary: zod 4.
- HTTP framework validation: `@fastify/type-provider-zod` 1.x.
- Static file serving (project assets, finished output): `@fastify/static` 10.
- Agent control plane: the REST API under `/api/*` (zod-validated, `be/src/routes/`) driven by skills and scripts. The MCP server (`/mcp`, `@modelcontextprotocol/*`) was removed on 2026-10-18 at the owner's request; do not re-add it without being asked.
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
- ffprobe/ffmpeg: `@ffprobe-installer/ffprobe` 2.1.2 (`be/` `dependencies`, task 004 — measures real TTS audio duration at runtime) + `@ffmpeg-installer/ffmpeg` 1.1.0 (`be/` `dependencies` since task 007, moved out of `devDependencies` when `providers/whisper/convert-to-wav.ts` started using it at runtime to convert audio to the 16kHz mono WAV whisper.cpp requires; task 002's render-verification tests use the same installed binary). These npm-packaged static binaries were chosen over a system Homebrew install specifically because Homebrew requires accepting the machine's Xcode license (a `sudo` step outside this tool's own reach — the exact wall `@remotion/install-whisper-cpp`'s own `make`-from-source build hits, since it has no npm-packaged binary alternative), while the npm installers need no elevated permission and pin an exact, reproducible binary version per platform.

## TypeScript module resolution
- `be/`, `video/`, `packages/shared-schemas/` run directly under Node's built-in TypeScript type-stripping (`node src/server.ts`, no build step): `tsconfig.base.json` sets `module`/`moduleResolution: NodeNext` and relative imports **must use a literal `.ts` extension** (`from "./app.ts"`), per `nodejs.org/api/typescript` — Node's loader does not remap a `.js` specifier to a co-located `.ts` file.
- `exactOptionalPropertyTypes` is deliberately **off** in `tsconfig.base.json`: Fastify's and pino's own type definitions are not written to satisfy it (optional properties without an explicit `| undefined`), so turning it on produces cascading false-positive errors in `be/` unrelated to real bugs, not caught bugs.
- zod 4.6+: use the top-level `z.uuid()` / `z.iso.datetime()`, not the deprecated chained `z.string().uuid()` / `z.string().datetime()`.

## Rules
- Skill scripts under `.claude/skills/*/scripts/` may use Python libraries (`praat-parselmouth`, `numpy`, `scipy`) only through `uv run --with <pkg>`; they never become a dependency of `be/`, `video/` or `packages/`.
- Do not add a new library outside the list above without comparing best practices via Context7 and updating this file.
- Pin versions in the pnpm catalog; major upgrades require a recorded reason.
- Never pin `@remotion/*` with a `^` range — a version mismatch between Remotion packages is a documented source of runtime failures.
- Never run a bare `prettier --write .` (or `pnpm format`) without `.prettierignore` excluding `CLAUDE.md` / `**/CLAUDE.md` / `.claude/`: Prettier's markdown formatter merges an `@path` import line that immediately follows a blockquote note into that blockquote (adding a `> ` prefix), which silently breaks CCF's `@import` mechanism. `.prettierignore` at the repo root already excludes these paths — keep that exclusion if `.prettierignore` is ever rewritten.
