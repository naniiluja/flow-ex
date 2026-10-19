import { describe, expect, it } from "vitest";

import { pageMotion, wordMotion } from "./caption-motion.ts";

const FPS = 30;
const PAGE = { startMs: 1000, durationMs: 1000 };

/**
 * Contract matrix for `pageMotion` (whole caption page in/out):
 *
 * | currentMs            | Expected                                              |
 * | -------------------- | ----------------------------------------------------- |
 * | page start           | invisible, shifted down                               |
 * | after enter window   | EXACTLY opaque, translateY exactly 0 (resting state)  |
 * | mid page             | EXACTLY opaque                                        |
 * | page end             | invisible again (fade-out finished)                   |
 */
describe("pageMotion", () => {
  it("starts invisible and offset downward", () => {
    const m = pageMotion(1000, PAGE, FPS);
    expect(m.opacity).toBe(0);
    expect(m.translateY).toBeGreaterThan(0);
  });

  it("settles to exactly opaque and unshifted after the enter window", () => {
    const m = pageMotion(1300, PAGE, FPS);
    expect(m.opacity).toBe(1);
    expect(m.translateY).toBe(0);
  });

  it("is fully opaque mid-page", () => {
    expect(pageMotion(1500, PAGE, FPS).opacity).toBe(1);
  });

  it("fades out toward the page end", () => {
    const near = pageMotion(1990, PAGE, FPS).opacity;
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(1);
  });

  it("never leaves [0, 1] for opacity", () => {
    for (let ms = 1000; ms < 2000; ms += 10) {
      const { opacity } = pageMotion(ms, PAGE, FPS);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    }
  });

  it("fades in monotonically during the enter window", () => {
    let previous = -1;
    for (let ms = 1000; ms <= 1170; ms += 10) {
      const { opacity } = pageMotion(ms, PAGE, FPS);
      expect(opacity).toBeGreaterThanOrEqual(previous);
      previous = opacity;
    }
  });
});

/**
 * Contract matrix for `wordMotion` (the highlighted word's pop):
 *
 * | word state          | Expected                                   |
 * | ------------------- | ------------------------------------------ |
 * | not yet spoken      | scale exactly 1, white                     |
 * | already spoken      | scale exactly 1, white                     |
 * | just became active  | scale 1 (pop starts from rest), green mix  |
 * | active, settled     | scale above 1, fully highlight colour      |
 */
describe("wordMotion", () => {
  const WORD = { fromMs: 1200, toMs: 1700 };

  it("leaves a not-yet-spoken word at rest", () => {
    expect(wordMotion(1000, WORD, FPS)).toEqual({ scale: 1, highlight: 0 });
  });

  it("returns a spoken word to rest", () => {
    expect(wordMotion(1700, WORD, FPS)).toEqual({ scale: 1, highlight: 0 });
  });

  it("starts the pop from scale 1 at the word's first instant", () => {
    const m = wordMotion(1200, WORD, FPS);
    expect(m.scale).toBe(1);
    expect(m.highlight).toBe(0);
  });

  it("pops above 1 and reaches full highlight while the word is active", () => {
    const m = wordMotion(1500, WORD, FPS);
    expect(m.scale).toBeGreaterThan(1);
    expect(m.highlight).toBe(1);
  });

  it("keeps the pop bounded so a long word never swells out of the safe width", () => {
    for (let ms = 1200; ms < 1700; ms += 10) {
      expect(wordMotion(ms, WORD, FPS).scale).toBeLessThanOrEqual(1.25);
    }
  });
});
