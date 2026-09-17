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
};

/** Registered with `bundle()`/`selectComposition()` (be/src/render/render-video.ts) and mounted
 * directly by the Player (fe/src/pages/project-preview-page.tsx) so preview and render share the
 * exact same composition tree (video.md). */
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
