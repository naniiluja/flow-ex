# Testing (verification-first)

Philosophy: **write a failing test FIRST** before implementing/fixing — this is the single highest-leverage thing to let Claude verify its own work.

## Rules

- Each task: write a test reproducing the acceptance criteria (red) → implement → test green.
- Bug fix: write a test reproducing the bug (red) first, then fix.
- A task's acceptance criteria = concrete tests, not vague descriptions.

## Tooling & location

- Test framework: Vitest 4.1.x with `test.projects` at the root `vitest.config.ts` (one project per package: `be`, `fe`, `video`, `shared-schemas`).
- Run command: `pnpm test` (root, runs all projects); `pnpm --filter <pkg> test` for one package.
- **Every package's `package.json` must define its own `"test"` script** (`"test": "cd .. && vitest run --project <name>"`). Without it, `pnpm --filter <pkg> test` silently runs zero tests and exits 0 — a false green, the worst failure mode for a verification-first project. When adding a new workspace package, add both the `test.projects` entry in root `vitest.config.ts` AND this script in the same change.
- Tests live in: next to the source file, `*.test.ts` / `*.test.tsx` (e.g. `safe-viewport.ts` + `safe-viewport.test.ts`).
- **FE network tests (msw):** Node's native `fetch` rejects a relative URL, so a test exercising `fe/src/lib/api-client.ts` for real (not via `vi.spyOn`) needs `msw`'s `setupServer().listen()` to patch `globalThis.fetch` **first**, then wrap the resulting (already-patched) fetch with a small relative→absolute URL resolver — patching in the other order makes msw's own request parsing fail on the relative URL before it ever matches a handler.

## Coverage

- Coverage target: ≥80% for `be/src/pipeline/**` and `video/src/timing/**` (`@vitest/coverage-v8`, glob-scoped thresholds). No fixed target elsewhere.
- Core business paths must have tests before marking a task `done`.

## Test design discipline (when adopted)

- Matrix required: yes.
- Apply a **contract-level** design matrix to a function's PUBLIC signature (input → output / error), NOT to internal helpers. Test behavior, not implementation (kentcdodds.com/blog/write-tests).

### Techniques (ISTQB glossary — istqb-glossary.page)

- **Equivalence Partitioning (EP)**: split an input domain into classes that are treated alike; test one representative per class. Use to cut redundant cases.
- **Boundary Value Analysis (BVA)**: test the edges of each partition (min, min−1, max, max+1). Use where bugs cluster at limits.
- **Decision Table Testing**: enumerate combinations of input conditions → expected action; one row per rule. Use when output depends on several interacting conditions.

### Suggested matrix layout

One column per input condition, plus an `Expected (output / error)` column; one row per equivalence class or boundary:

| Input cond. A | Input cond. B | …   | Expected (output / error) |
| ------------- | ------------- | --- | ------------------------- |
| valid class   | edge (max)    | …   | success: <result>         |
| invalid class | —             | …   | error: <error type>       |

### Test Pyramid & the tension

- Shape the suite as a **pyramid** (martinfowler.com/bliki/TestPyramid.html): many fast unit tests → fewer integration → fewest e2e. Avoid the **"ice cream cone"** (mostly slow e2e, few units) — it is brittle and slow.
- Tension: a full combinatorial matrix on EVERY internal function is brittle (couples tests to implementation, churns on refactor). So apply the matrix at the **contract level**; internally test **risk-based** (the paths most likely to break).
- Integration test scope: provider boundaries (msw for Vbee HTTP, Playwright against saved Flow HTML fixtures), the project store's atomic write/resume path, and the pipeline's crash-then-resume path.
- E2E test scope: one full run with faked providers producing a real `output.mp4` (task 003); one real Vbee smoke call (task 004, ≤1 short sentence); one real Flow smoke run (task 005, only with explicit go-ahead each time, since it may spend Flow credits).
- Gate enforcement for the matrix rule: prompt-only (no Stop-hook gate for this project).
