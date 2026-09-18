import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SceneVariantPicker } from "./scene-variant-picker";

const VARIANTS = [
  { file: "images/000-a.png", width: 1376, height: 768 },
  { file: "images/000-b.png", width: 1376, height: 768 },
];

/**
 * EP/BVA + decision table for `SceneVariantPicker` (task 006's review-gate grid,
 * ../../.claude/plan/task-006-review-gate.md).
 *
 * | variants               | currentFile        | user action           | Expected                              |
 * | ------------------------ | -------------------- | ------------------------ | ---------------------------------------- |
 * | 2 variants                | matches variant[1]      | click "Duyệt"               | onApprove(1)                        |
 * | 2 variants                | matches variant[1]      | select variant[0], click "Duyệt" | onApprove(0)                   |
 * | 2 variants                | (any)                    | click "Sinh lại"            | onRegenerate()                     |
 * | 1 variant (boundary)      | (any)                    | renders 1 thumbnail          | 1 image, radio pre-selected      |
 */
describe("SceneVariantPicker", () => {
  it("renders one radio thumbnail per variant, pre-selecting the current imageFile", () => {
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(2);
    expect(screen.getByRole("radio", { checked: true })).toHaveAccessibleName(/2/);
  });

  it("approves the currently selected variant (defaults to the current imageFile) when clicking Duyệt", () => {
    const onApprove = vi.fn();
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={onApprove}
        onRegenerate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Duyệt/i }));
    expect(onApprove).toHaveBeenCalledWith(1);
  });

  it("approves a newly selected variant after the user picks a different one", () => {
    const onApprove = vi.fn();
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={onApprove}
        onRegenerate={vi.fn()}
      />,
    );
    const firstRadio = screen.getAllByRole("radio")[0];
    if (firstRadio === undefined) throw new Error("expected at least one radio button");
    fireEvent.click(firstRadio);
    fireEvent.click(screen.getByRole("button", { name: /Duyệt/i }));
    expect(onApprove).toHaveBeenCalledWith(0);
  });

  it("calls onRegenerate when clicking Sinh lại", () => {
    const onRegenerate = vi.fn();
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={vi.fn()}
        onRegenerate={onRegenerate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Sinh lại/i }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("renders exactly one thumbnail for a single-variant scene (boundary)", () => {
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={2}
        imageFile="images/002-a.png"
        variants={[{ file: "images/002-a.png", width: 1376, height: 768 }]}
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("re-selects the new variant once a regenerate finishes and imageFile moves to it (regression)", () => {
    const onApprove = vi.fn();
    const { rerender } = render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-a.png"
        variants={VARIANTS.slice(0, 1)}
        onApprove={onApprove}
        onRegenerate={vi.fn()}
      />,
    );

    // "Sinh lại" resolves: the page passes down a new variants list AND a new imageFile pointing
    // at the just-generated one — the component must move its own selection to match, not keep
    // pointing at the variant that was selected before the regenerate started.
    rerender(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={onApprove}
        onRegenerate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Duyệt/i }));
    expect(onApprove).toHaveBeenCalledWith(1);
  });

  it("disables Duyệt/Sinh lại while an action is pending", () => {
    render(
      <SceneVariantPicker
        projectId="p1"
        sceneIndex={0}
        imageFile="images/000-b.png"
        variants={VARIANTS}
        onApprove={vi.fn()}
        onRegenerate={vi.fn()}
        isPending
      />,
    );
    expect(screen.getByRole("button", { name: /Duyệt/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Sinh lại/i })).toBeDisabled();
  });
});
