# Image Prompting (Flow / Nano Banana)

## Reference-image mechanism (task 015 v2 — upload, not named assets)

**This supersedes the task-013/015 "named Flow asset" design described further below.** A real
smoke run (2026-09-17/18) proved that path unusable in practice, so references now work like this:

1. **Phase 0 generates each reference image exactly like a normal scene image** — plain
   `typeIntoPromptBox` + `submitImage`/`waitForImageAtTile` on the main canvas, then download to
   `assets/references/<referenceId>.<ext>`. No `/character` route, no rename, no in-Flow save.
2. **Every later scene reattaches it by UPLOADING that local file** into the "+" picker
   (`attachUploadedReferenceImages`, `be/src/providers/flow/flow-automation.ts`): open the picker,
   click `button.sidebar-upload-btn`, intercept Chromium's native `filechooser` event, hand it the
   file, then click the newest `.asset-item` (`.first()`, Flow sorts most-recent-first) and
   "Thêm vào câu lệnh" (`button.detail-add-to-prompt-btn`).

Why the old design was dropped (all verified live, not guessed):

- The "+" picker's search box **does not actually filter its result list** by the typed text — a
  live check with `"To Nhuoc Y"` typed in still returned 17 unrelated assets — so any by-name
  lookup was structurally unreliable.
- The separate "Nhân vật" creation route's "Xong"/Done control renders as **two different DOM
  shapes depending on viewport width**, and its rename step could report success while the asset
  stayed titled "Nhân vật chưa có tên", invisible to every later by-name lookup.
- Uploading a file needs none of that: no name, no asset library state, no extra route.

### Writing prompts for the upload mechanism

Since the reference arrives as an *unnamed attached image*, the prompt should refer to it
positionally, not by name: **"Using the attached character image, ..."** / **"Using the attached
reference images (character, then setting), ..."**, then state what stays fixed and what changes.
Writing "the attached reference image of Cô Lan" is now misleading — Flow has no name for it.

## Retired: named-asset reference mechanism (task 013, kept for context)

Flow has a NATIVE character/setting consistency feature — verified live 2026-09-17 against a real
`https://flow.google.com/project/<uuid>` page — so this project does NOT need a hand-rolled
"character bible" text workaround.

- The left sidebar's **"Nhân vật"** ("Character") and **"Cảnh"** ("Scene"/setting) sections let a
  user create a reusable asset once, either by uploading a reference photo or describing it in
  text, with the UI's own copy stating its purpose plainly: "Tạo và sử dụng lại các nhân vật để
  video luôn nhất quán" (create and reuse characters so the video stays consistent).
- Any later prompt can attach ANY existing project asset (a Character/Scene, or a previously
  generated image) via the **"+"** button beside the prompt box (`button.add-menu-trigger`), which
  opens a picker: search box (`.editable-text-input`) → matching asset (`.asset-item`) → **"Thêm
  vào câu lệnh"** ("Add to prompt", `button.detail-add-to-prompt-btn`). This inserts the asset as
  an inline reference chip in the SAME prompt box `typeIntoPromptBox` (be/.claude/rules/flow-automation.md)
  types narration-derived text into — attaching must happen BEFORE typing, since it does not touch
  `.ProseMirror`'s own text content.
- `attachReferenceAssets` in `be/src/providers/flow/flow-automation.ts` drives this picker by the
  asset's exact display name (`referenceSchema.name`), matched via the picker's own search filter.

## Writing `imagePrompt` / reference `prompt` text

Nano Banana (Gemini's image model family) responds better to a narrative SENTENCE describing a
scene than to a comma-separated keyword list — this is the documented best practice for
Gemini-family image generation (Google's own "Prompting guide for Nano Banana" examples all read as
full sentences, not tag soup).

- Structure every prompt as one flowing sentence covering: **subject + action, setting, lighting,
  camera angle/lens**. Example: "A weathered barista in her fifties pours drip coffee at dawn, warm
  incandescent light spilling across a narrow Hanoi shopfront, shot from a low three-quarter angle
  on a 35mm lens."
- When a scene attaches a reference (character or setting), open the prompt with the
  reference-anchored phrasing Google's own guide and Cloud blog use, but referring to the image
  POSITIONALLY rather than by name (task 015 v2 attaches an uploaded file, which Flow knows no name
  for): **"Using the attached character image, ..."** / **"Using the attached character image and
  the attached setting image, ..."**, then state what must stay fixed vs. what changes — e.g.
  "Using the attached character image, keep her face, hairstyle, and áo bà ba exactly as shown;
  change only the setting to a rainy street market at dusk." Re-describing physical traits already
  carried by the reference risks the model drifting away from the attached image instead of
  anchoring to it. (Verified 2026-09-17 against Google Cloud's "Ultimate prompting guide for Nano
  Banana" and the official Gemini blog's Nano Banana Pro prompting tips — both use this
  "Using the attached reference image(s), ..." opening for identity-preserving generations;
  Nano Banana Pro itself supports up to 14 reference images per generation, well above what this
  pipeline ever attaches per scene.)
- Keep style/mood words (e.g. "cinematic", "soft morning light") consistent ACROSS every scene of
  one project — sudden style whiplash between scenes reads as more jarring than a slightly
  imperfect single style applied uniformly.

## Wired into the live pipeline (task 015 v2)

`pipeline-engine.ts`'s `run()` has a phase 0, sequential and BEFORE any scene's own image step:
for every `project.references[]` entry still missing `imageFile`, it calls
`ImageProvider.generateReferenceImage(reference.prompt, reference.name, ctx)` (idempotent across a
resume — an entry that already has `imageFile` is skipped) and persists the result. `runImageStep`
then resolves each scene's `referenceIds` to the ABSOLUTE PATHS of those downloaded files
(`ImageGenerationContext.referenceImageFiles`, via `resolveReferenceImageFiles`) and
`FlowImageProvider.generateImage` calls `attachUploadedReferenceImages` with them, inside the
submit mutex, BEFORE typing that scene's own prompt. A provider with no `generateReferenceImage`
(e.g. a minimal test double) makes phase 0 fail the run with a `fatal`
`IMAGE_PROVIDER_MISSING_REFERENCE_SUPPORT` error rather than silently skipping reference
generation.

Covered by `pipeline-engine.test.ts`'s "reference (character/setting) phase 0" describe block
(fake-provider level: ordering + resume + the missing-support failure) and
`flow-automation.test.ts`'s upload matrix (real Chromium `filechooser` interception against the
fixture). **A real Flow smoke run proving two scenes stay visually consistent through an uploaded
reference is still outstanding** — the retired named-asset design never got that far, and this v2
path has only been verified step-by-step live (upload button, file chooser, item ordering), not yet
end to end in one pipeline run.
