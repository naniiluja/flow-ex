---
paths: ["fe/**"]
---

# Component Design

## Rules

- Component style: function components only, not class.
- Split presentational vs container by data ownership: a page component owns the TanStack Query hooks and SSE subscription, and passes plain props down to presentational children that own no fetching.
- One component, one responsibility; split when too large.
- Props are clearly typed; avoid deep prop-drilling (use TanStack Query / local context if needed).

## Structure

- Component folder organization: `fe/src/components/` (shared/presentational, includes shadcn-generated components under `fe/src/components/ui/`), `fe/src/pages/` (route-level containers).
- Styling: Tailwind CSS + shadcn/ui.
- Component library: shadcn/ui, `base-nova` style (Base UI primitives — `@base-ui/react` — + Tailwind, `cn` package for class merging; `components.json` is the source of truth for the style/aliases actually installed). Prefer existing library components; do NOT hand-build primitives the library already provides. Install/inspect components via the shadcn MCP or `pnpm dlx shadcn@latest add <name>` (see `../../.claude/rules/tooling.md`).

## Adding a shadcn component

- Use the shadcn MCP (or `npx shadcn@latest add <name>`) to add a component, then adapt it — do NOT copy-paste an ad-hoc reimplementation.
