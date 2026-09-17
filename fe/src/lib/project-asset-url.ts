/** The one place that builds a per-project asset URL (`GET /api/projects/:id/assets/*`,
 * ../../be/.claude/rules/api-design.md) — every component that renders an image/audio asset uses
 * this instead of inlining the same string template (previously duplicated between
 * `scene-variant-picker.tsx` and `scene-audio-preview.tsx`). */
export function projectAssetUrl(projectId: string, relativeAssetPath: string): string {
  return `/api/projects/${projectId}/assets/${relativeAssetPath}`;
}
