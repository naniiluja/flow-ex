import type { AspectRatio as AspectRatioValue, ProjectScene } from "@flow-ex/shared-schemas";

import { projectAssetUrl } from "../lib/project-asset-url";
import { AspectRatio } from "./ui/aspect-ratio";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

export interface SceneCardProps {
  projectId: string;
  sceneIndex: number;
  scene: ProjectScene;
  /** Project-level aspect ratio, drives the thumbnail's `AspectRatio` (task 011). Defaults to
   * 16:9 when the caller has no project loaded yet. */
  aspectRatio?: AspectRatioValue;
  onOpen: () => void;
}

// TEMPORARY (task 011): a simple status -> {label, badge variant} map, duplicated here on
// purpose. Task 010 (parallel worktree) is adding a shared `status-badge.tsx`; merge should
// replace this local map with that shared component rather than keep both.
const STATUS_META: Record<
  ProjectScene["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Chờ xử lý", variant: "outline" },
  generating_image: { label: "Đang sinh ảnh", variant: "secondary" },
  awaiting_review: { label: "Chờ duyệt", variant: "default" },
  generating_audio: { label: "Đang sinh giọng đọc", variant: "secondary" },
  transcribing: { label: "Đang tạo phụ đề", variant: "secondary" },
  ready_for_render: { label: "Sẵn sàng dựng video", variant: "default" },
  failed: { label: "Thất bại", variant: "destructive" },
};

const ASPECT_RATIO_TO_NUMBER: Record<AspectRatioValue, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

/** Presentational only (../.claude/rules/component-design.md): a single scene's grid tile —
 * thumbnail, status badge, a 2-line narration snippet, and a hover-revealed "Xem" affordance
 * that asks the page to open `SceneDetailDialog` for this scene. Owns no fetching/mutation. */
export function SceneCard({
  projectId,
  sceneIndex,
  scene,
  aspectRatio = "16:9",
  onOpen,
}: SceneCardProps) {
  const statusMeta = STATUS_META[scene.status];
  const variantCount = scene.imageVariants.length;

  return (
    <button
      type="button"
      data-testid="scene-card"
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <AspectRatio ratio={ASPECT_RATIO_TO_NUMBER[aspectRatio]}>
          {scene.imageFile === undefined ? (
            <Skeleton className="size-full" />
          ) : (
            <img
              src={projectAssetUrl(projectId, scene.imageFile)}
              alt={`Cảnh ${String(sceneIndex + 1)}`}
              className="size-full object-cover"
            />
          )}
        </AspectRatio>
        {variantCount > 1 && (
          <Badge variant="outline" className="absolute bottom-2 right-2 bg-background/80">
            {variantCount} biến thể
          </Badge>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm font-medium text-white">Xem chi tiết</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Cảnh {sceneIndex + 1}</span>
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{scene.narration}</p>
      </div>
    </button>
  );
}
