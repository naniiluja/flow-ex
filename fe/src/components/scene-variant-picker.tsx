import { useEffect, useState } from "react";

import type { ImageVariant } from "@flow-ex/shared-schemas";

import { projectAssetUrl } from "../lib/project-asset-url";
import { Button } from "./ui/button";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export interface SceneVariantPickerProps {
  projectId: string;
  sceneIndex: number;
  /** The variant `imageFile` currently points at (../../be/.claude/rules/flow-automation.md's
   * "imageFile always mirrors the selected variant"); used only to pre-select a radio item. */
  imageFile: string;
  variants: ImageVariant[];
  onApprove: (variantIndex?: number) => void;
  onRegenerate: () => void;
  /** True while an approve/regenerate request for THIS scene is in flight (task 006). */
  isPending?: boolean;
}

/** Presentational review-gate grid (../../.claude/plan/task-006-review-gate.md): shows every
 * generated variant as a selectable thumbnail (shadcn `radio-group`, per component-design.md's
 * "prefer existing library components"), then "Duyệt" approves whichever is selected and "Sinh
 * lại" asks the page to call `FlowImageProvider` again for this exact scene. Owns no data
 * fetching itself (component-design.md); the page passes the scene's own project data down. */
export function SceneVariantPicker({
  projectId,
  sceneIndex,
  imageFile,
  variants,
  onApprove,
  onRegenerate,
  isPending = false,
}: SceneVariantPickerProps) {
  const currentIndex = variants.findIndex((variant) => variant.file === imageFile);
  const [selectedIndex, setSelectedIndex] = useState(String(Math.max(currentIndex, 0)));
  // Re-sync the selection whenever the SERVER's own "current" variant changes — most notably
  // right after "Sinh lại" appends a new variant and moves `imageFile` to it. Without this, the
  // radio stays pinned to whatever was selected before the regenerate finished, so clicking
  // "Duyệt" right after would silently approve the OLD image instead of the just-generated one.
  useEffect(() => {
    setSelectedIndex(String(Math.max(currentIndex, 0)));
  }, [currentIndex]);

  return (
    <div className="flex flex-col gap-3" data-testid={`scene-${String(sceneIndex)}-variant-picker`}>
      <RadioGroup
        value={selectedIndex}
        onValueChange={(value) => {
          setSelectedIndex(String(value));
        }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {variants.map((variant, index) => (
            <label key={variant.file} className="flex flex-col items-center gap-1.5">
              <img
                src={projectAssetUrl(projectId, variant.file)}
                alt={`Biến thể ${String(index + 1)}`}
                className="aspect-video w-full rounded-md border object-cover"
              />
              <RadioGroupItem value={String(index)} aria-label={`Biến thể ${String(index + 1)}`} />
            </label>
          ))}
        </div>
      </RadioGroup>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            // An empty variants list (boundary: never seen in practice, since the pipeline
            // always appends one variant before a scene can reach awaiting_review) has no valid
            // index to send — approving with none tells the route "keep whatever imageFile
            // already points at" rather than sending the meaningless index 0.
            onApprove(variants.length === 0 ? undefined : Number(selectedIndex));
          }}
        >
          Duyệt
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onRegenerate}>
          Sinh lại
        </Button>
      </div>
    </div>
  );
}
