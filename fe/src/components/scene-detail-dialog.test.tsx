import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProjectScene } from "@flow-ex/shared-schemas";

import { SceneDetailDialog } from "./scene-detail-dialog";

function makeScene(overrides: Partial<ProjectScene> = {}): ProjectScene {
  return {
    narration: "Xin chao",
    imagePrompt: "beach",
    referenceIds: [],
    status: "awaiting_review",
    attempts: 1,
    imageFile: "images/000.png",
    imageVariants: [{ file: "images/000.png", width: 1376, height: 768 }],
    ...overrides,
  };
}

describe("SceneDetailDialog", () => {
  it("does not render the dialog content when closed", () => {
    render(
      <SceneDetailDialog
        projectId="p1"
        sceneIndex={0}
        scene={makeScene()}
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Cảnh 1")).not.toBeInTheDocument();
  });

  it("clicking Duyệt in the review picker calls onApprove with the right sceneIndex/variantIndex", () => {
    const onApprove = vi.fn();
    render(
      <SceneDetailDialog
        projectId="p1"
        sceneIndex={2}
        scene={makeScene()}
        open={true}
        onOpenChange={vi.fn()}
        review={{ isPending: false, onApprove, onRegenerate: vi.fn() }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Duyệt" }));

    expect(onApprove).toHaveBeenCalledWith(0);
  });

  it("shows the audio preview instead of the variant picker when no review prop is given", () => {
    render(
      <SceneDetailDialog
        projectId="p1"
        sceneIndex={0}
        scene={makeScene({ audioFile: undefined })}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Chưa có audio.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duyệt" })).not.toBeInTheDocument();
  });
});
