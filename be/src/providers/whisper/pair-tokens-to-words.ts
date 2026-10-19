/** Leaving a script word or a whisper token unpaired. */
const GAP_COST = 1;
/** Pairing two keys where one is a prefix of the other — whisper split or truncated the word.
 * Cheaper than a substitution so the aligner prefers keeping such a pair together. */
const PREFIX_COST = 0.5;
const SUBSTITUTION_COST = 1;
const EXACT_COST = 0;

function pairCost(wordKey: string, tokenKey: string): number {
  if (wordKey === tokenKey) {
    return EXACT_COST;
  }
  if (
    wordKey.length > 0 &&
    tokenKey.length > 0 &&
    (wordKey.startsWith(tokenKey) || tokenKey.startsWith(wordKey))
  ) {
    return PREFIX_COST;
  }
  return SUBSTITUTION_COST;
}

/**
 * Global Needleman-Wunsch alignment of two already-normalized key sequences, returning for each
 * entry of `wordKeys` the index of the `tokenKeys` entry it was paired with, or `null` when the
 * aligner decided none corresponds to it.
 *
 * GLOBAL (rather than local) alignment is what keeps a local disagreement local: three script
 * words collapsed into one "15.000" token costs a few edits, and the rest of the sentence still
 * lines up afterwards. No maintained JS/TS package does transcript-to-ASR alignment — WhisperX and
 * ctc-forced-aligner are Python, built on wav2vec2/CTC acoustic models — so this is hand-written
 * rather than pulled in as a dependency plus a Python runtime.
 *
 * The cost table is stored FLAT rather than as nested arrays so a row lookup cannot be `undefined`
 * under `noUncheckedIndexedAccess` without an assertion on every access.
 */
export function pairTokensToWords(
  wordKeys: readonly string[],
  tokenKeys: readonly string[],
): (number | null)[] {
  const wordCount = wordKeys.length;
  const tokenCount = tokenKeys.length;
  const width = tokenCount + 1;
  const cost = new Float64Array(width * (wordCount + 1));
  const at = (i: number, j: number): number => cost[i * width + j] ?? Number.POSITIVE_INFINITY;
  const costOf = (i: number, j: number): number =>
    pairCost(wordKeys[i - 1] ?? "", tokenKeys[j - 1] ?? "");

  for (let i = 1; i <= wordCount; i += 1) {
    cost[i * width] = i * GAP_COST;
  }
  for (let j = 1; j <= tokenCount; j += 1) {
    cost[j] = j * GAP_COST;
  }
  for (let i = 1; i <= wordCount; i += 1) {
    for (let j = 1; j <= tokenCount; j += 1) {
      cost[i * width + j] = Math.min(
        at(i - 1, j - 1) + costOf(i, j),
        at(i - 1, j) + GAP_COST,
        at(i, j - 1) + GAP_COST,
      );
    }
  }

  const pairing = new Array<number | null>(wordCount).fill(null);
  let i = wordCount;
  let j = tokenCount;
  while (i > 0 && j > 0) {
    if (at(i, j) === at(i - 1, j - 1) + costOf(i, j)) {
      pairing[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else if (at(i, j) === at(i - 1, j) + GAP_COST) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return pairing;
}
