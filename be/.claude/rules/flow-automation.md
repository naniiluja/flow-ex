---
paths: ["be/src/providers/flow/**"]
---

# Flow Automation (`FlowImageProvider`)

Facts below were verified live against `https://flow.google.com/` via Claude in Chrome on 2026-09-16, then RE-verified against a real open `https://flow.google.com/project/<uuid>` page (a real, logged-in Chrome CDP session) on 2026-09-17: the tag/class names below already drifted between those two checks (see the "Re-verified" notes), which is exactly why the preflight check exists.
Flow can change its UI at any time; run the preflight selector check before trusting this file.

## Host & framework

- `labs.google/fx/tools/flow` now redirects to `https://flow.google.com/`; a project lives at `/project/<uuid>`. **The dedicated Chrome profile's Flow tab must already be sitting on an actual project page (`/project/<uuid>`) before a run starts** — `flow.google.com/` by itself (blank tab default) lands on the PROJECT LIST/home screen, which has none of the prompt-box selectors below; neither `flow-image-provider.ts` nor `preflight.ts` opens/creates a project for you (a deliberate scope decision, not an oversight — auto-creating a project every run risked littering the account with empty ones). Click into an existing project (or create one) once per Chrome session.
- **The provider drives `context.pages()[0]`, the FIRST tab, not "the tab that is on a Flow project"** (`flow-image-provider.ts`, `preflight.ts`), and caches that `Page` for the life of the backend process. Real failure (2026-10-17): a Flow link had opened a Google One credits page as tab 0 while the project sat in tab 3, so every scene of an 80-scene run failed `FLOW_NOT_LOGGED_IN` within a minute, and because a `needs_user` scene can never leave `failed` (see `error-handling.md`'s known gap) all 80 had to be reset by hand in `project.json`. Fix: navigate tab 0 to the project URL, **restart the backend** (the cached `Page` can point at a tab that no longer exists), reset the failed scenes to `pending` with `attempts: 0` and no `lastError`, then `POST .../render`. Keep a Flow project in tab 0 and close stray tabs before a long run.
- Flow is an Angular app. The prompt input is **ProseMirror** (`.ProseMirror`, `contenteditable`), not Slate.js (the original `h2dev_flow` extension targeted the old host + Slate and no longer works).

## Selectors (bind by tag/class/icon name, not `aria-label` — it localizes with the account's language)

- Prompt editor: `.ProseMirror`, deliberately **NOT** scoped to any outer wrapper tag. Verified live 2026-09-17: Flow swaps the ENTIRE wrapping custom element around `.ProseMirror` based on the agent-mode chip's OWN state — `flow-creative-agent-prompt-box` while agent mode is ON, `flow-prompt-box` once it's OFF. `PROMPT_EDITOR_SELECTOR` (`flow-automation.ts`) and `preflight.ts`'s "prompt editor" check both use the bare `.ProseMirror` selector for exactly this reason — it was confirmed unique on the page in BOTH states. Do not re-add an outer-tag scope; it breaks the moment the other state is active.
- Agent-mode toggle: `button.agent-mode-chip[aria-pressed]` — **must be OFF** to generate an image directly (leaving it on routes the prompt through an agent flow instead). **Unchanged from the 2026-09-16 survey** — a real smoke run on 2026-09-17 briefly (and wrongly) "corrected" this to `button.agent-action-button[aria-pressed]`, which actually targets an UNRELATED tooltip button ("Chỉ dẫn cho tác nhân" — agent-instructions info, not the toggle) that happens to share a generic class Flow reuses on several icon buttons in the same row and also happens to carry its own unrelated `aria-pressed`. Reverted after checking the real chip's own attributes directly.
- Send button: `button.generate-icon-button` (disabled while the input is empty).
- Settings trigger: `button.settings-trigger-button` — **unchanged from the 2026-09-16 survey.** **Important, verified live 2026-09-17:** this element genuinely renders `hidden` whenever the agent-mode chip is `aria-pressed="true"`, and only becomes visible/clickable once agent mode is off — a preflight check that only asserts `state: "attached"` (not `"visible"`) will PASS even while this button is hidden, so a real `.click()` can still time out immediately afterward. Always call `ensureAgentModeOff` first and let it actually succeed before touching this selector. (A DIFFERENT, unrelated button with a `tune` icon and the generic `agent-action-button` class opens the agent's own GLOBAL default-settings panel — not this per-submission overlay — and is not used by this provider.) Once visible, clicking it opens a panel of `mat-button-toggle` radios, identified by icon name: `image`/`videocam` (media type), `crop_16_9`/`crop_landscape`/`crop_square`/`crop_portrait`/`crop_9_16` (aspect ratio), `x1`..`x4` (batch count). Model choices: `Nano Banana Pro` / `Nano Banana 2` / `Nano Banana 2 Lite`.
- Generated tile lifecycle: on submit the input clears immediately; within ~36ms a `flow-image-tile` > `flow-pending-tile` appears (text like `image 93%`) alongside `flow-batch-info` / `flow-expandable-prompt`; after ~25-30s the pending tile is replaced by an `<img>` (observed 1376x768) whose `src` is `https://flow-content.google/image/<uuid>?<signed query>` — the UUID is the stable identity for that image.
- Download menu: the tile's "more options" menu offers Download > `1K` (original) / `2K` / `4K` (upscaled).

## Critical gotcha: focus before typing

- **Typing into the page while `.ProseMirror` is not focused fires the page's keyboard shortcuts instead of entering text** (observed: accidentally toggled a video filter panel and the agent-mode chip). Sequence that works: `locator.click()` → assert `el === document.activeElement` → `pressSequentially()`. Never type without asserting focus first.
- Escape does not reliably close the settings overlay. **Verified live (2026-09-17, task 005):** clicking the settings trigger button again (the SAME element that opened it) toggles it closed — this is what `flow-automation.ts`'s `configureAspectRatioAndBatch` uses, not a blind click at a guessed empty page coordinate (a fixed coordinate risks landing on real chrome like the top nav/logo, since nothing in the DOM marks a coordinate as "safely empty").

## Watermark

- Every generated image carries Gemini's small sparkle watermark in the bottom-right corner; this account's region has no toggle to disable it (Settings > Media Watermark exists elsewhere but not here). SynthID/C2PA metadata also remains regardless. Mitigation is the safe-viewport design in `../../../video.md`, not a hard crop.
- **Measured live (task 005, 2026-09-17):** a real 1-scene smoke run generated a 1376x768 16:9 image (`https://flow-content.google/image/<uuid>` behind a signed query, downloaded as a `.jpg`, NOT always `.png` — `flow-image-provider.ts`'s `Content-Type`-based extension mapping already handles this). The Gemini sparkle watermark's diamond + comet-tail sits roughly at pixel `x:[996,1311] y:[653,688]`; `video.md`'s `ASSUMED_LOGO_BOX` = `{x:0.66, y:0.74, width:0.34, height:0.26}` wraps that with a safety margin. **9:16 is NOT yet measured** — a real 9:16 generation was out of scope for this pass (spends additional Flow credit); the 16:9 box is reused as the working default until it is.

## Provider design

- Files: `chrome-connection.ts` (spawn-or-connect to the dedicated Chrome over CDP — the only IO boundary, deliberately thin and NOT unit-tested directly, same as `create-remotion-video-renderer.ts`'s own thin adapter; exercised only by the real smoke run), `flow-automation.ts` (pure `Page`-driving steps: `ensureLoggedIn`, `ensureAgentModeOff`, `configureAspectRatioAndBatch`, `typeIntoPromptBox`, `submitImage`/`waitForImageAtTile`/`submitAndWaitForImage` — each independently fixture-tested), `submit-mutex.ts` (task 014's `SubmitMutex`, a plain promise-chain critical section guarding the shared-page-mutation part of a submission — see "Tile identity" above), `preflight.ts` (`checkFlowSelectors` + a CLI entry, `pnpm --filter be preflight:flow`), `flow-image-provider.ts` (orchestrates the above into the real `ImageProvider`, holding one `SubmitMutex` per provider/page instance).
- Env: `CHROME_USER_DATA_DIR` (default `./chrome-profile`), `CHROME_CDP_PORT` (default `9222`), `CHROME_EXECUTABLE_PATH` (optional override). `FLOW_IMAGE_PROVIDER` (`"fake"`|`"real"`, default `"fake"`) is the explicit opt-in switch read by `be/src/app.ts` (`createImageProviderFactory`, task 006 moved provider construction out of the route layer into `be/src/providers/select-providers.ts` — see below) — unlike Vbee, Chrome connection settings always have a default value and can't by themselves signal "use the real provider".
- Connection reuse: `createFlowImageProvider` connects lazily on the FIRST `generateImage` call and reuses the same `Browser`/`Page` across every later call in the process. It never calls `browser.close()`: the dedicated Chrome window is the user's to watch/close, and closing a CDP-attached browser risks terminating the underlying process.
- **Task 014 — no longer "one scene at a time".** `pipeline-engine.ts`'s image phase now runs MULTIPLE scenes' `generateImage` calls concurrently (`FLOW_IMAGE_CONCURRENCY`, default 3) against this ONE shared page. The sentence this replaces ("safe because the pipeline calls one scene at a time") is no longer true and must not be re-added; `vbee-tts.md`'s equivalent claim about Vbee is still accurate (Vbee's audio phase remained sequential) and is unaffected.
- **Task 006 extends this invariant to the review-gate's "Sinh lại" route.** `be/src/providers/select-providers.ts`'s `createImageProviderFactory` builds exactly ONE `FlowImageProvider` per project (cached by `projectId`), and `be/src/app.ts` builds that factory once and shares it between `renderRoutes` and `scenesRoutes` — a route constructing its OWN fresh `FlowImageProvider` per request would open a new, never-closed CDP connection every time, and two live instances could both drive `context.pages()[0]` at once, breaking the stale-image guard's "one scene at a time" assumption below. `regenerateSceneReview` (`be/src/pipeline/scene-review.ts`) deliberately does NOT go through `retryWithSchedule`: the user is interactively waiting on this one click, so a transient failure surfaces immediately instead of retrying silently for minutes behind a still-loading button.
- **Task 006's file naming.** Both providers now embed a per-call unique identifier in the written file name — `FlowImageProvider` uses Flow's own generation UUID (`<sceneIndex>-<uuid>.<ext>`), `FakeImageProvider` uses its internal per-scene call counter (`<sceneIndex>-<callIndex>.png`) — so a "Sinh lại" regenerate produces a genuinely NEW file instead of silently overwriting the previous variant under the same `<sceneIndex>.<ext>` path (a real bug the task 006 spec review caught and fixed: every `imageVariants` entry pointed at one identical file). The cached connection promise is reset to `undefined` both when the connect attempt itself REJECTS and when the browser later fires `'disconnected'` (the user closed the window, or it crashed) — without this, a single failed/dropped connection would poison every later scene with the SAME stale rejection forever, making the outer `retryWithSchedule` pointless. Both resets compare against the SPECIFIC attempt's own promise reference (not just "is `connection` set") so a late `'disconnected'` event for an already-superseded browser can't discard a newer, healthy connection. Regression test: `flow-image-provider.test.ts`'s "retries connecting on the NEXT call" mocks `connectToFlowChrome` to always reject and asserts it's called twice across two `generateImage` calls, not once. `chrome-connection.ts`'s own `spawn(...)` call also registers a `child.on('error', ...)` listener wrapping the failure as `AppError` (`FLOW_CHROME_SPAWN_FAILED`, `transient`): an unlistened `'error'` event on a `ChildProcess` is an uncaught exception that crashes the whole backend, which a bad `CHROME_EXECUTABLE_PATH` would otherwise trigger. `getConnection()` is called INSIDE `generateImage`'s own `try` (not before it) so a connection failure itself also goes through `toDomainError` and gets logged at `flow.image.generate.error`, same as any other failure in the sequence; `page` stays `undefined` in that case, so artifact capture is skipped rather than called with nothing to screenshot.
- Stale-image guard: since the same `Page` is reused across scenes, a PRIOR scene's `<img>` tile is still in the DOM when the NEXT scene submits. `waitForImageAtTile` polls the SPECIFIC tile index it was handed (see "Tile identity" below), fully decoded (`el.complete && naturalWidth > 0 && naturalHeight > 0` — a freshly-attached `<img>` can otherwise be read at `0x0` before the browser finishes decoding it, which would fail `imageWidth`/`imageHeight`'s positive-number schema downstream). Regression test: `flow-automation.test.ts`'s "waits for the image to actually finish decoding" describe block (a REAL PNG over a REAL slow `node:http` response — the shared fixture fakes `naturalWidth`/`complete` instantly so it can't exercise the decode-wait path at all; this one serves `render/fixtures/sample-1.png` after an 800ms delay and asserts the result is `1920x1080`, never `0x0`).

- **Tile identity (task 014 — replaces the old UUID-diffing design).** `submitAndWaitForImage`
  used to snapshot every image UUID present BEFORE clicking generate, then wait for one NOT in
  that snapshot. This broke the moment TWO scenes submitted concurrently on the same page (task
  014's whole reason for existing): both snapshots were taken before either click, so both calls
  raced each other for whichever `<img>` appeared first, regardless of whose click produced it —
  a real, reproducible cross-scene image swap.

  **Bugfix, 2026-09-17 (post-014 real smoke test):** the FIRST version of this section (see git
  history) assumed a new tile is APPENDED to the end of the tile list at click time, and bound
  each job to the DOM INDEX captured as "tile count before my click". That assumption was never
  verified live — the task-014 caveat below (kept for the historical record) says so plainly — and
  it turned out to be **backwards**: a real Flow project page, driven live via `claude-in-chrome`
  (typed a prompt into `.ProseMirror` and clicked `button.generate-icon-button` on an already-open
  project, then read `document.querySelectorAll('flow-image-tile')` before/after), **PREPENDS** the
  new tile at the FRONT of the list (index 0), pushing every existing tile's index up by one. Under
  that real ordering, "the tile at index N" is not a stable identity at all: as soon as one MORE
  job's tile gets prepended in front of it, the SAME index now refers to an OLDER, already-decoded
  tile instead. This is exactly what turned the very first real 6-scene smoke run
  (`project 19928cf3-600e-44c0-8864-7860fb776880`) into 6 scenes all downloading the SAME image —
  every job after the first ended up polling an index that had already drifted onto a finished
  tile from an earlier job.

  The fix binds identity to the DOM NODE itself, not its position: `submitImage(page)`
  1. clicks generate,
  2. immediately takes `page.locator('flow-image-tile').first()` — under prepend semantics this is
     ALWAYS the tile this exact click just created, since no OTHER job's click can have run yet
     while this one still holds the submit mutex,
  3. calls `.elementHandle()` on it to get a handle PINNED to that specific node, immune to any
     later reordering of the list around it,
  4. returns `{ tileHandle }`.

  `waitForImageAtTile(page, tileHandle)` then polls ONLY `tileHandle`'s own `img` child for the
  decode-complete condition below — a completely independent read from any other tile, so multiple
  scenes' own `waitForImageAtTile` calls can run in TRUE parallel without touching shared state at
  all, exactly as the index-based design intended, just correctly this time.

  **Concurrency safety still requires `submitImage` to run under a mutex** (`./submit-mutex.ts`'s
  `SubmitMutex`, one instance per `FlowImageProvider`/page): the click + `.first()` + `elementHandle()`
  sequence is the ONLY moment two scenes could otherwise interleave (scene B's click landing before
  scene A has grabbed its own handle would make A's `.first()` resolve to B's tile instead).
  `flow-image-provider.ts` also holds the SAME mutex around `ensureAgentModeOff`/
  `configureAspectRatioAndBatch`/`typeIntoPromptBox`, since those touch the SAME shared
  editor/toggle/overlay a concurrently running scene would otherwise stomp on mid-type. The ~25-30s
  decode wait (`waitForImageAtTile`) deliberately runs OUTSIDE the mutex, so N scenes' decode waits
  overlap — this is the entire point of task 014 (parallel image generation on one tab).

  The fixture (`fixtures/flow-page.fixture.html`) was updated to PREPEND (`insertBefore(tile,
  tiles.firstChild)`) instead of append, matching the real, now-verified behavior.

  Regression test: `flow-automation.test.ts`'s "keeps each job's own image even when 3 jobs finish
  decoding in REVERSED order (task 014)" — 3 jobs submitted back-to-back through the SAME mutex on
  ONE (prepend-ordering) page, whose images are made to finish DECODING in the OPPOSITE order they
  were submitted in (job 3 first, job 1 last, via the fixture's injectable
  `window.__flowFixtureDelaysMs`); each job still gets its own image. This test now genuinely
  exercises the prepend-ordering bug the original index-based design could not survive, since the
  fixture itself reproduces that ordering.

  **Caveat from the original task-014 pass, kept for the historical record:** its brief asked for a
  LIVE `claude-in-chrome` survey before choosing a design, and that survey was skipped in that pass
  — this bugfix is that skipped survey, run only after the skipped step's predicted risk (a wrong
  assumption about tile ordering) materialized as a real, credit-spending bug. The lesson recorded
  here for future sessions: when a design encodes an assumption about a live UI's behavior that the
  task brief explicitly asked to verify, verify it before shipping, not after the first real
  failure — a live check costs a few seconds of Flow credit; an unverified assumption baked into a
  concurrency primitive costs a whole smoke run's worth of wrong output plus the debugging pass to
  find it.
- Aspect ratio + batch: `configureAspectRatioAndBatch` opens the settings overlay, clicks the `mat-button-toggle` matching `project.json`'s `aspectRatio` (icon name `crop_16_9`/`crop_9_16`) and the `x1` batch toggle (this pipeline consumes exactly one image per scene), then closes the overlay by clicking the settings trigger button AGAIN (see the toggle-close note above). Deliberately leaves the MODEL dropdown untouched: `project.json` carries no per-project model field, so whatever the account's current default is (`Nano Banana 2` as of 2026-09-16) stays in effect — a scope decision for this thin slice, not an oversight.
- Image download + format: `context.request.get(src)` (shares cookies with the page) rather than the CDP download event, which is unreliable over `connectOverCDP`. The file extension is chosen from the response's real `Content-Type` header (`image/png`→`png`, `image/jpeg`→`jpg`, `image/webp`→`webp`, unknown→`png` fallback) rather than assumed, since Flow's actual encoding was not re-verified in task 005 (task-002's fixtures were hand-authored PNGs, not a real Flow download).
- Width/height: read directly from the live `<img>` element's `naturalWidth`/`naturalHeight` in the browser (via `page.evaluate`) rather than decoding the downloaded bytes — the browser has already decoded the real image, so this avoids depending on a Node-side image-decoding library.
- Error artifacts: on ANY error inside `generateImage`, `page.screenshot()` + `page.content()` are saved (best-effort, never masking the original error) under `<projectRoot>/logs/flow-errors/<sceneIndex>-<timestamp>.{png,html}`, where `<projectRoot>` is `path.dirname(assetsDir)`.
- Not-logged-in detection: `ensureLoggedIn` waits up to 5s for the prompt editor to attach; if it never does (the ONLY reliable signal available — a logged-out page shows Google's own sign-in flow instead), throws `AppError` `FLOW_NOT_LOGGED_IN` with `errorKind: 'needs_user'`.
- Any other error `generateImage` catches that isn't already an `AppError` (e.g. a raw Playwright `TimeoutError`) is wrapped as `errorKind: 'transient'` via `toDomainError` — a UI hiccup or a slow response may resolve on the shared retry schedule.
- Logging: `ImageGenerationContext.logger` (`be/src/domain/providers.ts`) carries a per-run child logger (`{projectId, runId, stage: "image"}`) that `pipeline-engine.ts`'s `runImageStep` builds fresh on every `generateImage` call, mirroring `AudioGenerationContext.logger`'s own rationale (pino output only, not the NDJSON run-log file or the SSE stream — see that field's own doc comment). Events: `flow.image.generate`/`.success`/`.error`; the error branch also logs `flow.image.artifact_capture.error` at `warn` if saving the screenshot/HTML itself fails (never silently — `error-handling.md`'s "No silent catch").

## Testing scope

- `flow-automation.ts` and `preflight.ts` are tested against a HAND-AUTHORED static HTML fixture (`fixtures/flow-page.fixture.html`) reproducing the verified selectors/structure above, run through Playwright's own bundled Chromium (`chromium.launch()`) — NOT a scrape of the real page, which would embed the account's own session/PII data unsafe to commit to a public repo. `checkFlowSelectors`/`ensureLoggedIn`/`submitAndWaitForImage` all take an injectable `timeoutMs` for this reason, so a test can shrink Playwright's real wait budgets instead of waiting out the production defaults.
- `flow-image-provider.ts`'s own pure/thin helpers (`toDomainError`, `downloadImage`, `captureErrorArtifacts`) are exported and unit-tested directly in `flow-image-provider.test.ts`: `downloadImage` against a real local `node:http` server (proving the Content-Type→extension mapping and the non-2xx failure path for real, not simulated), `captureErrorArtifacts` against a real Playwright page writing to a temp dir.
- `chrome-connection.ts` (spawning/connecting to a REAL Chrome) and the real Google Flow smoke path are NOT covered by the automated test suite — that would need a live, logged-in dedicated Chrome profile, which `pnpm test` must run without. They are proven once by the one real smoke run (task 005's acceptance criterion), asked for explicitly before it spends any time/credit.
- **Task 014's own real-Flow smoke run (concurrent generation, timed against a sequential baseline) was NOT performed in this pass** — see the "Tile identity" caveat above. The fixture-level concurrency proof (`flow-automation.test.ts`'s reversed-completion-order test) and the pipeline-level concurrency proof (`pipeline-engine.test.ts`'s "concurrent image phase" describe block, using a delayed fake `ImageProvider`) are the only proofs this pass produced; both are real, executable, and green, but neither touches an actual Chrome/Flow session. A future session must run this before relying on `FLOW_IMAGE_PROVIDER=real` with `FLOW_IMAGE_CONCURRENCY` above 1 in practice.
- `be/src/providers/select-providers.test.ts`'s `selectImageProvider` tests prove the SELECTION wiring (fake vs real, and the misconfiguration guard) without needing a working Chrome: the "real" case mocks only the CDP `/json/version` HTTP probe via msw (returning a response with no `webSocketDebuggerUrl`, which makes Playwright's own `connectOverCDP` fail fast during parsing) to prove the connection was attempted, not that it fully succeeds. (Moved out of `routes/` in task 006, alongside `createImageProviderFactory`, since the route layer no longer owns provider construction.)
- `be/tsconfig.json` adds `"DOM"` to `lib` (replacing the base's `["ES2023"]`, since a child tsconfig's `lib` REPLACES rather than merges) because Playwright's own `Locator.evaluate()` types the resolved element as a DOM lib type regardless of the consumer's tsconfig. This is PROGRAM-WIDE, not scoped to `providers/flow/**` — a per-file `/// <reference lib="dom" />` was tried first and found to leak identically (TypeScript's `lib` references apply to the whole program, not just the file that declares them), so the honest tradeoff is documented here instead of hidden behind a misleading per-file comment: a stray `document`/`window`/`fetch` typo anywhere else in `be/` now type-checks instead of erroring.

## Reference images (task 015 v2 — upload, verified live 2026-09-18)

- The "+" trigger beside the prompt box (`button.add-menu-trigger`) opens a project-asset picker
  with a search box (`.editable-text-input`), a list of `.asset-item` entries, and a sidebar
  upload control (`button.sidebar-upload-btn`, "Tải nội dung nghe nhìn lên"). Selecting an item
  reveals `button.detail-add-to-prompt-btn` ("Thêm vào câu lệnh") that inserts it as an inline
  reference chip into the SAME `.ProseMirror` prompt box, without itself typing any text.
- **`attachUploadedReferenceImages(page, filePaths, timeoutMs?)`** (`flow-automation.ts`) is the
  current mechanism: open the picker, click `button.sidebar-upload-btn`, intercept Chromium's
  native `filechooser` event (the real page has NO `<input type=file>` at rest) and hand it the
  local file, then click the newest `.asset-item` (`.first()`) and "Thêm vào câu lệnh". Fixture
  tested in `flow-automation.test.ts` (3-case matrix: single file, same file twice, two files in
  one call) against the picker DOM in `fixtures/flow-page.fixture.html`, which reproduces both the
  native-file-chooser trigger and Flow's most-recent-first item ordering.
- Reference images themselves are generated by the ORDINARY scene flow
  (`FlowImageProvider.generateReferenceImage` = `ensureAgentModeOff` + `typeIntoPromptBox` +
  `submitImage`/`waitForImageAtTile` + download to `assets/references/<referenceId>.<ext>`), under
  the same submit mutex, with no navigation away from the main canvas.

### Retired: the named-asset / "Nhân vật" route design (tasks 013 + first 015 pass)

Kept as a record of what a real smoke run disproved, so nobody rebuilds it:

- `attachReferenceAssets` matched an asset by its display NAME through the picker's search box.
  **The search box does not actually filter the rendered list** — verified live with `"To Nhuoc Y"`
  typed in and 17 unrelated assets still returned — so name lookup could never be reliable.
- `generateReferenceCharacter` drove a SEPARATE route (`<projectUrl>/character`) with a mandatory
  rename step (`button.pencil-button` + `input.name-input` + a "Xong"/Done button). Three distinct
  real bugs came out of that single design:
  1. It derived its project URL from `page.url()` INSIDE the function, so on a `retryWithSchedule`
     retry (page already at `.../character/<id>`, or a bare `.../404` after a failed attempt)
     appending `/character` produced a broken path — every retry after the first was doomed.
  2. The "Xong"/Done control has **two different DOM shapes depending on viewport width**: a text
     button `.flow-button-secondary` at desktop width, an icon-only checkmark
     (`.flow-icon-button-secondary.mat-mdc-tooltip-trigger`, `aria-label="Đã chỉnh sửa xong"`) at
     narrow width. A "fix" derived from a screenshot of the NARROW variant broke the desktop path.
  3. Even when it reported success, the rename could fail to persist — the asset stayed titled
     "Nhân vật chưa có tên", invisible to any later by-name lookup, while the pipeline recorded the
     reference as done (its success criterion was only "portrait downloaded").
- Lesson recorded for future sessions: **verify selectors against the ACTUAL automation tab.** One
  of those bugs came from screenshotting a stray 360px-wide tab (an extension side panel that had
  been navigated to the Flow URL by mistake) and treating its mobile-layout DOM as the truth.
  `context.pages()[0]` is whatever tab happens to be first — check `window.innerWidth` before
  trusting a live DOM survey.
- Flow's own transient failure mode to recognise: a banner reading "Không lưu được một số nội dung
  – vui lòng làm mới rồi thử lại" means the page must be RELOADED; until then every automated
  action against it hangs or fails, and `button.agent-mode-chip` may be missing entirely.

## Preflight

- `be/src/providers/flow/preflight.ts`'s `checkFlowSelectors(page)` locates every selector above WITHOUT submitting a prompt; run it via `pnpm --filter be preflight:flow` before a run touches Flow. A missing selector means Flow's UI changed and the provider needs an update before the run proceeds. The image-tile selector (`flow-image-tile img`) is deliberately NOT included — it structurally does not exist until a prompt is submitted, so it's covered by the fixture test and the real smoke run instead.
