import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProjectScene, SceneStatus } from "@flow-ex/shared-schemas";

import { SceneCard } from "./scene-card";

function makeScene(overrides: Partial<ProjectScene> = {}): ProjectScene {
  return {
    narration: "Xin chao, day la loi thoai cua canh nay",
    imagePrompt: "beach",
    status: "pending",
    attempts: 0,
    imageVariants: [],
    ...overrides,
  };
}

/**
 * EP matrix over `ProjectScene["status"]` -> expected badge label (per
 * `../.claude/rules/testing.md`'s contract-level matrix requirement).
 */
// Labels now come from the shared `StatusBadge` (task 010), merged in to replace this
// component's own TEMPORARY status map (task 011).
const STATUS_LABELS: [SceneStatus, string][] = [
  ["pending", "Chờ xử lý"],
  ["generating_image", "Đang tạo ảnh"],
  ["awaiting_review", "Chờ duyệt"],
  ["generating_audio", "Đang tạo giọng đọc"],
  ["transcribing", "Đang phiên âm"],
  ["ready_for_render", "Sẵn sàng render"],
  ["failed", "Thất bại"],
];

describe("SceneCard", () => {
  it.each(STATUS_LABELS)("shows the correct label for status %s", (status, label) => {
    render(
      <SceneCard projectId="p1" sceneIndex={0} scene={makeScene({ status })} onOpen={vi.fn()} />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows a Skeleton placeholder when the scene has no image yet", () => {
    render(<SceneCard projectId="p1" sceneIndex={0} scene={makeScene()} onOpen={vi.fn()} />);

    expect(document.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the real image once imageFile is set", () => {
    render(
      <SceneCard
        projectId="p1"
        sceneIndex={0}
        scene={makeScene({ imageFile: "images/000.png" })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it("shows the variant count when there are multiple imageVariants", () => {
    render(
      <SceneCard
        projectId="p1"
        sceneIndex={0}
        scene={makeScene({
          imageFile: "images/000.png",
          imageVariants: [
            { file: "images/000.png", width: 10, height: 10 },
            { file: "images/001.png", width: 10, height: 10 },
            { file: "images/002.png", width: 10, height: 10 },
          ],
        })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("3 biến thể")).toBeInTheDocument();
  });

  it("does not show a variant count badge for a single (or zero) variant", () => {
    render(
      <SceneCard
        projectId="p1"
        sceneIndex={0}
        scene={makeScene({
          imageFile: "images/000.png",
          imageVariants: [{ file: "images/000.png", width: 10, height: 10 }],
        })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByText(/biến thể/)).not.toBeInTheDocument();
  });

  it("truncates a long narration to 2 lines via line-clamp", () => {
    render(<SceneCard projectId="p1" sceneIndex={0} scene={makeScene()} onOpen={vi.fn()} />);

    const narration = screen.getByText(makeScene().narration);
    expect(narration.className).toContain("line-clamp-2");
  });

  it("calls onOpen when the card is clicked", () => {
    const onOpen = vi.fn();
    render(<SceneCard projectId="p1" sceneIndex={2} scene={makeScene()} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("scene-card"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
