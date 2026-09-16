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

## Design source

- No design handoff yet — consider creating one in Claude Design for a more polished UI.
