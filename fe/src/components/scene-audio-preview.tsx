import { projectAssetUrl } from "../lib/project-asset-url";

export interface SceneAudioPreviewProps {
  projectId: string;
  audioFile?: string;
}

/** Presentational only (../.claude/rules/component-design.md): the page already owns the project
 * data, this just renders a real `<audio>` element pointing at the per-project asset route
 * (`GET /api/projects/:id/assets/*`, task 003/004) once a scene's audio has been generated. */
export function SceneAudioPreview({ projectId, audioFile }: SceneAudioPreviewProps) {
  if (audioFile === undefined) {
    return <p className="text-xs text-muted-foreground">Chưa có audio.</p>;
  }

  return (
    <audio controls src={projectAssetUrl(projectId, audioFile)} className="w-full">
      Trình duyệt của bạn không hỗ trợ phát audio.
    </audio>
  );
}
