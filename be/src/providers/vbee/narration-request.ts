import type { TtsOptions } from "@flow-ex/shared-schemas";

import { applyPronunciations } from "./pronunciation.ts";

/** Preserve punctuation and paragraph breaks; finish bare scene fragments as sentences.
 * Do not invent SSML or uppercase emphasis markers that some voices read literally. English
 * names are respelled phonetically (`applyPronunciations`) for the voice only; captions keep the
 * script's own spelling. */
export function prepareNarration(text: string): string {
  const clean = applyPronunciations(text.trim());
  return clean && !/[.!?…]["'”’»)]*$/.test(clean) ? `${clean}.` : clean;
}

/** What Vbee's `POST /v1/tts` body actually gets. Two fields of `TtsOptions` are deliberately
 * excluded, each for a DIFFERENT, measured reason (../../.claude/rules/vbee-tts.md, task 022):
 *
 * - `scenePauseMs` is LOCAL timeline silence between scenes, added to the scene's own frame count
 *   by `video/src/timing/scene-duration.ts`. Vbee has no such concept.
 * - `emphasisIntensity` is a REAL Vbee field this account cannot use. Probed live 2026-09-20: Vbee
 *   validates its shape (`1` → "must be a multiple of 10", `0.6` → "expected int", `"60"` →
 *   "expected number"), yet EVERY shape-valid value (0, 10, 50, 60, 100) returns a bare
 *   `400 BAD_REQUEST` with no message, across all 5 voices tried. Sending it would make every
 *   scene fail `fatal`, so it is dropped rather than forwarded.
 *
 * `clientPause` IS forwarded, and is the fix for "the voice reads straight through without
 * pausing at a full stop": measured live on the same text, `sentenceBreak: 0.1` produced 2.377s
 * of audio and `sentenceBreak: 2.0` produced 8.072s, so Vbee genuinely applies it.
 *
 * Destructured explicitly rather than spread-with-rest so both exclusions are visible in the code,
 * and so a newly added `TtsOptions` field has to be considered here instead of silently leaking
 * into the request body. */
export function vbeeNarrationOptions(
  options?: TtsOptions,
): Omit<TtsOptions, "scenePauseMs" | "emphasisIntensity"> {
  if (!options) return {};
  const { speed, bitrate, sampleRate, clientPause } = options;
  return { speed, bitrate, sampleRate, clientPause };
}
