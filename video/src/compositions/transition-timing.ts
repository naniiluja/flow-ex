import { linearTiming } from "@remotion/transitions";
import { Easing } from "remotion";

const FPS = 30;

/** 18 frames (0.6s) with a symmetric ease-in-out. `springTiming({damping: 200})` front-loaded ~88%
 * of the motion into the first 11 frames, so the transition read as a ~250ms cut (video.md); a
 * linear timing with an `inOut` curve spreads the motion across the whole window instead. */
const TRANSITION_DURATION_FRAMES = 18;

/** The ONE definition of the join timing. A plain `.ts` (no JSX) so `be/`'s render test can
 * deep-import it under Node's type-stripping, and derive its pixel-sample window from the exact
 * object the composition renders with instead of re-typing a copy that can drift. */
export function createTransitionTiming() {
  return linearTiming({
    durationInFrames: TRANSITION_DURATION_FRAMES,
    easing: (t) => Easing.inOut((x) => Easing.cubic(x))(t),
  });
}

/** Read back from the timing object itself (not re-typed) so `calculateMetadata` and the JSX keep
 * deriving the transition length from one source. */
export const TRANSITION_FRAMES = createTransitionTiming().getDurationInFrames({ fps: FPS });
