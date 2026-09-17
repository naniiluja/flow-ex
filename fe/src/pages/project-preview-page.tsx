import { Player } from "@remotion/player";
import {
  computeVideoMetadata,
  MainComposition,
  SAMPLE_SCENE_FIXTURES,
  type MainCompositionProps,
} from "@flow-ex/video";

/** Builds the same props the backend's render integration test renders `output.mp4` from —
 * exported so a test can assert this page and that render agree on the exact scene list. */
export function buildSamplePreviewProps(): MainCompositionProps {
  return {
    aspectRatio: "16:9",
    preset: "youtube",
    scenes: SAMPLE_SCENE_FIXTURES.map((fixture) => ({
      imageUrl: `/api/samples/${fixture.filename}.png`,
      imageWidth: fixture.imageWidth,
      imageHeight: fixture.imageHeight,
      audioUrl: `/api/samples/${fixture.filename}.wav`,
      durationMs: fixture.durationMs,
    })),
  };
}

/** Task 002 demo: renders the same 3 sample scenes the backend's render integration test
 * produces `output.mp4` from, mounting the composition's root component directly (never wrapped
 * in `<Composition>`, per video.md) so this preview and the SSR render see identical props. Once
 * task 003 wires the real pipeline, this becomes the review-step preview keyed by `:id`. */
export function ProjectPreviewPage() {
  const props = buildSamplePreviewProps();
  const metadata = computeVideoMetadata(props);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Xem trước video mẫu</h1>
      <Player
        component={MainComposition}
        inputProps={props}
        durationInFrames={metadata.durationInFrames}
        compositionWidth={metadata.width}
        compositionHeight={metadata.height}
        fps={metadata.fps}
        controls
        style={{ width: "100%" }}
      />
    </div>
  );
}
