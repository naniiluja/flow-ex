# Tooling (available skills / MCP / subagents — WHEN TO USE)

A catalog of this project's tools, with **when to use** each, so future-session agents can decide. Updated by `/ccf:updatespec` whenever a new tool is added.

## MCP servers

- **flow-ex has no MCP server** (removed 2026-10-18 at the owner's request). Drive projects through the REST API under `/api/*`: `POST /api/projects`, `POST /api/projects/:id/render`, `POST /api/projects/:id/scenes/:index/approve|regenerate`, `GET /api/projects/:id`, `GET /api/projects/:id/logs`. Check an MP4 with `ffprobe` (`be/` ships `@ffprobe-installer/ffprobe`); import a web image by downloading it yourself and placing it under the project's `assets/`.
- **context7** — look up current docs for libraries/frameworks. **Use when:** you need a lib's API syntax/best practice/migration. How: `resolve-library-id` → `query-docs`.
- **microsoft-learn** — look up Microsoft/.NET/Azure docs. **Use when:** working with a Microsoft platform (not expected in this project, but available).

## Skills

- **ccf:plan** — detail the next task before implementing it. **Use when:** starting a new task from `.claude/plan/`.
- **ccf:check** — verify conformance/SOLID before marking a task `done`. **Use when:** a task's code + tests are complete.
- **ccf:updatespec** — refresh the spec and mark a task `done`. **Use when:** `/ccf:check` passed.
- **ccf:cook** — run the one-task-at-a-time loop across the whole backlog. **Use when:** implementing several tasks in sequence without re-invoking each by hand.
- **write-video-script** (`.claude/skills/write-video-script/SKILL.md`, task 012) — bắt đầu bằng `grill-me video` để chốt brief từng câu một, rồi chạy workflow bắt buộc (research via WebSearch → premise/hook/payoff → raw prose draft → self-critique checklist → scene split + imagePrompt → export `scriptInputSchema` JSON) cho short video sẵn sàng `POST /api/projects`. **Use when:** người dùng yêu cầu viết hoặc tạo video TikTok/Shorts hay JSON script input cho flow-ex; không dùng cho long-form script hoặc chỉnh nhỏ một JSON đã hợp lệ.
  - **`scripts/check_script.py`** + **`references/vi-writing-guide.md`** (2026-10-25) — máy soát kịch bản theo bộ quy tắc tiếng Việt người dùng gửi (âm tiết mỗi câu, dấu thanh kiểu cũ, i/y, "được/bởi/Việc/Sự", câu hai "thì", em-dash, chữ số). **Use when:** mọi kịch bản lời đọc, trước khi gen giọng.
- **Third-party video skills (2026-10-16, vendored into `.claude/skills/`, trimmed of example media).** None of them feeds the flow-ex pipeline (Flow + Vbee + Remotion); they produce standalone videos. They are the user's pick, not part of the app.
  - **hyperframes** (21 sibling skills, `heygen-com/hyperframes`, Apache-2.0) — HTML → MP4 for agents; entry point `/hyperframes`, which routes to the others (`product-launch-video`, `faceless-explainer`, `motion-graphics`, `embedded-captions`...). Needs the `npx hyperframes` CLI at run time. **Use when:** any promo/explainer/motion-graphic video that is not the flow-ex pipeline.
  - **onetake** (`feitangyuan/onetake`) — one-continuous-take product/launch films from a single HTML comp. **PolyForm Noncommercial license: personal/study use only.** Upstream `cases/`, `gallery/`, `assets/` (~100MB of examples) were NOT copied, so SKILL.md's `cases/<name>` example paths do not exist locally.
  - **gbro-collage-broll** was removed (2026-10-16): Codex-only (its Gate 2 uses Codex's `image_gen`). Its metaphor + style design was ported as `collage-broll` below.
  - **lemo-opuscar** (`lemomo-ai/lemo-opuscar`, MIT) — 51 code-made film styles. The vendored skill is a 12KB shim: its `scripts/setup.sh` clones the real library into `~/lemo-opuscar` on first use (network + disk outside the repo). **Use when:** a code-made film in a named style; for pixel-sprite characters in the `hd-2d` set follow `lemo-hd2d-video.md`.
  - **claude-animation-base** (`JohnHeibel/ClaudeAnimationBase`, MIT) — hand-painted Clawd cartoons via p5.js + p5.brush. Upstream has no SKILL.md; ours is hand-written and only routes to `ANIMATION_GUIDE.md`. Needs `npm install` inside its folder; output goes to its git-ignored `out/`.
- **collage-broll** (`.claude/skills/collage-broll/SKILL.md`, 2026-10-16, adapted from `pyang5166/gbro-collage-broll`, MIT, licence kept beside it) — halftone paper-collage style layer on top of `write-video-script` PLUS a video stage: Gate 1 metaphor approval per scene, a verbatim style signature + colour-by-meaning table in every `imagePrompt`, Flow generates the stills (0 credit), flow-ex's `reviewEnabled` review step is the still-approval gate, then OPTIONAL Gate 3 (user approval first, spends credits): `scripts/prepare-video-jobs.mjs` + `flow-video.mjs` (Flow Video > Frames Start/End, Omni 1.1 Flash 720p, 4s=7/6s=10/8s=12/10s=15 credits, mandatory `--max-credits`) + `assemble-video.mjs` (ffmpeg: clips + Vbee audio + ASS word captions). **Use when:** the user wants a paper-collage / halftone look, with or without animated assembly clips. Flow video facts were verified live 2026-10-16 (listed in the SKILL.md). The clips are NOT wired into the Remotion pipeline (no `videoFile` in the schema); they are assembled by ffmpeg outside it.
  - **`scripts/narrate-expressive.mjs`** (2026-10-18) — one Vbee call for the whole story, splice cleanup (`prosody/declick.py`), whisper per paragraph, pitch emphasis + word lengthening with Praat (`prosody/emphasis.py`), writes `narration-expressive/timeline.json`. **Use when:** any story longer than a few scenes; the user rejected per-scene narration as choppy and flat. Example: `node --env-file=.env $S/narrate-expressive.mjs --project <id> --voice <code>`. `narrate-whole.mjs` is the same without pitch work.
  - **`scripts/prosody/pauses.py`, `insert_pause.py`, `shout.py`** (2026-10-24/25) — chỉnh khoảng nghỉ của bản đọc sau narrate-expressive (xem `voice-tuning.md`). **Use when:** luôn chạy `pauses.py` (`WHISPER_DIR=be/.whisper-cache`); mỗi dòng `SKIP` thì chọn điểm cắt bằng whisper rồi `insert_pause.py in.wav tl.json out.wav out.json 192.21:0.45`; lời hô một chữ thì `shout.py`.
  - **`prosody/emphasis.py` + `narrate-expressive.mjs --cues cues.json`** (2026-10-25) — chỉ đạo cao độ/nhịp từng câu sau Vbee. **Use when:** chỉ khi người dùng muốn thử lại; mẫu A/B đầu tiên bị chê giả (`voice-tuning.md`).
- **Real-ESRGAN** (`~/Developer/tools/realesrgan/realesrgan-ncnn-vulkan`, bản ncnn macOS arm64, BSD, offline) — phóng x4 tranh anime. **Use when:** ảnh Flow nhỏ hơn cỡ hiển thị; `-n realesrgan-x4plus-anime -i in -o out`; quy tắc ghép mặt ở `ai-art-quality.md`.
  - **`scripts/unstar.py`** (2026-10-25) — xoá ngôi sao Gemini trên ảnh Flow bằng cách đảo phép trộn alpha (giữ nét bên dưới), đo bản đồ alpha một lần trên ảnh góc phẳng. **Use when:** ảnh Flow làm hậu cảnh có vật nằm dưới ngôi sao (cách chép mảng nền làm gãy nét). `python unstar.py measure flat.jpg alpha.npy` rồi `apply alpha.npy in.jpg out.jpg`.
  - **`scripts/assemble-video.mjs --clips <dir> --stills <dir> --timeline <timeline.json> --music <bed>`** — mixes Flow clips (key scenes) with Ken Burns stills (`remove-image-watermark.mjs` output) over one continuous narration. **Use when:** a long video cannot afford a clip per scene (80 scenes = 1.154 credits).
  - **`scripts/make-ambient-music.mjs --mood calm|dark`** — royalty-free bed synthesized by ffmpeg. **Use when:** the user wants background music and gave no file.

## Browser automation

- **claude-in-chrome** — used during planning/spec work to inspect Google Flow's live DOM (selectors, element structure) so `flow-automation.md` stays accurate when Flow's UI changes. **Not used at runtime**: the running app drives Chrome via Playwright's `connectOverCDP`, not this MCP tool.

## Subagents (CCF)

Every CCF subagent is READ-ONLY: discovery, review or best-practice grounding, never coding. Implementing a task happens directly in the main session (after /ccf:plan), never through a spawned coding subagent — a spawn adds a wait for a separate context and result, which is slower than writing the code directly with the plan already loaded.

- **ccf-codebase-analyzer** — map or scope the codebase. **Use when:** onboarding (/ccf:init) or before planning a change (/ccf:plan).
- **ccf-spec-checker** — review conformance/SOLID. **Use when:** /ccf:check.
- **ccf-best-practice-researcher** — fetch best practices. **Use when:** grounding a decision.

## System memory vs Spec (WHEN TO write where)

- **Spec** (this file + other rules): project rules that are derivable / belong to the repo. Lower weight (user message).
- **Memory** (`~/.claude/projects/<path>/memory/`): `feedback` anti-mistakes + `user` preferences. Higher weight (system prompt) → Claude repeats fewer mistakes. Updated via `/ccf:updatespec`. **Do not duplicate** CLAUDE.md content.
- **MEMORY.md is a pure index** — only its first **200 lines or 25KB** (whichever first) load per session, so keep it lean (curate when near). The strongest tier is `feedback` (record wins + losses, with a mandatory `Why`).
