# flow-ex (auto-video)

> Managed by **CCF (Claude Context First)**. Workflow: Explore → Plan → Implement → Commit.
> **STRICTLY SEQUENTIAL**: one task at a time, no parallel feature development — parallel edits to one codebase create merge conflicts and unreviewable interleaved changes.
> Ground every design decision in Context7 + Microsoft Learn.
> Keep this spec always fresh with `/ccf:updatespec`.

## What this is

A localhost tool that turns a scene-by-scene JSON script into a finished MP4. It drives a real Chrome
profile via Playwright to generate images on Google Flow, generates narration audio via the Vbee TTS
API, transcribes it word-by-word with Whisper for TikTok-style captions, and renders everything with
Remotion into a video where images stay in sync with the voice and transitions feel modern.

## Repo layout (monorepo)

- The root folder holds `CLAUDE.md`, `.claude/`, docker files, CI/CD files. **git init at the root**, not in sub-folders.
- `be/` — Fastify backend: pipeline engine, `ImageProvider`/`TtsProvider` implementations, project store, SSE, static hosting of `fe/`.
- `fe/` — React + Vite frontend: script input, scene list, review/approve step, Player preview, log tab.
- `video/` — Remotion composition shared by the Player (preview) and the backend renderer (`bundle()` + `renderMedia()`): timing, safe-viewport (watermark avoidance), captions.
- `packages/shared-schemas/` — zod schemas for the scene/script/project JSON contract (`@flow-ex/shared-schemas`), imported by both `be/` and `fe/` so the shape is defined once.

## Rules (imported — detail lives in .claude/rules/)

> Keep this file < 200 lines AND < 12KB, whichever binds first. Check both with `wc -lc CLAUDE.md`, not by eye: a low line count can still hide a heavy single line.
@.claude/rules/tech-stack.md
@.claude/rules/architecture.md
@.claude/rules/coding-conventions.md
@.claude/rules/logging.md
@.claude/rules/testing.md
@.claude/rules/error-handling.md
@.claude/rules/debugging.md
@.claude/rules/tooling.md
@.claude/rules/git-workflow.md
@.claude/rules/video.md

## Current plan

See `.claude/plan/PLAN.md` for the sequential backlog of the CURRENT iteration. Execute **one task at a time**, directly in the session (no spawned coding subagent), in order; do not start task N+1 until task N is implemented + tested + checked. Closed iterations move to `.claude/plan/ARCHIVE.md` (task files to `.claude/plan/archive/`), so keep this section about the work in flight — not a running history. Archive it, never delete it.
