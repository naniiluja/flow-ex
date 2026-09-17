import type { ProjectScene } from "@flow-ex/shared-schemas";

import { SceneAudioPreview } from "./scene-audio-preview";
import { SceneVariantPicker } from "./scene-variant-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export interface SceneDetailDialogProps {
  projectId: string;
  sceneIndex: number;
  scene: ProjectScene;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present only on the review-gate page (task 006): when given, the dialog shows the
   * `SceneVariantPicker` (approve/regenerate) instead of the plain read-only view. */
  review?: {
    isPending: boolean;
    onApprove: (variantIndex?: number) => void;
    onRegenerate: () => void;
  };
}

/** Presentational only (../.claude/rules/component-design.md): the "zoomed in" view of one
 * scene, opened from a `SceneCard` click (task 011). Reuses `SceneVariantPicker` and
 * `SceneAudioPreview` as-is rather than re-implementing their approve/regenerate/audio logic —
 * this component only arranges them inside a shadcn `Dialog`. */
export function SceneDetailDialog({
  projectId,
  sceneIndex,
  scene,
  open,
  onOpenChange,
  review,
}: SceneDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cảnh {sceneIndex + 1}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>
            <span className="font-medium">Lời thoại: </span>
            {scene.narration}
          </p>
          <p>
            <span className="font-medium">Prompt ảnh: </span>
            {scene.imagePrompt}
          </p>
          {review && scene.imageFile !== undefined ? (
            <SceneVariantPicker
              projectId={projectId}
              sceneIndex={sceneIndex}
              imageFile={scene.imageFile}
              variants={scene.imageVariants}
              isPending={review.isPending}
              onApprove={review.onApprove}
              onRegenerate={review.onRegenerate}
            />
          ) : (
            <SceneAudioPreview projectId={projectId} audioFile={scene.audioFile} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
