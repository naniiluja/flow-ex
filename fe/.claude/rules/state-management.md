---
paths: ["fe/**"]
---

# State Management

## Rules

- State library: TanStack Query 5 for all server state; React's own `useState`/`useReducer` for local UI state.
- Separate server state from client state: anything that came from `/api/*` (project data, scene status) lives in a TanStack Query cache keyed by `['project', projectId]`; anything that is pure UI (a dialog open/closed, a selected tab) stays local.
- Data fetching: TanStack Query for reads/mutations; the project's SSE stream (`/api/projects/:id/events`) calls `queryClient.setQueryData`/`invalidateQueries` on each event instead of polling. Handle loading/error explicitly in every page (skeleton for loading, an inline error state, never a silent blank screen).
- Keep state that only one component uses in that component's own local state; promoting it to global state couples unrelated components and forces wider re-renders.

## Sync with the API

- Data shapes match the backend contract (`../../be/.claude/rules/api-design.md`); validate responses at the boundary with the zod schemas from `@flow-ex/shared-schemas` (`packages/shared-schemas/`), the same package the backend imports — one definition, no duplicated schema.
