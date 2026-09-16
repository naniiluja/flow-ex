---
paths: ["be/src/providers/flow/**"]
---

# Flow Automation (`FlowImageProvider`)

Facts below were verified live against `https://flow.google.com/` via Claude in Chrome on 2026-09-16.
Flow can change its UI at any time; run the preflight selector check before trusting this file.

## Host & framework

- `labs.google/fx/tools/flow` now redirects to `https://flow.google.com/`; a project lives at `/project/<uuid>`.
- Flow is an Angular app. The prompt input is **ProseMirror** (`.ProseMirror`, `contenteditable`), not Slate.js (the original `h2dev_flow` extension targeted the old host + Slate and no longer works).

## Selectors (bind by tag/class/icon name, not `aria-label` — it localizes with the account's language)

- Prompt box tree: `flow-prompt-box` > `flow-base-prompt-box` > `flow-rich-text-editor` > `.ProseMirror`.
- Agent-mode toggle: `button.agent-mode-chip[aria-pressed]` — **must be OFF** to generate an image directly (leaving it on routes the prompt through an agent flow instead).
- Send button: `button.generate-icon-button` (disabled while the input is empty).
- Settings overlay: `button.settings-trigger-button` opens a panel of `mat-button-toggle` radios, identified by icon name: `image`/`videocam` (media type), `crop_16_9`/`crop_landscape`/`crop_square`/`crop_portrait`/`crop_9_16` (aspect ratio), `x1`..`x4` (batch count). Model choices: `Nano Banana Pro` / `Nano Banana 2` / `Nano Banana 2 Lite`.
- Generated tile lifecycle: on submit the input clears immediately; within ~36ms a `flow-image-tile` > `flow-pending-tile` appears (text like `image 93%`) alongside `flow-batch-info` / `flow-expandable-prompt`; after ~25-30s the pending tile is replaced by an `<img>` (observed 1376x768) whose `src` is `https://flow-content.google/image/<uuid>?<signed query>` — the UUID is the stable identity for that image.
- Download menu: the tile's "more options" menu offers Download > `1K` (original) / `2K` / `4K` (upscaled).

## Critical gotcha: focus before typing

- **Typing into the page while `.ProseMirror` is not focused fires the page's keyboard shortcuts instead of entering text** (observed: accidentally toggled a video filter panel and the agent-mode chip). Sequence that works: `locator.click()` → `expect(locator).toBeFocused()` → `pressSequentially()`. Never type without asserting focus first.
- Escape does not reliably close an open menu; click an empty area of the page instead.

## Watermark

- Every generated image carries Gemini's small sparkle watermark in the bottom-right corner; this account's region has no toggle to disable it (Settings > Media Watermark exists elsewhere but not here). SynthID/C2PA metadata also remains regardless. Mitigation is the safe-viewport design in `../../../video.md`, not a hard crop.
- Exact watermark bounding box (as % of image, for 16:9/9:16 at 1K/2K) is measured from a real downloaded image in task 005 and recorded here once known.

## Chrome / CDP setup

- Chrome 136+ ignores `--remote-debugging-port` on the DEFAULT profile; launch with a dedicated `--user-data-dir` (e.g. `chrome-profile/`, gitignored) so CDP works.
- Playwright `connectOverCDP` into that Chrome; get the page via `browser.contexts()[0]`, reconnect on a `disconnected` event.
- Download images via `context.request.get(src)` (shares cookies with the page) rather than relying on the CDP download event, which is unreliable over `connectOverCDP`.
- On any Playwright error: capture `page.screenshot()` + `page.content()` as a run artifact before rethrowing as `AppError`.
- Not-logged-in state → `AppError` with `errorKind: 'needs_user'`.

## Preflight

- Before a run touches Flow, run a preflight command that locates every selector above without submitting a prompt; a missing selector means Flow's UI changed and the provider needs an update before the run proceeds.
