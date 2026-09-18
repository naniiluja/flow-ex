import type { Caption, TikTokPage } from "@remotion/captions";
import { createTikTokStyleCaptions } from "@remotion/captions";

const DEFAULT_COMBINE_WITHIN_MS = 1200;

export interface GroupCaptionsResult {
  pages: TikTokPage[];
}

/** Thin wrapper over `@remotion/captions`'s `createTikTokStyleCaptions` (../../.claude/rules/video.md):
 * groups word-level `captions` into TikTok-style "pages" that switch once the CURRENT page's own
 * span (its first token's `startMs` to its last token's `endMs` so far) exceeds
 * `combineTokensWithinMilliseconds` (default 1.2s) AND the next token's text starts with a space
 * (`createTikTokStyleCaptions`'s own split rule — a gap in TIME between two tokens with nothing
 * accumulated in between does not by itself force a break). `createTikTokStyleCaptions` already
 * returns `{pages: []}` for an empty `captions` array, so this adds no special case of its own.
 * Pure, no IO (video.md's "no IO" rule). */
export function groupCaptionsForDisplay(
  captions: Caption[],
  combineTokensWithinMilliseconds: number = DEFAULT_COMBINE_WITHIN_MS,
): GroupCaptionsResult {
  return createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds });
}
