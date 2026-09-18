import type { Caption } from "@remotion/captions";

/**
 * Whisper transcribes the ACTUAL audio, so its own word text can mishear/misspell a word Vbee's
 * TTS voice pronounced ambiguously — but the pipeline already knows the exact `narration` text
 * that was sent to Vbee in the first place. Since whisper's timestamps are still the only real
 * per-word TIMING signal (the pipeline never re-derives that itself), this replaces each caption
 * token's TEXT with the corresponding word from the original script while keeping whisper's own
 * `startMs`/`endMs`/`timestampMs`/`confidence` untouched — trusting the script for spelling,
 * whisper only for timing.
 *
 * Only applied when whisper produced exactly as many tokens as the narration has words: a
 * mismatch (whisper split/merged tokens differently, e.g. two words heard as one) means a
 * positional 1:1 replace would silently attach the wrong word to the wrong timestamp, which is
 * worse than a real transcription typo. In that case the original whisper captions are returned
 * unchanged.
 */
export function alignCaptionsToNarration(captions: Caption[], narration: string): Caption[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (words.length !== captions.length || words.length === 0) {
    return captions;
  }
  return captions.map((caption, index) => {
    // `words.length === captions.length` was just checked above, so `words[index]` is always
    // defined here; the `?? ""` is only to satisfy `noUncheckedIndexedAccess`, never a real fallback.
    const word = words[index] ?? "";
    return {
      // Every token but the first keeps a leading space (video.md's Captions convention: "each
      // token keeps its leading space exactly as returned" by whisper/createTikTokStyleCaptions).
      ...caption,
      text: index === 0 ? word : ` ${word}`,
    };
  });
}
