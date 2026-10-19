import { Easing, interpolate, spring } from "remotion";

/** How long a caption page takes to fade/slide in, and to fade out before the next one. */
const PAGE_ENTER_FRAMES = 5;
const PAGE_EXIT_FRAMES = 3;
/** Distance (px) a page rises while fading in. */
const PAGE_ENTER_RISE_PX = 14;
/** How many frames the highlight colour takes to blend in once a word becomes active. */
const HIGHLIGHT_BLEND_FRAMES = 3;
/** Peak extra scale of the active word, before the spring's own overshoot. */
const WORD_POP_SCALE = 0.12;
const WORD_POP_SPRING = { damping: 10, mass: 0.5, stiffness: 200 };

export interface PageMotion {
  opacity: number;
  translateY: number;
}

export interface WordMotion {
  scale: number;
  /** 0 = base colour, 1 = full highlight colour. */
  highlight: number;
}

const msToFrames = (ms: number, fps: number): number => (ms / 1000) * fps;

/** Fade/rise-in at the start of a caption page and fade-out at its end, as a pure function of the
 * playback time so the Player preview and the SSR render agree. Both ends land on exactly their
 * resting state (opacity 1, translateY 0) inside the page, never 0.99. */
export function pageMotion(
  currentMs: number,
  page: { startMs: number; durationMs: number },
  fps: number,
): PageMotion {
  const sinceStart = msToFrames(currentMs - page.startMs, fps);
  const untilEnd = msToFrames(page.startMs + page.durationMs - currentMs, fps);

  const enter = interpolate(sinceStart, [0, PAGE_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => Easing.out((x) => Easing.cubic(x))(t),
  });
  const exit = interpolate(untilEnd, [0, PAGE_EXIT_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return { opacity: Math.min(enter, exit), translateY: (1 - enter) * PAGE_ENTER_RISE_PX };
}

/** Spring pop plus colour blend for one word. Only the ACTIVE word moves; every other word is at
 * rest, so words never overlap their neighbours except the single one being spoken. */
export function wordMotion(
  currentMs: number,
  word: { fromMs: number; toMs: number },
  fps: number,
): WordMotion {
  if (currentMs < word.fromMs || currentMs >= word.toMs) {
    return { scale: 1, highlight: 0 };
  }
  const sinceStart = msToFrames(currentMs - word.fromMs, fps);
  const pop = spring({ frame: sinceStart, fps, config: WORD_POP_SPRING });
  const highlight = interpolate(sinceStart, [0, HIGHLIGHT_BLEND_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { scale: 1 + WORD_POP_SCALE * pop, highlight };
}
