/**
 * The 3 sample scenes used by task 002 to prove the Player preview and the SSR render see the
 * exact same composition. `durationMs` is the TRUE duration of the matching fixture audio file
 * under `be/src/render/fixtures/` (measured when the fixture was generated) — this is a stand-in
 * for the per-scene `durationMs` that task 004's real `VbeeTtsProvider` will measure and store in
 * `project.json` (video.md). `be/` builds the full asset URL by prefixing the `filename` with its
 * `/api/samples/` base, so this list is the single source of truth for which 3 fixtures exist and
 * how long each one plays.
 */
export interface SampleSceneFixture {
  filename: string;
  durationMs: number;
  imageWidth: number;
  imageHeight: number;
}

export const SAMPLE_SCENE_FIXTURES: SampleSceneFixture[] = [
  { filename: "sample-1", durationMs: 2000, imageWidth: 1920, imageHeight: 1080 },
  { filename: "sample-2", durationMs: 3000, imageWidth: 1920, imageHeight: 1080 },
  { filename: "sample-3", durationMs: 2500, imageWidth: 1920, imageHeight: 1080 },
];
