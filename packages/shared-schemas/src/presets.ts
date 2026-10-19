import { z } from "zod";

import type { AspectRatio } from "./index.ts";

/** `preset` (task 009): a single source of truth for the frame/caption/TTS-speed/length defaults
 * that used to be picked one-off per project. `aspectRatio` stays independently settable on
 * `scriptInputSchema` — when the user writes it explicitly it WINS over whatever the chosen
 * preset would otherwise imply (../../.claude/rules/video.md's "aspectRatio vs preset" note
 * records this decision); this module only computes the PRESET's own default, never the final
 * resolved value by itself. */
export const presetSchema = z.enum(["tiktok", "youtube"]);
export type Preset = z.infer<typeof presetSchema>;

export interface CaptionStyleConfig {
  fontSize: number;
  fontWeight: number;
  /** Percentage (0-100) of the frame height reserved below the caption box. */
  paddingBottomPercent: number;
  /** `combineTokensWithinMilliseconds` passed to `createTikTokStyleCaptions`
   * (video/src/captions/caption-tokenizer.ts). */
  combineTokensWithinMs: number;
}

export interface DurationRangeSeconds {
  min: number;
  max: number;
}

export interface SceneCountRange {
  min: number;
  max: number;
}

export interface PresetConfig {
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  captionStyle: CaptionStyleConfig;
  /** Vbee `speed` (0.25-1.9) used when the project's own `tts.speed` is not set explicitly. */
  ttsSpeed: number;
  suggestedDuration: DurationRangeSeconds;
  suggestedSceneCount: SceneCountRange;
  /** Suggested spoken length of ONE scene, i.e. how long a single still image is asked to hold the
   * viewer (task 025). Added because `suggestedDuration` and `suggestedSceneCount` together only
   * imply this, and real projects drifted well past what they imply: measured across the three
   * most recent `tiktok` projects, scenes ran 7.2 to 16.0 seconds each while the whole video was
   * meant to be 30-60 seconds. One still image with a 6% zoom held for 16 seconds is the single
   * biggest thing making the output look static, and no amount of render-side work can fix it. */
  suggestedSceneDurationSeconds: DurationRangeSeconds;
}

/** Words per second of ACTUAL SPEECH, with the sentence pauses taken out. Least-squares fitted
 * over the three real runs tabulated on `estimateNarrationSeconds`. */
export const SPEECH_WORDS_PER_SECOND = 3.85;

/** Seconds of pause Vbee adds per sentence-ending mark, least-squares fitted alongside
 * `SPEECH_WORDS_PER_SECOND`. Note it does NOT equal this project's configured
 * the old `clientPause.sentenceBreak: 0.9` — it absorbs comma/colon breaks and
 * per-sentence lead-in too, so treat it as a fitted coefficient, not a reading of the config. */
export const SENTENCE_BREAK_SECONDS = 0.62;

/**
 * Estimated narration duration for a block of Vietnamese text at `ttsSpeed` 0.85 with the OLD
 * `clientPause` defaults (sentenceBreak 0.9).
 *
 * **Stale for the current defaults** (speed 0.95, sentenceBreak 0.4, `narration.ts`): the coefficients
 * below were fitted before the user's by-ear retune and are not re-fitted. Treat the output as an upper
 * bound and measure one real scene before budgeting words to a hard duration.
 *
 * A single words-per-second figure CANNOT work here, and this project shipped two wrong ones
 * before arriving at this: 4.5 (measured pre-task-022, overshot a 60s target by 43%) and then 3.3
 * (measured on one post-022 run, still overshot by 15%). The reason is that a flat rate conflates
 * two independent costs — speaking the words, and pausing at each sentence mark. Punchy short
 * sentences carry far more pause per word than long ones, so the same word count can differ by
 * 20% in duration on punctuation alone.
 *
 * Fitted by least squares over three real runs, worst case 1.3%:
 *
 * | run                     | words | sentence marks | actual | predicted |
 * | ----------------------- | ----- | -------------- | ------ | --------- |
 * | Johnny Joestar, full    | 253   | 24             | 79.4s  | 80.5s     |
 * | Johnny Joestar, trimmed | 183   | 23             | 62.4s  | 61.7s     |
 * | Johnny Joestar, final   | 190   | 12             | 57.4s  | 56.7s     |
 *
 * **Methodology note worth keeping, because it nearly fooled this project:** an earlier pass fitted
 * the same two coefficients on only the FIRST TWO runs and reported "0.0% error". Two parameters
 * always reproduce two data points exactly, so that number measured nothing. It also threw up two
 * coincidences that looked like independent corroboration — the fitted pause landed on 0.88 next to
 * a configured `sentenceBreak` of 0.9, and the fitted speech rate landed on 4.34, the median of the
 * old 231-scene corpus. Both moved (to 0.62 and 3.85) the moment a third, held-out run was added,
 * where the two-point fit was 5.3% off. Quote an error figure from data the fit has NOT seen.
 *
 * `sentenceMarks` counts `.`, `!`, `?`, `…` and `:`. A project's `scenePauseMs` silence between
 * scenes sits OUTSIDE this estimate — subtract it from the target before budgeting words. All
 * three runs used one voice (`s_hochiminh_female_astraea_advertise_vc`), so expect another voice
 * to shift the speech coefficient; re-fit rather than assume.
 */
export function estimateNarrationSeconds(words: number, sentenceMarks: number): number {
  return words / SPEECH_WORDS_PER_SECOND + sentenceMarks * SENTENCE_BREAK_SECONDS;
}

/** How many `.`/`!`/`?`/`…`/`:` marks a narration block carries — the pause-driving half of
 * `estimateNarrationSeconds`. */
export function countSentenceMarks(text: string): number {
  return (text.match(/[.!?…:]/g) ?? []).length;
}

/** Pure data, no IO (../../.claude/rules/architecture.md: `packages/shared-schemas` stays a plain
 * data/validation package). */
export const PRESETS: Record<Preset, PresetConfig> = {
  tiktok: {
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    captionStyle: {
      fontSize: 96,
      fontWeight: 800,
      paddingBottomPercent: 30,
      combineTokensWithinMs: 600,
    },
    ttsSpeed: 0.95,
    suggestedDuration: { min: 30, max: 60 },
    suggestedSceneCount: { min: 6, max: 10 },
    suggestedSceneDurationSeconds: { min: 3, max: 6 },
  },
  youtube: {
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    captionStyle: {
      fontSize: 56,
      fontWeight: 700,
      paddingBottomPercent: 8,
      combineTokensWithinMs: 1600,
    },
    ttsSpeed: 0.95,
    suggestedDuration: { min: 180, max: 480 },
    suggestedSceneCount: { min: 10, max: 24 },
    suggestedSceneDurationSeconds: { min: 8, max: 16 },
  },
};

/** `aspectRatio` explicit on the input WINS over the preset's own default (video.md's recorded
 * decision) — this is the ONE function both `be/` and `video/`-adjacent BE code call to get a
 * concrete `AspectRatio` out of a `{preset, aspectRatio?}` pair. */
export function resolveAspectRatio(input: {
  preset: Preset;
  aspectRatio?: AspectRatio;
}): AspectRatio {
  return input.aspectRatio ?? PRESETS[input.preset].aspectRatio;
}

/** Explicit `tts.speed` on the project WINS over the preset's own default, same rule as
 * `resolveAspectRatio`. */
export function resolveTtsSpeed(preset: Preset, explicitSpeed?: number): number {
  return explicitSpeed ?? PRESETS[preset].ttsSpeed;
}

/** Migration helper (task 009): a `project.json` written before `preset` existed always had an
 * explicit `aspectRatio` (it was required back then), so the preset is inferred deterministically
 * from it — "9:16" implies the vertical/TikTok preset, anything else falls back to "youtube". */
export function inferPresetFromAspectRatio(aspectRatio: AspectRatio | undefined): Preset {
  return aspectRatio === "9:16" ? "tiktok" : "youtube";
}
