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
    ttsSpeed: 1.15,
    suggestedDuration: { min: 30, max: 60 },
    suggestedSceneCount: { min: 6, max: 10 },
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
    ttsSpeed: 1.0,
    suggestedDuration: { min: 180, max: 480 },
    suggestedSceneCount: { min: 10, max: 24 },
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
