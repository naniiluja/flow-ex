---
paths: ["video/**"]
---

# Video Composition (Remotion)

## Presets (task 009): `aspectRatio` vs `preset`

- `packages/shared-schemas/src/presets.ts`'s `PRESETS` table (`tiktok` | `youtube`) is the SINGLE
  source of truth for frame dimensions, caption style (`fontSize`/`fontWeight`/
  `paddingBottomPercent`/`combineTokensWithinMs`), the Vbee TTS `speed` default, and suggested
  duration/scene-count — never re-derived ad hoc elsewhere.
- **Decision: an explicit `aspectRatio` on the project WINS over the preset's own default.**
  `scriptInputSchema` (`packages/shared-schemas/src/index.ts`) makes `aspectRatio` optional and
  requires at least one of `preset`/`aspectRatio`; when only `aspectRatio` is given, `preset` is
  INFERRED from it (`inferPresetFromAspectRatio`: `"9:16"` -> `"tiktok"`, anything else ->
  `"youtube"`). `resolveAspectRatio({preset, aspectRatio})` is the one function that applies the
  "explicit wins" rule for the FRAME dimensions — `video/src/compositions/main-composition.tsx`'s
  `computeVideoMetadata` and `be/src/pipeline/pipeline-engine.ts`/`scene-review.ts`/
  `create-remotion-video-renderer.ts` all call it rather than reading `project.aspectRatio`
  directly. `resolveTtsSpeed`/`resolveTtsOptionsForProject`
  (`be/src/providers/select-providers.ts`) apply the SAME rule to the Vbee `speed` field: an
  explicit `tts.speed` wins, an unset one falls back to the preset's default.
- `MainCompositionProps.preset` is used ONLY for caption style (`TikTokCaptions`'s
  `captionStyle` prop, sourced from `PRESETS[preset].captionStyle`) — never to re-derive the frame
  dimensions once `aspectRatio` has already been resolved.
- `packages/shared-schemas`'s `migrateProjectJson` lazily upgrades a `schemaVersion: 1`
  `project.json` (predates `preset`) by inferring `preset` from its existing `aspectRatio`, run on
  every `be/src/store/project-store.ts` read before `projectSchema.safeParse`.

## Version discipline

- Remotion 4.0.525, pinned exactly (no `^`) for every `remotion` / `@remotion/*` package. A version mismatch between these packages is a documented source of runtime failure.

## Timing

- Scene duration in frames = `Math.ceil(audioSec * fps) + transitionFrames` for every scene EXCEPT the last (which needs no transition, since nothing plays after it). `TransitionSeries`'s total duration = sum of sequence durations minus the sum of transition durations, so this transition frame count is added once and subtracted back out once per join — it never changes the true content length, only the two computations must derive it from the exact same source (`video/src/timing/scene-duration.ts`'s `sceneFramesForTimeline`), never re-implemented separately in `calculateMetadata` and in the composition's own JSX (a real drift bug this project hit once: the two disagreed by one transition's worth of frames, leaving trailing black/silent frames that a frame-count-only test did not catch).
- The transition's actual frame count is MEASURED from `springTiming(...).getDurationInFrames({fps})`, never a hand-picked constant — a spring's settle time is a property of its damping config, not a round number a human can guess correctly (a guessed `20` here was off by 3 frames per transition against the real physics).
- `durationMs` for each scene's audio is measured once by the backend right after TTS completes and stored in `project.json`; the composition's `calculateMetadata` derives `durationInFrames`/`width`/`height` from those stored values, never re-measuring audio itself.
- `<Audio>` (from `@remotion/media`) lives INSIDE each `TransitionSeries.Sequence`, alongside that scene's image; never given a separate `from`.
- Assets (images/audio) are served to both the Player (preview) and the SSR renderer as HTTP URLs from the backend (`http://127.0.0.1:<port>/api/projects/:id/assets/...`), not via `staticFile`, so preview and render see identical bytes. Task 002 serves this from a fixed sample-fixture folder (`be/src/routes/assets.ts`, `GET /api/samples/*`) ahead of the real per-project asset route a later task adds.

## Transitions & motion

- The transition is a HAND-WRITTEN CSS-transform `TransitionPresentation` (`video/src/compositions/cross-zoom-presentation.tsx`: opacity + `perspective(100px) scale(...)`), not `@remotion/transitions`'s own built-in `crossZoom`. The built-in draws through a WebGL2 canvas (`makeHtmlInCanvasPresentation`) and produced fully BLACK frames — not just a broken transition, the whole frame — in this project's headless-Chrome renderer, which has no hardware GPU context. Re-check this if a future Remotion/Chrome upgrade might have fixed canvas support in headless mode before switching back.
- Drive timing with `springTiming` for a modern feel, not linear easing.
- Ken Burns pan/zoom: `interpolate` with `extrapolateLeft/Right: 'clamp'`, driving a ZOOM range from `minScale` up to `minScale * 1.15` over the scene's progress (a fixed anchor on the axis constrained by the logo box stays safe at every zoom level, since the window only shrinks as zoom increases — see below). Prevent sub-pixel jitter with `transform: perspective(100px)` + `willChange: transform` on the animated element. Use Remotion's `<Img>` (not a plain `<img>`) so rendering waits for the image to load.

## Watermark avoidance (safe viewport, no hard crop)

- `video/src/timing/safe-viewport.ts`'s `computeSafeViewport(imageSize, frameSize, logo)` takes the SOURCE IMAGE's real pixel size and the video frame's size (not just the logo box) — the visible window is an `object-fit: cover` crop of the image sized to the frame's aspect ratio, so an image whose aspect ratio differs from the frame (e.g. a 1376x768 Flow image into a 9:16 frame) crops correctly instead of getting distorted or the wrong window size. Every `RenderableScene` therefore carries `imageWidth`/`imageHeight` alongside its `imageUrl`.
- It returns a `minZoom` (>=1) and which axis/edge the window must stay anchored to; Ken Burns then zooms from `minZoom` up over the scene's duration while anchored there, and centers on the OTHER (free) axis. This guarantees every frame stays clear of the logo box, since the window only shrinks as zoom increases past `minZoom`.
- The logo box: **measured live for 16:9** (task 005, 2026-09-17) from a real Flow-generated 1376x768 image — `video/src/timing/safe-viewport.ts`'s `ASSUMED_LOGO_BOX` = `{x:0.66, y:0.74, width:0.34, height:0.26}` (a comfortable margin around the actual sparkle+comet-tail extent, not a tight pixel crop). **9:16 is still unmeasured** and reuses this same box as a working default until a real 9:16 image is measured the same way.

## Captions (TikTok-style)

- Word-level timestamps come from whisper.cpp (`@remotion/install-whisper-cpp`), a multilingual model (no `.en` suffix), forced `language: 'vi'`, run on a 16kHz mono WAV.
- Rendered via `createTikTokStyleCaptions`; each token keeps its leading space exactly as returned.
- Font: `@remotion/google-fonts`, subset `vietnamese`, so diacritics render correctly. Chosen font: `Be Vietnam Pro` (`video/src/captions/tiktok-captions.tsx`) — a Google Font whose `vietnamese` subset ships with the package and covers every Vietnamese diacritic combination.
- `createTikTokStyleCaptions` strips the leading space off the FIRST token in the whole `Caption[]` array (nothing precedes it) and only breaks into a new page once the CURRENT page's own span (first token's `startMs` to the last-added token's `endMs`) exceeds `combineTokensWithinMilliseconds` AND the next token's text starts with a space — a real time GAP between two tokens does NOT by itself force a page break (verified against the library's real output, task 007). `video/src/captions/caption-tokenizer.ts`'s `groupCaptionsForDisplay` is a thin, side-effect-free wrapper; do not re-derive this splitting logic elsewhere.

## Rendering

- `bundle()` once per process and reuse it; `selectComposition` then `renderMedia({codec: 'h264', onProgress, cancelSignal})` for every render — never re-bundle per render.
- The Player mounts the composition's root component directly, never wrapped in a `<Composition>` element.

## Verifiable rules

- Every function in `video/src/timing/**` has a contract-level EP/BVA test (frame at start/middle/end/near-boundary never overlaps the logo box; no blank edge ever visible).
- `video/` contains no IO (no `fs`, no `fetch` beyond the asset URLs Remotion itself resolves) — it is pure composition + timing math, unit-testable without a running server.
- A render integration test that only checks the OUTPUT FRAME COUNT is not sufficient proof the render is correct: `renderMedia` always emits exactly the `durationInFrames` its own `calculateMetadata` declared, so a frame-count match holds even when the actual content is shorter (trailing black/silent frames) or the transition rendered fully black. `be/src/render/render-video.test.ts` also samples real pixel color at specific timestamps (via `@ffmpeg-installer/ffmpeg`) to catch that class of bug.
- When a pixel-sample assertion targets a specific timing window (e.g. inside a transition), derive that window's start/end from the SAME frame arithmetic `TransitionSeries` actually uses (the next sequence's transition starts `transitionFrames` before the previous sequence's own `durationInFrames` ends), never a guessed sign or offset — see `debugging.md`'s Known bugs for the exact off-by-sign mistake this project made, which sampled 12 frames before the transition window even started and still passed.
