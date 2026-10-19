import type { TransitionPresentation } from "@remotion/transitions";
import React from "react";

import { transitionBlurFilter } from "./transition-blur.ts";

/**
 * A hand-written cross-zoom transition: the outgoing scene zooms in slightly and fades out while
 * the incoming scene zooms in from slightly larger and fades in. Driven by `springTiming` at the
 * call site (main-composition.tsx) for a modern feel, not linear easing.
 *
 * `@remotion/transitions`'s own built-in `crossZoom` was tried first, but it draws through a
 * WebGL2 canvas (`makeHtmlInCanvasPresentation`) and produced fully black frames in this
 * project's headless-Chrome renderer (no hardware GPU context) — corrupting the whole frame, not
 * just the transition. This CSS-transform version needs no canvas/WebGL at all.
 */
export const crossZoomPresentation = (): TransitionPresentation<Record<string, never>> => {
  return {
    component: ({ children, presentationProgress, presentationDirection }) => {
      // presentationProgress runs 0 -> 1 over the transition for BOTH sides, and for the
      // entering side keeps reading 1 for the rest of that scene's own duration after the
      // transition ends (Remotion keeps it wrapped, not just during the crossfade window) — so
      // opacity MUST reach exactly 1 at progress=1, or the whole rest of the incoming scene
      // stays invisible. (An earlier version computed `1 - progress` for the entering side,
      // fading it to fully transparent instead of fully opaque — the whole scene after the
      // transition rendered solid black because of that one inverted sign.)
      const opacity =
        presentationDirection === "exiting" ? 1 - presentationProgress : presentationProgress;
      const scale =
        presentationDirection === "exiting"
          ? 1 + presentationProgress * 0.15
          : 1.15 - presentationProgress * 0.15;

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
