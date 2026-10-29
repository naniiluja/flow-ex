# flow-ex (auto-video)

> Managed by **CCF (Claude Context First)**. Workflow: Explore → Plan → Implement → Commit.
> **STRICTLY SEQUENTIAL for code**: one task at a time, no parallel feature development — parallel edits to one codebase create merge conflicts and unreviewable interleaved changes.
> **Video production runs in PARALLEL where steps are independent** (narration, watermark removal, clip generation, render): start each in the background and serialize only a real data dependency (e.g. approved stills before clip jobs). The sequential rule above never justifies waiting on an unrelated step.
> Ground every design decision in Context7 + Microsoft Learn.
> Keep this spec always fresh with `/ccf:updatespec`.

## What this is

A localhost tool that turns a scene-by-scene JSON script into a finished MP4. It drives a real Chrome
profile via Playwright to generate images on Google Flow, generates narration audio via the Vbee TTS
API, transcribes it word-by-word with Whisper for TikTok-style captions, and renders everything with
Remotion into a video where images stay in sync with the voice and transitions feel modern.

## Direction (2026-10-18): no UI, no MCP; skills drive the REST API

The React frontend (`fe/`) was removed; the project is driven by skills (`.claude/skills/`) calling the REST API in `be/`. The MCP server was removed on 2026-10-18.
The primary output is the clip video of the `collage-broll` skill: Flow stills approved in review, one Flow video clip per
scene, assembled with ffmpeg together with the Vbee narration and word captions. Long stories narrate in ONE Vbee call with pitch emphasis (`narrate-expressive.mjs`) and use clips only for key scenes. `output.mp4` from the Remotion pipeline
is the still-image (Ken Burns) fallback. Clips are deliberately NOT part of the Remotion composition.

## Repo layout (monorepo)

- The root folder holds `CLAUDE.md`, `.claude/`, docker files, CI/CD files. **git init at the root**, not in sub-folders.
- `be/` — Fastify backend: pipeline engine, `ImageProvider`/`TtsProvider` implementations, project store, SSE, and the REST API (`/api/*`) that skills drive.
- `video/` — Remotion composition used by the backend renderer (`bundle()` + `renderMedia()`): timing, safe-viewport (watermark avoidance), captions.
- `packages/shared-schemas/` — zod schemas for the scene/script/project JSON contract (`@flow-ex/shared-schemas`), imported by `be/` and `video/` so the shape is defined once.

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
@.claude/rules/script-writing.md
@.claude/rules/script-review.md
@.claude/rules/script-fan-voice.md
@.claude/rules/video-retention.md
@.claude/rules/voice-tuning.md
@.claude/rules/hand-drawn-video.md
@.claude/rules/lemo-hd2d-video.md
@.claude/rules/lemo-whiteboard-video.md
@.claude/rules/lemo-caption-news-video.md
@.claude/rules/lemo-long-video.md
@.claude/rules/ai-art-quality.md

## Current plan

See `.claude/plan/PLAN.md` for the sequential backlog of the CURRENT iteration. Execute **one task at a time**, directly in the session (no spawned coding subagent), in order; do not start task N+1 until task N is implemented + tested + checked. Closed iterations move to `.claude/plan/ARCHIVE.md` (task files to `.claude/plan/archive/`), so keep this section about the work in flight — not a running history. Archive it, never delete it.
