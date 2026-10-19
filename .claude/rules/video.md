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
- The transition's frame count is READ BACK from the timing object (`TRANSITION_FRAMES` in `transition-timing.ts`, `createTransitionTiming().getDurationInFrames({fps})`), never re-typed in a second place: `calculateMetadata`, the JSX and the render test must all derive it from that one object (a hand-guessed `20` was once off by 3 frames per transition against a spring's real settle time).
- `durationMs` for each scene's audio is measured once by the backend right after TTS completes and stored in `project.json`; the composition's `calculateMetadata` derives `durationInFrames`/`width`/`height` from those stored values, never re-measuring audio itself.
- `<Audio>` (from `@remotion/media`) lives INSIDE each `TransitionSeries.Sequence`, alongside that scene's image; never given a separate `from`.
- Assets (images/audio) are served to the SSR renderer as HTTP URLs from the backend (`http://127.0.0.1:<port>/api/projects/:id/assets/...`), not via `staticFile`. Task 002 serves this from a fixed sample-fixture folder (`be/src/routes/assets.ts`, `GET /api/samples/*`) ahead of the real per-project asset route a later task adds.

## Transitions & motion

- **Two presentations ALTERNATE per join (task 024):** `video/src/compositions/transition-plan.ts`'s `presentationKindForJoin` is the single source of truth — even joins use `cross-zoom-presentation.tsx` (pushes the outgoing scene IN, scale > 1), odd joins use `soft-fade-presentation.tsx` (pulls it BACK, scale < 1). Both are hand-written CSS and both share ONE duration, deliberately: giving them different durations would force `sceneFramesForTimeline` to take a per-join array and `render-video.test.ts` to derive its sample window per join, real risk against the "same source" invariant below for no visible gain. `render-video.test.ts` pixel-samples BOTH joins; sampling only one would leave the other presentation completely unproven, which is exactly how the built-in canvas transition shipped black frames.
- **Join timing is `linearTiming` + `Easing.inOut(cubic)`, 18 frames (2026-10-14).** The old `springTiming({damping: 200})` front-loaded ~88% of the motion into the first 11 of 23 frames, so joins read as a ~250ms cut. The ONE definition lives in the plain-`.ts` `video/src/compositions/transition-timing.ts` (`createTransitionTiming`, `TRANSITION_FRAMES`), which `main-composition.tsx` AND `be/src/render/render-video.test.ts` both import by deep path — the test used to re-type `springTiming(...)` itself and silently went stale when the timing changed. Both presentations also add a mid-transition CSS blur (`transition-blur.ts`, peak 6px, exactly `blur(0px)` at progress 0 and 1, since Remotion holds the ENTERING side at progress 1 for the rest of its scene).
- Ken Burns direction ALTERNATES per scene (`kenBurnsDirectionForScene` in `main-composition.tsx`, `KenBurnsDirection` in `safe-viewport.ts`): even scenes zoom in, odd scenes zoom out, over the identical zoom range so neither is more aggressive. Zoom never drops below `minZoom` in either direction, which is what preserves the logo-avoidance guarantee.
- The transition is a HAND-WRITTEN CSS-transform `TransitionPresentation` (`video/src/compositions/cross-zoom-presentation.tsx`: opacity + `perspective(100px) scale(...)`), not `@remotion/transitions`'s own built-in `crossZoom`. The built-in draws through a WebGL2 canvas (`makeHtmlInCanvasPresentation`) and produced fully BLACK frames — not just a broken transition, the whole frame — in this project's headless-Chrome renderer, which has no hardware GPU context. Re-check this if a future Remotion/Chrome upgrade might have fixed canvas support in headless mode before switching back.
- Ken Burns pan/zoom: `interpolate` with `extrapolateLeft/Right: 'clamp'` and `Easing.inOut` (task 024 — a constant-rate drift over a 7-16 second scene is what makes a still image read as a still image; `Easing.ease` must be wrapped in an arrow, since `@typescript-eslint/unbound-method` rejects passing a method by reference), driving a ZOOM range from `minScale` up to `minScale * 1.06` over the scene's progress (`KEN_BURNS_ZOOM_FACTOR`, `video/src/timing/safe-viewport.ts`, lowered from `1.15` on 2026-09-18 after user feedback that the stronger push-in read as "phèn"/cheap; a fixed anchor on the axis constrained by the logo box stays safe at every zoom level, since the window only shrinks as zoom increases — see below). Prevent sub-pixel jitter with `transform: perspective(100px)` + `willChange: transform` on the animated element. Use Remotion's `<Img>` (not a plain `<img>`) so rendering waits for the image to load.

## Watermark avoidance (safe viewport, no hard crop)

- `video/src/timing/safe-viewport.ts`'s `computeSafeViewport(imageSize, frameSize, logo)` takes the SOURCE IMAGE's real pixel size and the video frame's size (not just the logo box) — the visible window is an `object-fit: cover` crop of the image sized to the frame's aspect ratio, so an image whose aspect ratio differs from the frame (e.g. a 1376x768 Flow image into a 9:16 frame) crops correctly instead of getting distorted or the wrong window size. Every `RenderableScene` therefore carries `imageWidth`/`imageHeight` alongside its `imageUrl`.
- It returns a `minZoom` (>=1) and which axis/edge the window must stay anchored to; Ken Burns then zooms from `minZoom` up over the scene's duration while anchored there, and centers on the OTHER (free) axis. This guarantees every frame stays clear of the logo box, since the window only shrinks as zoom increases past `minZoom`.
- The logo box: **measured live for 16:9** (task 005, 2026-09-17) from a real Flow-generated 1376x768 image — `video/src/timing/safe-viewport.ts`'s `ASSUMED_LOGO_BOX` = `{x:0.66, y:0.74, width:0.34, height:0.26}` (a comfortable margin around the actual sparkle+comet-tail extent, not a tight pixel crop). **9:16 is still unmeasured** and reuses this same box as a working default until a real 9:16 image is measured the same way.

## Captions (TikTok-style)

- Word-level timestamps come from whisper.cpp (`@remotion/install-whisper-cpp`), a multilingual model (no `.en` suffix), forced `language: 'vi'`, run on a 16kHz mono WAV.
- **The text on screen is ALWAYS the script's, never whisper's (task 023).** whisper transcribes the audio, so it mishears; the pipeline already knows the exact narration it sent to Vbee, so `be/src/providers/whisper/align-captions-to-narration.ts` returns one caption per SCRIPT word, spelled from the script and timed from whisper. It uses a hand-written global Needleman-Wunsch alignment (`pair-tokens-to-words.ts`) over a diacritic-folded comparison key (`normalize-caption-token.ts`), NOT an exact token-count match: measured over the 231 real caption files on disk, an exact-count guard bailed on 110 of them (47.6%) and left whisper's misspellings on screen ("chồng lên" as "trồng lên", "cửa sổ" as "c�a sổ"), because whisper routinely drifts a token or two by normalizing numbers ("mười lăm nghìn" into one "15.000"), adding quotes, or splitting a misheard proper noun. Alignment took that from 51.5% to 100% of words shown with the script's own spelling, with 9 words of ≤5ms timing drift across 3 scenes versus the old path. Several script words against ONE token split that token's span by written length; one script word against SEVERAL tokens absorbs them. Do NOT reach for whisper's `--prompt`/`initial_prompt` instead — it is a soft bias, not a constraint, and `@remotion/install-whisper-cpp`'s `transcribe()` does not expose it. No maintained JS/TS forced-alignment package exists (WhisperX and ctc-forced-aligner are Python), which is why this is hand-written.
- whisper.cpp emits genuinely **zero-length tokens** (`{text: " ý", startMs: 1040, endMs: 1040}` is real output here). A zero-length window can never contain a frame's timestamp, so that word never highlights. `alignCaptionsToNarration` enforces a 1ms floor plus strict ordering. The floor is deliberately NOT one frame (34ms): whisper also emits many valid 10-30ms tokens, and a 34ms floor silently lengthened 54 words across 118 otherwise-correct scenes, shifting everything after them by up to 170ms. **Open finding:** a word whisper timed under one frame renders but never becomes the highlighted word.
- **Caption motion (2026-10-14):** `video/src/captions/caption-motion.ts` is the pure source for it. `pageMotion` fades/rises a page in over 5 frames and fades it out over the last 3; `wordMotion` gives only the ACTIVE word a spring pop (`1 + 0.12 * spring`, damping 10 / mass 0.5) and a 3-frame white-to-green blend. Words are `inline-block` + `white-space: pre` so scaling never reflows the line. Because of the blend, the first ~100ms of a word is still white: a pixel test must sample past a word's start, not on it.
- Rendered via `createTikTokStyleCaptions`; each token keeps its leading space exactly as returned.
- Font: `@remotion/google-fonts`, subsets `["vietnamese", "latin"]` — **both are required**, not
  just `vietnamese`: Google Fonts scopes each subset file by its own CSS `unicode-range`, and
  `vietnamese` alone does not cover plain ASCII letters. Loading only `vietnamese` (every render
  from task 008 through 2026-09-18) left every plain-ASCII letter (C, n, g, s...) with no
  `@font-face` covering its codepoint, so the browser silently fell back to its default serif for
  those letters while only the Vietnamese diacritic letters used the loaded font — a real render
  showed a font MIX, invisible unless you zoom into an actual rendered frame and check the
  plain-ASCII letterforms specifically (checking only the diacritic marks, as every earlier
  verification pass did, hides it completely). This was the true, long-standing cause of the "bể
  font" complaints, not font choice, not the Whisper mis-transcription, not glyph coverage.
  Chosen font: `Inter` (`video/src/captions/font.ts`) — picked 2026-09-18 as an SF-Pro-style
  alternative to `Be Vietnam Pro` (SF Pro itself is Apple's own font, not a Google Font, and
  cannot be embedded here). **Tried `Montserrat` first (2026-09-18), reverted the same day**: a
  real render of "cửa" came back as "c??a" — that `@remotion/google-fonts` version's `Montserrat`
  `vietnamese` subset is missing the horn+hook-above glyph (`ử`), a genuine missing-glyph bug
  caught only by reading a real rendered frame, not by the font's own metadata claiming the
  subset. Do not re-attempt a font swap without checking BOTH every Vietnamese diacritic
  combination AND plain-ASCII letterforms in an actual rendered frame first.
- `createTikTokStyleCaptions` strips the leading space off the FIRST token in the whole `Caption[]` array (nothing precedes it) and only breaks into a new page once the CURRENT page's own span (first token's `startMs` to the last-added token's `endMs`) exceeds `combineTokensWithinMilliseconds` AND the next token's text starts with a space — a real time GAP between two tokens does NOT by itself force a page break (verified against the library's real output, task 007). `video/src/captions/caption-tokenizer.ts`'s `groupCaptionsForDisplay` is a thin, side-effect-free wrapper; do not re-derive this splitting logic elsewhere.
- whisper's word times drift after a long silence (it once assigned 1.1 s of silence to one word), so long-form narration is transcribed per paragraph and offset back (`collage-broll/scripts/narrate-expressive.mjs`).

## Rendering

- `bundle()` once per process and reuse it; `selectComposition` then `renderMedia({codec: 'h264', onProgress, cancelSignal})` for every render — never re-bundle per render.

## Verifiable rules

- Every function in `video/src/timing/**` has a contract-level EP/BVA test (frame at start/middle/end/near-boundary never overlaps the logo box; no blank edge ever visible).
- `video/` contains no IO (no `fs`, no `fetch` beyond the asset URLs Remotion itself resolves) — it is pure composition + timing math, unit-testable without a running server.
- A render integration test that only checks the OUTPUT FRAME COUNT is not sufficient proof the render is correct: `renderMedia` always emits exactly the `durationInFrames` its own `calculateMetadata` declared, so a frame-count match holds even when the actual content is shorter (trailing black/silent frames) or the transition rendered fully black. `be/src/render/render-video.test.ts` also samples real pixel color at specific timestamps (via `@ffmpeg-installer/ffmpeg`) to catch that class of bug.
- When a pixel-sample assertion targets a specific timing window (e.g. inside a transition), derive that window's start/end from the SAME frame arithmetic `TransitionSeries` actually uses (the next sequence's transition starts `transitionFrames` before the previous sequence's own `durationInFrames` ends), never a guessed sign or offset — see `debugging.md`'s Known bugs for the exact off-by-sign mistake this project made, which sampled 12 frames before the transition window even started and still passed.
