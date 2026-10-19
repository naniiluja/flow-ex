/** Combining diacritical marks (U+0300-U+036F), which NFD splits Vietnamese tone marks and vowel
 * modifiers into. Folding them away lets a mis-toned whisper hearing ("trìm") still align against
 * the script's real word ("chìm") instead of scoring as a completely different token. */
const COMBINING_MARKS = /[̀-ͯ]/g;

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

/**
 * The COMPARISON KEY used to decide whether a script word and a whisper token are the same word
 * during alignment (`align-captions-to-narration.ts`). It is never displayed anywhere: the
 * script's own spelling is what reaches the screen, this only drives the match.
 *
 * `đ` needs its own replacement because Unicode NFD does NOT decompose it — it is a distinct
 * letter, not `d` plus a mark — so without this line `NON_ALPHANUMERIC` would delete it outright
 * and turn "đi" into "i".
 */
export function normalizeCaptionToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(NON_ALPHANUMERIC, "");
}
