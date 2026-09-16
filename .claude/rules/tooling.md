# Tooling (available skills / MCP / subagents — WHEN TO USE)

A catalog of this project's tools, with **when to use** each, so future-session agents can decide. Updated by `/ccf:updatespec` whenever a new tool is added.

## MCP servers

- **context7** — look up current docs for libraries/frameworks. **Use when:** you need a lib's API syntax/best practice/migration. How: `resolve-library-id` → `query-docs`.
- **microsoft-learn** — look up Microsoft/.NET/Azure docs. **Use when:** working with a Microsoft platform (not expected in this project, but available).
- **shadcn** (`npx shadcn@latest mcp`) — browse/search/install shadcn registry components. **Use when:** adding or inspecting a UI component. Requires `components.json` (run `shadcn init` first, see closing note in the plan).

## Skills

- **ccf:plan** — detail the next task before implementing it. **Use when:** starting a new task from `.claude/plan/`.
- **ccf:check** — verify conformance/SOLID before marking a task `done`. **Use when:** a task's code + tests are complete.
- **ccf:updatespec** — refresh the spec and mark a task `done`. **Use when:** `/ccf:check` passed.
- **ccf:cook** — run the one-task-at-a-time loop across the whole backlog. **Use when:** implementing several tasks in sequence without re-invoking each by hand.

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
