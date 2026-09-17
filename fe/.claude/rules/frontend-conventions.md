---
paths: ["fe/**"]
---

# Frontend Conventions

## Structure

- Folder organization: `fe/src/pages/` (routes), `fe/src/components/` (shared + `ui/` for shadcn), `fe/src/hooks/` (TanStack Query hooks, SSE subscription hook), `fe/src/lib/` (API client, zod schemas).
- Routing: React Router 8 — `/` (new project / JSON input), `/projects/:id` (scene list + progress + Log tab + review gate + Player preview).

## Verifiable rules

- Components have tests (per `../../.claude/rules/testing.md`).
- Don't call the API directly in presentational components; go through the `fe/src/hooks/` layer.
- Accessibility: every interactive control has an accessible name (label, `aria-label`, or visible text); shadcn/Radix primitives already satisfy this for their own parts, so only custom controls need an explicit check.
- Every UI primitive must come from the shadcn registry (`fe/components.json`, style `base-nova`) — add it via the shadcn MCP or `pnpm dlx shadcn@latest add <name>`, then adapt it. Never hand-roll a raw HTML/Tailwind stand-in (e.g. a plain `<div>` banner instead of `Alert`, a bare `<img>` grid instead of `AspectRatio`) for something the registry already provides (task 011).

## Design source

- No design handoff yet — consider creating one in Claude Design for a more polished UI.
