import type { TtsOptions } from "./index.ts";
import { resolveTtsSpeed, type Preset } from "./presets.ts";

/** Narration defaults the user chose by ear from A/B samples (2026-10-18, `.claude/rules/voice-tuning.md`):
 * short comma and sentence pauses so the voice is not chopped, and a long paragraph break kept as the
 * dramatic pause. Explicit per-project settings still win, including zero gaps.
 *
 * `emphasisIntensity` is deliberately NOT defaulted here (task 022): probed live 2026-09-20, this
 * Vbee account rejects every shape-valid value with a bare `400 BAD_REQUEST` on all 5 voices
 * tried, so defaulting it would only produce a field that `vbeeNarrationOptions` has to drop
 * again. `ttsOptionsSchema` still accepts it as user input in case the account's plan ever gains
 * the capability. */
export const NARRATION_DEFAULTS = {
  clientPause: { mediumBreak: 0.2, majorBreak: 0.3, sentenceBreak: 0.4, paragraphBreak: 1.4 },
  scenePauseMs: 600,
} as const;

export function resolveNarrationOptions(preset: Preset, options?: TtsOptions): TtsOptions {
  return {
    ...NARRATION_DEFAULTS,
    ...options,
    speed: resolveTtsSpeed(preset, options?.speed),
    clientPause: { ...NARRATION_DEFAULTS.clientPause, ...options?.clientPause },
  };
}
