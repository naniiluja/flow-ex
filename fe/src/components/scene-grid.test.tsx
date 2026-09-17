import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProjectScene } from "@flow-ex/shared-schemas";

import { SceneGrid } from "./scene-grid";

function makeScene(overrides: Partial<ProjectScene> = {}): ProjectScene {
  return {
    narration: "Xin chao",
    imagePrompt: "beach",
    referenceIds: [],
    status: "pending",
    attempts: 0,
    imageVariants: [],
    ...overrides,
  };
}

describe("SceneGrid", () => {
  it("renders exactly N scene-card elements for N scenes", () => {
    const scenes = [makeScene(), makeScene(), makeScene()];

    render(<SceneGrid projectId="p1" scenes={scenes} onSelectScene={vi.fn()} />);

    expect(screen.getAllByTestId("scene-card")).toHaveLength(3);
  });

  it("renders zero cards for an empty scene list (boundary)", () => {
    render(<SceneGrid projectId="p1" scenes={[]} onSelectScene={vi.fn()} />);

    expect(screen.queryAllByTestId("scene-card")).toHaveLength(0);
  });
});
