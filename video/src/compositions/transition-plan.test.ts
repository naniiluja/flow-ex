import { describe, expect, it } from "vitest";

import { presentationKindForJoin } from "./transition-plan.ts";

/**
 * Contract matrix for `presentationKindForJoin(joinIndex)` — which presentation each join between
 * two scenes uses. Every join keeps the SAME duration, so `TRANSITION_FRAMES` stays one measured
 * constant and neither `computeVideoMetadata` nor `render-video.test.ts`'s pixel-sample window has
 * to become per-join arithmetic.
 *
 * | joinIndex | Expected    |
 * | --------- | ----------- |
 * | 0         | "cross-zoom" |
 * | 1         | "soft-fade"  |
 * | 2         | "cross-zoom" |
 * | 7         | "soft-fade"  |
 */
describe("presentationKindForJoin", () => {
  it.each([
    [0, "cross-zoom"],
    [1, "soft-fade"],
    [2, "cross-zoom"],
    [3, "soft-fade"],
    [7, "soft-fade"],
    [8, "cross-zoom"],
  ])("join %i uses %s", (joinIndex, expected) => {
    expect(presentationKindForJoin(joinIndex)).toBe(expected);
  });

  it("alternates rather than repeating, so no two neighbouring joins look identical", () => {
    const kinds = [0, 1, 2, 3, 4].map(presentationKindForJoin);

    for (const [index, kind] of kinds.entries()) {
      if (index > 0) {
        expect(kind).not.toBe(kinds[index - 1]);
      }
    }
  });
});
