# Coding Conventions

## Formatting (verifiable)

- Indentation: 2-space.
- Formatter: run `pnpm format` (Prettier 3) before committing.
- Linter: `pnpm lint` (ESLint 10 + typescript-eslint `strictTypeChecked`) must pass.

## Naming

- Files: kebab-case (e.g. `flow-image-provider.ts`, `safe-viewport.ts`).
- Variables/functions: camelCase.
- Constants: UPPER_SNAKE_CASE for module-level fixed values (e.g. `RETRY_SCHEDULE_MS`); camelCase otherwise.

## File structure

- A file is at most ~300 lines; split if it exceeds.
- Import order: node builtins → external packages → workspace packages (e.g. `@flow-ex/shared-schemas`) → relative, each group separated by a blank line. A workspace package is its own group between third-party externals and relative imports (not folded into the external group) — this is what every file in `be/` since task 002/003 actually does, and it reads more clearly than merging the two.
- Relative imports use a literal `.ts` extension in every package (`be/`, `video/`, `packages/shared-schemas/`): Node runs them directly (see `tech-stack.md`).

## General rules

- No dead code / unused imports: dead code still costs reading time and misleads searches; delete it, git history keeps it.
- Comments must match the existing codebase's language (English, since the codebase itself is English).
- Enforceable coding rules live HERE in `.claude/rules` (subagents auto-load these); do NOT keep them only in an output style — an output style modifies the main loop and does not reach spawned subagents.
- No `any`; use `unknown` + narrowing or a proper generic instead.
- Every provider (`ImageProvider`, `TtsProvider`) is defined as a TypeScript interface in the domain layer; concrete providers implement it and are injected by constructor parameter (no DI container).
