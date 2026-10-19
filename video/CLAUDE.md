# flow-ex (auto-video) — Video composition

> A sub-package of the CCF monorepo. Inherits the root spec at `../CLAUDE.md`. git lives at the repo root, NOT here.
> STRICTLY SEQUENTIAL, verification-first — see the root spec.

## What this package is

The Remotion composition used by the SSR renderer (`be/src/render/`):
timing math (`src/timing/`, pure, no IO), the `TransitionSeries` composition with Ken Burns +
cross-zoom transitions (`src/compositions/`), and the `registerRoot` entry point the bundler needs
(`src/entry.ts`). Nothing in this package reads a file, makes a network call, or knows about a
project on disk — it only ever receives props and asset URLs from whoever mounts it.

## Rules (imported)

> Keep this file < 200 lines AND < 12KB, whichever binds first.
@../.claude/rules/video.md

> Root rules (tech-stack, coding-conventions, testing, error-handling...) apply from `../.claude/rules/`.
