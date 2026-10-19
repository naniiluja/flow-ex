import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import type { CalculateMetadataFunction } from "remotion";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

import {
  PRESETS,
  resolveAspectRatio,
  type AspectRatio,
  type Preset,
} from "@flow-ex/shared-schemas";

import { TikTokCaptions } from "../captions/tiktok-captions.tsx";
import { sceneFramesForTimeline, totalTimelineDurationInFrames } from "../timing/scene-duration.ts";
import {
  ASSUMED_LOGO_BOX,
  computeSafeViewport,
  kenBurnsViewport,
  type KenBurnsDirection,
  viewportLayout,
} from "../timing/safe-viewport.ts";
import { crossZoomPresentation } from "./cross-zoom-presentation.tsx";
import { softFadePresentation } from "./soft-fade-presentation.tsx";
import { presentationKindForJoin } from "./transition-plan.ts";
import { createTransitionTiming, TRANSITION_FRAMES } from "./transition-timing.ts";

/** One scene's render-ready data: an image + audio URL, the source image's real pixel size (for
 * an aspect-correct Ken Burns crop), and the audio's measured duration. `durationMs` is measured
 * once by the backend right after TTS and stored in `project.json`; the composition never
 * re-measures audio itself (video.md). `captions` (task 007) is optional so a scene that has not
 * been transcribed yet (or a task-002 sample fixture) still renders without any subtitle overlay. */
export interface RenderableScene {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageSource?: "flow" | "codex";
  audioUrl: string;
  durationMs: number;
  pauseAfterMs?: number;
  captions?: Caption[];
}

export interface MainCompositionProps extends Record<string, unknown> {
  scenes: RenderableScene[];
  /** Optional (task 009): when given, WINS over the preset's own default frame dimensions
   * (../../.claude/rules/video.md's recorded "aspectRatio vs preset" decision); when omitted, the
   * frame size is the preset's own `PRESETS[preset]` dimensions. */
  aspectRatio?: "16:9" | "9:16";
  /** Drives caption style (`PRESETS[preset].captionStyle`, `@flow-ex/shared-schemas`) and,
   * absent an explicit `aspectRatio`, the frame dimensions too. */
  preset: Preset;
}

const FPS = 30;

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
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
  const { width, height } = DIMENSIONS[resolveAspectRatio(props)];
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

/** Alternating the Ken Burns direction per scene is what stops a run of stills reading as one
 * mechanical push-in repeated N times. Kept here next to the composition rather than inside
 * `safe-viewport.ts`, which has no notion of a scene's position in the timeline. */
function kenBurnsDirectionForScene(sceneIndex: number): KenBurnsDirection {
  return sceneIndex % 2 === 0 ? "in" : "out";
}

function KenBurnsImage({
  imageUrl,
  imageWidth,
  imageHeight,
  imageSource,
  sceneIndex,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  imageSource?: "flow" | "codex";
  sceneIndex: number;
}): React.ReactElement {
  const frame = useCurrentFrame();
  const { durationInFrames, width: frameWidth, height: frameHeight } = useVideoConfig();
  const progress = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);

  const safe = computeSafeViewport(
    { width: imageWidth, height: imageHeight },
    { width: frameWidth, height: frameHeight },
    imageSource === "codex" ? null : ASSUMED_LOGO_BOX,
  );
  const viewport = kenBurnsViewport(safe, progress, kenBurnsDirectionForScene(sceneIndex));

  // Scale the image so its visible window exactly fills the frame, per axis.
  const layout = viewportLayout(viewport);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <Img
        src={imageUrl}
        style={{
          position: "absolute",
          width: `${String(layout.widthPercent)}%`,
          height: `${String(layout.heightPercent)}%`,
          left: `${String(layout.leftPercent)}%`,
          top: `${String(layout.topPercent)}%`,
          transform: "perspective(100px)",
          willChange: "transform",
        }}
      />
    </AbsoluteFill>
  );
}

export function MainComposition({ scenes, preset }: MainCompositionProps): React.ReactElement {
  const captionStyle = PRESETS[preset].captionStyle;
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
              imageSource={scene.imageSource}
              sceneIndex={index}
            />
            <Audio src={scene.audioUrl} />
            {scene.captions !== undefined && scene.captions.length > 0 && (
              <TikTokCaptions captions={scene.captions} captionStyle={captionStyle} />
            )}
          </TransitionSeries.Sequence>
          {index < scenes.length - 1 && (
            <TransitionSeries.Transition
              timing={createTransitionTiming()}
              presentation={
                presentationKindForJoin(index) === "cross-zoom"
                  ? crossZoomPresentation()
                  : softFadePresentation()
              }
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  );
}
