import { Composition } from "remotion";
import React from "react";

import {
  calculateMainCompositionMetadata,
  MainComposition,
  type MainCompositionProps,
} from "./compositions/main-composition.tsx";
import { MAIN_COMPOSITION_ID } from "./composition-id.ts";

const DEFAULT_PROPS: MainCompositionProps = {
  scenes: [],
  aspectRatio: "16:9",
  preset: "youtube",
};

/** Registered with `bundle()`/`selectComposition()` (be/src/render/render-video.ts), the single
 * entry every render goes through (video.md). */
export function RemotionRoot(): React.ReactElement {
  return (
    <Composition
      id={MAIN_COMPOSITION_ID}
      component={MainComposition}
      calculateMetadata={calculateMainCompositionMetadata}
      defaultProps={DEFAULT_PROPS}
    />
  );
}
