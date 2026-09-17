import type { VariantProps } from "class-variance-authority";

import type { RunStatus, SceneStatus } from "@flow-ex/shared-schemas";

import { Badge, type badgeVariants } from "./ui/badge";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/** Single source of truth mapping a `RunStatus`/`SceneStatus` to a Badge variant + Vietnamese
 * label (task 010) — the project-list/dashboard cards and the scene table must never diverge on
 * what "the same status string" looks like. */
const STATUS_META: Record<RunStatus | SceneStatus, { label: string; variant: BadgeVariant }> = {
  idle: { label: "Chưa chạy", variant: "secondary" },
  pending: { label: "Chờ xử lý", variant: "secondary" },
  running: { label: "Đang chạy", variant: "default" },
  generating_image: { label: "Đang tạo ảnh", variant: "default" },
  awaiting_review: { label: "Chờ duyệt", variant: "outline" },
  generating_audio: { label: "Đang tạo giọng đọc", variant: "default" },
  transcribing: { label: "Đang phiên âm", variant: "default" },
  ready_for_render: { label: "Sẵn sàng render", variant: "secondary" },
  completed: { label: "Hoàn thành", variant: "secondary" },
  failed: { label: "Thất bại", variant: "destructive" },
};

export function StatusBadge({ status }: { status: RunStatus | SceneStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
