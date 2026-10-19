import type { Caption } from "@remotion/captions";

import { normalizeCaptionToken } from "./normalize-caption-token.ts";
import { pairTokensToWords } from "./pair-tokens-to-words.ts";

/** Minimum on-screen time for one caption, kept as small as it can be while still guaranteeing a
 * strictly ordered, non-degenerate timeline. whisper.cpp genuinely emits ZERO-LENGTH tokens —
 * `{text: " ý", startMs: 1040, endMs: 1040}` and `{text: " do.", startMs: 3600, endMs: 3600}` both
 * appear in this project's real caption files — which would otherwise propagate straight through.
 *
 * Deliberately NOT one frame's worth (34ms at the composition's 30fps). whisper also emits plenty
 * of very short but valid tokens (10ms, 30ms), and a 34ms floor silently lengthened 54 words
 * across 118 otherwise-correct scenes, shifting everything after them by up to 170ms. That is a
 * timing change, which is not what this module is for. The consequence is that a word whisper
 * timed under one frame renders but never becomes the highlighted word; recorded as a finding for
 * a later task rather than fixed here. */
const MIN_CAPTION_MS = 1;

interface Span {
  startMs: number;
  endMs: number;
}

interface Anchor {
  wordIndex: number;
  tokenIndex: number;
}

/** Divides one time window across several words, weighted by how long each word is written — a
 * cheap stand-in for how long it takes to say. Guarantees at least 1ms per word so no caption is
 * zero-length (a zero-length token can never be the "active" word on screen). */
function splitSpan(span: Span, words: readonly string[]): Span[] {
  const weights = words.map((word) => Math.max(1, word.length));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const available = Math.max(span.endMs - span.startMs, words.length);

  const spans: Span[] = [];
  let cursor = span.startMs;
  let used = 0;
  for (const [index, weight] of weights.entries()) {
    used += weight;
    const isLast = index === weights.length - 1;
    const rawEnd = isLast
      ? span.startMs + available
      : span.startMs + Math.round((available * used) / total);
    const endMs = Math.max(rawEnd, cursor + 1);
    spans.push({ startMs: cursor, endMs });
    cursor = endMs;
  }
  return spans;
}

/**
 * Gives every anchored word its own token's span, EXTENDED forward only when the aligner actually
 * dropped tokens between this anchor and the next — the case where whisper split one script word
 * into several tokens, whose audio would otherwise be thrown away.
 *
 * The extension is deliberately conditional. Extending unconditionally to the next anchor's token
 * start also swallows the real SILENCE between two words, which measurably changed the timing of
 * 54 words across 118 scenes that the previous exact-count path had timed correctly — a
 * regression, not an improvement, since that silence belongs to neither word.
 */
function spansForAnchors(
  anchors: readonly Anchor[],
  captions: readonly Caption[],
  lastEnd: number,
) {
  const spans = new Map<number, Span>();
  for (const [index, anchor] of anchors.entries()) {
    const token = captions[anchor.tokenIndex];
    const ownEnd = token?.endMs ?? lastEnd;
    const next = anchors[index + 1];

    let endMs: number;
    if (next === undefined) {
      // Last anchored word: own everything to the end, absorbing any trailing dropped token.
      endMs = lastEnd;
    } else if (next.tokenIndex === anchor.tokenIndex + 1) {
      // Nothing was dropped in between, so this word owns exactly what whisper measured for it.
      endMs = ownEnd;
    } else {
      endMs = captions[next.tokenIndex]?.startMs ?? ownEnd;
    }

    spans.set(anchor.wordIndex, { startMs: token?.startMs ?? 0, endMs });
  }
  return spans;
}

function toCaption(word: string, index: number, span: Span, source: Caption | undefined): Caption {
  return {
    // `createTikTokStyleCaptions` splits pages on a token's leading space, so only the very first
    // token of the array may go without one (../../../.claude/rules/video.md's Captions section).
    text: index === 0 ? word : ` ${word}`,
    startMs: span.startMs,
    endMs: span.endMs,
    timestampMs: source?.timestampMs ?? span.endMs,
    confidence: source?.confidence ?? null,
  };
}

/**
 * Whisper transcribes the ACTUAL audio, so its own word text can mishear a word Vbee's voice
 * pronounced ambiguously — but the pipeline already knows the exact `narration` it sent to Vbee.
 * Whisper's timestamps are still the only per-word TIMING signal available, so this returns one
 * caption per SCRIPT word, spelled from the script and timed from whisper.
 *
 * Until task 023 this only happened when whisper produced exactly as many tokens as the narration
 * had words. Measured across 231 real scenes that guard bailed on 110 of them (47.6%), because
 * whisper routinely drifts by a token or two for reasons that have nothing to do with the rest of
 * the sentence: it normalizes numbers ("mười lăm nghìn" becomes one "15.000" token), adds quotes,
 * turns a semicolon into a comma, and splits or merges a misheard proper noun. One token of drift
 * discarded the correct spelling of every other word in the scene.
 *
 * Aligning the two sequences instead (`pairTokensToWords`) keeps the local disagreement local. The
 * two shapes that alignment has to resolve into real timing are:
 * - several script words against ONE token (whisper collapsed them): the token's span is divided
 *   between them by written length, via `splitSpan`.
 * - one script word against SEVERAL tokens (whisper split it): `spansForAnchors` already extends
 *   the word's span to the next anchored word's token, which swallows the extra tokens.
 */
export function alignCaptionsToNarration(captions: Caption[], narration: string): Caption[] {
  const words = narration.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return captions;
  }
  if (captions.length === 0) {
    return [];
  }

  const pairing = pairTokensToWords(
    words.map(normalizeCaptionToken),
    captions.map((caption) => normalizeCaptionToken(caption.text)),
  );

  const firstStart = captions[0]?.startMs ?? 0;
  const lastEnd = captions[captions.length - 1]?.endMs ?? firstStart;

  const anchors: Anchor[] = [];
  for (const [wordIndex, tokenIndex] of pairing.entries()) {
    if (tokenIndex !== null) {
      anchors.push({ wordIndex, tokenIndex });
    }
  }

  const spans = new Array<Span | undefined>(words.length).fill(undefined);
  if (anchors.length === 0) {
    // Nothing matched at all (a scene whose audio bears no resemblance to its script). Spreading
    // the whole caption range over the script still yields a usable, ordered timeline, which is
    // strictly better than leaving whisper's unrelated text on screen.
    for (const [index, span] of splitSpan(
      { startMs: firstStart, endMs: lastEnd },
      words,
    ).entries()) {
      spans[index] = span;
    }
  } else {
    for (const [wordIndex, span] of spansForAnchors(anchors, captions, lastEnd)) {
      spans[wordIndex] = span;
    }
    fillUnanchoredRuns(spans, words, firstStart);
  }

  const resolved = spans.map((span) => span ?? { startMs: firstStart, endMs: lastEnd });
  enforceUsableTimeline(resolved);

  return resolved.map((span, index) =>
    toCaption(words[index] ?? "", index, span, unwrapSource(captions, pairing[index])),
  );
}

/** Last pass before the captions leave this module: keep the timeline strictly ordered and give
 * every caption at least `MIN_CAPTION_MS` on screen. Needed because whisper's OWN tokens are not
 * always usable — a zero-length token copied faithfully through the alignment stays zero-length,
 * which the previous implementation also shipped, just without anything checking for it. */
function enforceUsableTimeline(spans: Span[]): void {
  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const span of spans) {
    span.startMs = Math.max(span.startMs, previousEnd);
    span.endMs = Math.max(span.endMs, span.startMs + MIN_CAPTION_MS);
    previousEnd = span.endMs;
  }
}

function unwrapSource(captions: readonly Caption[], tokenIndex: number | null | undefined) {
  return tokenIndex === null || tokenIndex === undefined ? undefined : captions[tokenIndex];
}

/** Gives every word the aligner could not anchor a real span, by carving it out of the neighbour
 * that DOES have one. A run following an anchored word is carved out of that word's span (which
 * already reaches to the next anchor); a run before the very first anchor takes the time ahead of
 * it, or shares that anchor's span when there is no time ahead of it to take. */
function fillUnanchoredRuns(
  spans: (Span | undefined)[],
  words: readonly string[],
  firstStart: number,
): void {
  let index = 0;
  while (index < spans.length) {
    if (spans[index] !== undefined) {
      index += 1;
      continue;
    }
    let end = index;
    while (end + 1 < spans.length && spans[end + 1] === undefined) {
      end += 1;
    }

    const previousSpan = index > 0 ? spans[index - 1] : undefined;
    if (previousSpan !== undefined) {
      const group = [index - 1, ...rangeOf(index, end)];
      applySplit(spans, words, group, previousSpan);
      index = end + 1;
      continue;
    }

    const nextSpan = end + 1 < spans.length ? spans[end + 1] : undefined;
    if (nextSpan === undefined) {
      index = end + 1;
      continue;
    }
    const group = rangeOf(index, end);
    if (nextSpan.startMs > firstStart) {
      applySplit(spans, words, group, { startMs: firstStart, endMs: nextSpan.startMs });
    } else {
      applySplit(spans, words, [...group, end + 1], nextSpan);
    }
    index = end + 1;
  }
}

function rangeOf(from: number, to: number): number[] {
  const indexes: number[] = [];
  for (let i = from; i <= to; i += 1) {
    indexes.push(i);
  }
  return indexes;
}

function applySplit(
  spans: (Span | undefined)[],
  words: readonly string[],
  groupIndexes: readonly number[],
  window: Span,
): void {
  const groupWords = groupIndexes.map((wordIndex) => words[wordIndex] ?? "");
  for (const [position, span] of splitSpan(window, groupWords).entries()) {
    const wordIndex = groupIndexes[position];
    if (wordIndex !== undefined) {
      spans[wordIndex] = span;
    }
  }
}
