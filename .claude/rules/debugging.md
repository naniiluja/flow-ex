# Debugging (disciplined, no rushing)

Mandatory process when investigating a bug, followed directly in conversation (no separate debug command):

1. **Reproduce** — reconstruct the bug from symptom/input/environment before touching code.
2. **Trace step by step** — follow `runId`/`projectId` across `projects/<id>/logs/run-*.ndjson`, read entry+exit at each boundary.
3. **Inspect `project.json` read-only** (no DB in this project) — verify the scene/run state step by step.
4. **Isolate with evidence** — narrow the suspect area with file:line/log line/`project.json` field, not gut feeling.
5. **Failing test** — write a test reproducing the bug (red) first.
6. **Minimal fix** — fix only within scope, no side refactor.

> Never guess and fix on the spot before you have evidence.

## Known bugs (updated by /ccf:updatespec)

<!-- Each entry: symptom — root cause — how to prevent — related files -->

None yet.
