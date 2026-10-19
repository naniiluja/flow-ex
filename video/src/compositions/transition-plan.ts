export type PresentationKind = "cross-zoom" | "soft-fade";

/**
 * Which presentation the join AFTER scene `joinIndex` uses. The single source of truth, so the
 * composition's JSX and any test asking "what does join N look like" read the same answer.
 *
 * Before task 024 every join used the identical cross-zoom, which across a 6-10 scene video reads
 * as mechanical. Alternating two hand-written CSS presentations breaks that up without turning the
 * video into a transition showreel.
 *
 * Both kinds deliberately share ONE duration (`TRANSITION_FRAMES` in `main-composition.tsx`,
 * measured from `springTiming`). Giving them different durations would force
 * `sceneFramesForTimeline` to take a per-join array and `render-video.test.ts` to derive its
 * pixel-sample window per join — real risk against the "calculateMetadata and the JSX must derive
 * frames from the same source" invariant (../../../.claude/rules/video.md), for no visible gain.
 */
export function presentationKindForJoin(joinIndex: number): PresentationKind {
  return joinIndex % 2 === 0 ? "cross-zoom" : "soft-fade";
}
