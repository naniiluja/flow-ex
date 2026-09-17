import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { springTiming, TransitionSeries } from "@remotion/transitions";
import type { CalculateMetadataFunction } from "remotion";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

import { TikTokCaptions } from "../captions/tiktok-captions.tsx";
import { sceneFramesForTimeline, totalTimelineDurationInFrames } from "../timing/scene-duration.ts";
import {
  ASSUMED_LOGO_BOX,
  computeSafeViewport,
  kenBurnsViewport,
} from "../timing/safe-viewport.ts";
import { crossZoomPresentation } from "./cross-zoom-presentation.tsx";

/** One scene's render-ready data: an image + audio URL, the source image's real pixel size (for
 * an aspect-correct Ken Burns crop), and the audio's measured duration. `durationMs` is measured
 * once by the backend right after TTS and stored in `project.json`; the composition never
 * re-measures audio itself (video.md). `captions` (task 007) is optional so a scene that has not
 * been transcribed yet (or a task-002 sample fixture) still renders without any subtitle overlay. */
export interface RenderableScene {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  audioUrl: string;
  durationMs: number;
  captions?: Caption[];
}

export interface MainCompositionProps extends Record<string, unknown> {
  scenes: RenderableScene[];
  aspectRatio: "16:9" | "9:16";
}

const FPS = 30;

const TRANSITION_TIMING_CONFIG = { damping: 200 };

function createTransitionTiming() {
  return springTiming({ config: TRANSITION_TIMING_CONFIG });
}

/** Measured once from Remotion's own spring physics — NOT a guessed constant — because a spring
 * timing's actual settle duration depends on its config and does not equal any round number a
 * human might pick. Using an unmeasured guess here previously desynced the composition's declared
 * duration from what `TransitionSeries` actually renders, leaving several trailing frames blank. */
const TRANSITION_FRAMES = createTransitionTiming().getDurationInFrames({ fps: FPS });

const DIMENSIONS: Record<MainCompositionProps["aspectRatio"], { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

export interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}

/** Pure timing math shared by the SSR renderer's `calculateMetadata` and the FE Player, which
 * has no `calculateMetadata` prop and must compute duration/dimensions up front (task 002). This
 * calls the EXACT SAME `sceneFramesForTimeline` helper that `MainComposition` uses to assign each
 * `Sequence`'s `durationInFrames`, so the two can never compute a different total. */
export function computeVideoMetadata(props: MainCompositionProps): VideoMetadata {
  const { width, height } = DIMENSIONS[props.aspectRatio];
  const sceneFrames = sceneFramesForTimeline(props.scenes, FPS, TRANSITION_FRAMES);
  const transitionFramesBetweenScenes = new Array(Math.max(0, props.scenes.length - 1)).fill(
    TRANSITION_FRAMES,
  ) as number[];
  const totalDuration = totalTimelineDurationInFrames(sceneFrames, transitionFramesBetweenScenes);

  return {
    width,
    height,
    fps: FPS,
    durationInFrames: Math.max(1, totalDuration),
  };
}

export const calculateMainCompositionMetadata: CalculateMetadataFunction<MainCompositionProps> = ({
  props,
}) => computeVideoMetadata(props);

function KenBurnsImage({
  imageUrl,
  imageWidth,
  imageHeight,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}): React.ReactElement {
  const frame = useCurrentFrame();
  const { durationInFrames, width: frameWidth, height: frameHeight } = useVideoConfig();
  const progress = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);

  const safe = computeSafeViewport(
    { width: imageWidth, height: imageHeight },
    { width: frameWidth, height: frameHeight },
    ASSUMED_LOGO_BOX,
  );
  const viewport = kenBurnsViewport(safe, progress);

  // Scale the image so its visible `viewport` window (a fraction of the image on EACH axis)
  // exactly fills the frame on that axis, then shift it so the window's top-left corner lands at
  // the frame's top-left. Width and height use their OWN axis's fraction — using a single shared
  // scale for both (as an earlier version of this file did) silently distorts/misplaces the crop
  // whenever the image aspect ratio doesn't match the frame's.
  const widthPercent = 100 / viewport.width;
  const heightPercent = 100 / viewport.height;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Img
        src={imageUrl}
        style={{
          position: "absolute",
          width: `${String(widthPercent)}%`,
          height: `${String(heightPercent)}%`,
          left: `${String(-viewport.x * widthPercent)}%`,
          top: `${String(-viewport.y * heightPercent)}%`,
          transform: "perspective(100px)",
          willChange: "transform",
        }}
      />
    </AbsoluteFill>
  );
}

export function MainComposition({ scenes }: MainCompositionProps): React.ReactElement {
  const sceneFrames = sceneFramesForTimeline(scenes, FPS, TRANSITION_FRAMES);
  // sceneFrames has exactly one entry per scene (it's a .map over this same `scenes` array), so
  // zipping them together here can never actually hit the undefined branch — it exists only to
  // satisfy noUncheckedIndexedAccess without a non-null assertion.
  const scenesWithFrames = scenes.map((scene, index) => {
    const durationInFrames = sceneFrames[index];
    if (durationInFrames === undefined) {
      throw new Error(`missing computed frame count for scene ${String(index)}`);
    }
    return { scene, durationInFrames };
  });

  return (
    <TransitionSeries>
      {scenesWithFrames.map(({ scene, durationInFrames }, index) => (
        <React.Fragment key={scene.imageUrl}>
          <TransitionSeries.Sequence durationInFrames={durationInFrames}>
            <KenBurnsImage
              imageUrl={scene.imageUrl}
              imageWidth={scene.imageWidth}
              imageHeight={scene.imageHeight}
            />
            <Audio src={scene.audioUrl} />
            {scene.captions !== undefined && scene.captions.length > 0 && (
              <TikTokCaptions captions={scene.captions} />
            )}
          </TransitionSeries.Sequence>
          {index < scenes.length - 1 && (
            <TransitionSeries.Transition
              timing={createTransitionTiming()}
              presentation={crossZoomPresentation()}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
}
