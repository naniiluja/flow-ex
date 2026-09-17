import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SceneAudioPreview } from "./scene-audio-preview";

/**
 * EP/BVA matrix for `SceneAudioPreview`.
 *
 * | audioFile                      | Expected                                                |
 * | --------------------------------- | ------------------------------------------------------------ |
 * | undefined (boundary: not yet generated) | shows a "no audio yet" placeholder, no <audio> element   |
 * | "audio/000.mp3"                          | renders an <audio> pointing at the per-project asset URL |
 */
describe("SceneAudioPreview", () => {
  it("shows a placeholder when the scene has no audio yet", () => {
    render(<SceneAudioPreview projectId="p1" audioFile={undefined} />);
    expect(screen.getByText(/Chưa có audio/)).toBeInTheDocument();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });

  it("renders an audio element pointing at the project's asset URL", () => {
    render(<SceneAudioPreview projectId="p1" audioFile="audio/000.mp3" />);
    const audio = document.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toBe("/api/projects/p1/assets/audio/000.mp3");
    expect(audio).toHaveAttribute("controls");
  });
});
