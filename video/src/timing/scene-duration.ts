/**
 * Scene duration in frames = ceil(audioSec * fps) + the transition frame count that follows
 * this scene. `Math.ceil` is required: `TransitionSeries`'s total duration is the sum of
 * sequence durations minus the sum of transition durations, so a fractional frame count here
 * compounds drift across scenes (video.md).
 */
export function sceneDurationInFrames(
  audioSec: number,
  fps: number,
  transitionFrames: number,
): number {
  return Math.ceil(audioSec * fps) + transitionFrames;
}

/**
 * `TransitionSeries` total duration = sum(sequence durations) - sum(transition durations)
 * (each transition overlaps the tail of one sequence with the head of the next).
 */
export function totalTimelineDurationInFrames(
  sceneDurationsInFrames: readonly number[],
  transitionFramesBetweenScenes: readonly number[],
): number {
  const sequenceTotal = sceneDurationsInFrames.reduce((sum, d) => sum + d, 0);
  const transitionTotal = transitionFramesBetweenScenes.reduce((sum, t) => sum + t, 0);
  return sequenceTotal - transitionTotal;
}

/** One audio-bearing scene, as far as this pure timing module needs to know about it. */
export interface TimedScene {
  durationMs: number;
  pauseAfterMs?: number;
}

/**
 * Per-`TransitionSeries.Sequence` frame count for every scene, in order: every scene except the
 * LAST gets `transitionFrames` tacked on (consumed by the crossfade into the next scene); the
 * last scene gets none, since there is nothing after it to transition into. This is the single
 * source of truth for that per-scene array — both `computeVideoMetadata` (which subtracts the
 * transitions back out via `totalTimelineDurationInFrames`) and the actual `MainComposition` JSX
 * (which assigns these as each `Sequence`'s `durationInFrames`) call this instead of each
 * re-deriving it, so the two can never drift apart (a real bug this project hit once already).
 */
export function sceneFramesForTimeline(
  scenes: readonly TimedScene[],
  fps: number,
  transitionFrames: number,
): number[] {
  return scenes.map((scene, index) =>
    sceneDurationInFrames(
      (scene.durationMs + (index < scenes.length - 1 ? (scene.pauseAfterMs ?? 0) : 0)) / 1000,
      fps,
      index < scenes.length - 1 ? transitionFrames : 0,
    ),
  );
}
