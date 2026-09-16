---
paths: ["video/**"]
---

# Video Composition (Remotion)

## Version discipline

- Remotion 4.0.525, pinned exactly (no `^`) for every `remotion` / `@remotion/*` package. A version mismatch between these packages is a documented source of runtime failure.

## Timing

- Scene duration in frames = `Math.ceil(audioSec * fps) + transitionFrames` for that scene's transition. `TransitionSeries`'s total duration = sum of sequence durations minus the sum of transition durations, so omitting `Math.ceil` compounds drift across scenes.
- `durationMs` for each scene's audio is measured once by the backend right after TTS completes and stored in `project.json`; the composition's `calculateMetadata` derives `durationInFrames`/`width`/`height` from those stored values, never re-measuring audio itself.
- `<Audio>` (from `@remotion/media`) lives INSIDE each `TransitionSeries.Sequence`, alongside that scene's image; never given a separate `from`.
- Assets (images/audio) are served to both the Player (preview) and the SSR renderer as HTTP URLs from the backend (`http://127.0.0.1:<port>/api/projects/:id/assets/...`), not via `staticFile`, so preview and render see identical bytes.

## Transitions & motion

- Use `@remotion/transitions` built-ins (`fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris`) plus a custom cross-zoom `TransitionPresentation`; drive timing with `springTiming` for a modern feel, not linear easing.
- Ken Burns pan/zoom: `interpolate` with `extrapolateLeft/Right: 'clamp'`. Prevent sub-pixel jitter with `transform: perspective(100px)` + `willChange: transform` on the animated element. Use Remotion's `<Img>` (not a plain `<img>`) so rendering waits for the image to load.

## Watermark avoidance (safe viewport, no hard crop)

- `video/src/timing/safe-viewport.ts` computes, from the source image size, the video frame size, and the logo's bounding box (as a % of the image), a `minScale` and an allowed pan region so the visible viewport NEVER overlaps the logo box — this is a scale/pan constraint, not a crop or an overlay.
- Ken Burns interpolation is clamped to `scale >= minScale`, and pan stays inside the safe region for every frame.
- The logo box for 16:9/9:16 at 1K/2K is measured on a real downloaded Flow image in task 005 and recorded here as a named constant once known; until then, task 002 uses an assumed box flagged `TODO(measure)`.

## Captions (TikTok-style)

- Word-level timestamps come from whisper.cpp (`@remotion/install-whisper-cpp`), a multilingual model (no `.en` suffix), forced `language: 'vi'`, run on a 16kHz mono WAV.
- Rendered via `createTikTokStyleCaptions`; each token keeps its leading space exactly as returned.
- Font: `@remotion/google-fonts`, subset `vietnamese`, so diacritics render correctly.

## Rendering

- `bundle()` once per process and reuse it; `selectComposition` then `renderMedia({codec: 'h264', onProgress, cancelSignal})` for every render — never re-bundle per render.
- The Player mounts the composition's root component directly, never wrapped in a `<Composition>` element.

## Verifiable rules

- Every function in `video/src/timing/**` has a contract-level EP/BVA test (frame at start/middle/end/near-boundary never overlaps the logo box; no blank edge ever visible).
- `video/` contains no IO (no `fs`, no `fetch` beyond the asset URLs Remotion itself resolves) — it is pure composition + timing math, unit-testable without a running server.
