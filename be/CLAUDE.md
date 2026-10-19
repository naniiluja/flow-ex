# flow-ex (auto-video) — Backend

> A sub-package of the CCF monorepo. Inherits the root spec at `../CLAUDE.md`. git lives at the repo root, NOT here.
> STRICTLY SEQUENTIAL, verification-first — see the root spec.

## What this backend is

Fastify server that owns the pipeline: accepts a scene JSON, runs each scene through image generation
(Flow) and TTS (Vbee), lets the user pause to review/regenerate, transcribes captions (Whisper), and
renders the final MP4 via Remotion SSR. Exposes progress over SSE and the REST API (`/api/*`) that skills drive; there is no UI and no MCP server.

## Backend rules (imported)

> Keep this file < 200 lines AND < 12KB, whichever binds first. Check both with `wc -lc CLAUDE.md`, not by eye: a low line count can still hide a heavy single line.
@.claude/rules/api-design.md
@.claude/rules/data-layer.md
@.claude/rules/backend-conventions.md
@.claude/rules/flow-automation.md
@.claude/rules/vbee-tts.md

> Root rules (tech-stack, logging, testing, error-handling, debugging...) apply from `../.claude/rules/`.
