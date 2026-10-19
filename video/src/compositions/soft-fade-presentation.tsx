import type { TransitionPresentation } from "@remotion/transitions";
import React from "react";

import { transitionBlurFilter } from "./transition-blur.ts";

/** How far the outgoing scene pulls BACK over the transition. Deliberately the opposite sign from
 * `crossZoomPresentation`'s push-IN, so alternating the two reads as two different transitions
 * rather than the same one twice. Small (4%) for the same reason `KEN_BURNS_ZOOM_FACTOR` is 1.06:
 * a bigger move reads as cheap (../../timing/safe-viewport.ts). */
const PULL_BACK = 0.04;

/**
 * The second presentation the composition alternates with (`transition-plan.ts`): the outgoing
 * scene fades out while easing slightly BACK, the incoming scene fades in while settling forward
 * from slightly behind.
 *
 * Hand-written CSS transforms, exactly like `cross-zoom-presentation.tsx`, and for the same
 * recorded reason: `@remotion/transitions`' own built-in presentations that draw through a WebGL2
 * canvas (`makeHtmlInCanvasPresentation`) produced fully BLACK frames in this project's headless
 * Chrome renderer, which has no hardware GPU context (../../../.claude/rules/video.md).
 */
export const softFadePresentation = (): TransitionPresentation<Record<string, never>> => {
  return {
    component: ({ children, presentationProgress, presentationDirection }) => {
      // Remotion keeps the ENTERING side wrapped at `presentationProgress === 1` for the whole
      // rest of that scene, not just during the transition window. Both values below must
      // therefore land on exactly their resting state at progress=1 — opacity 1 and scale 1 — or
      // the entire scene after the transition stays faded or shifted. An inverted sign here is a
      // bug this project has already shipped once (see cross-zoom-presentation.tsx).
      const opacity =
        presentationDirection === "exiting" ? 1 - presentationProgress : presentationProgress;
      const scale =
        presentationDirection === "exiting"
          ? 1 - presentationProgress * PULL_BACK
          : 1 - PULL_BACK + presentationProgress * PULL_BACK;

      return (
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            opacity,
            filter: transitionBlurFilter(presentationProgress),
            transform: `perspective(100px) scale(${String(scale)})`,
            willChange: "transform, opacity, filter",
          }}
        >
          {children}
        </div>
      );
    },
    props: {},
  };
};
