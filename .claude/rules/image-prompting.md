# Image Prompting (Flow / Nano Banana)

## Reference-image mechanism (task 013)

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
- When a scene attaches a reference (character or setting), the prompt text should say so
  explicitly rather than re-describing the subject from scratch — e.g. "Keep the character from the
  attached reference exactly as she is; change only the setting to a rainy street market at dusk."
  Re-describing physical traits already carried by the reference risks the model drifting away from
  the attached image instead of anchoring to it.
- Keep style/mood words (e.g. "cinematic", "soft morning light") consistent ACROSS every scene of
  one project — sudden style whiplash between scenes reads as more jarring than a slightly
  imperfect single style applied uniformly.

## Known gap (task 013, deliberately deferred — see PLAN.md task 015)

`pipeline-engine.ts`'s scene loop does not yet automatically run a "phase 0" that generates every
`project.references[]` entry's image before any scene's own image step, nor does `runImageStep`
yet call `attachReferenceAssets` for a scene's `referenceIds`. `references`/`referenceIds` are
fully validated at the schema layer (`packages/shared-schemas`) and `attachReferenceAssets` is
fixture-tested end to end, but wiring them into the live pipeline run (plus the real Flow smoke
test proving two scenes stay visually consistent) is scoped out of this task to avoid shipping a
half-verified integration under this iteration's time budget — same discipline as
`error-handling.md`'s "Known gap" entries. Do not assume reference generation runs automatically
until that follow-up task lands.
