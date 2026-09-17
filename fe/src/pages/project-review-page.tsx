import { useNavigate, useParams } from "react-router";

import { SceneVariantPicker } from "../components/scene-variant-picker";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useProject } from "../hooks/use-project";
import { useApproveScene, useRegenerateScene, useStartRender } from "../hooks/use-scene-review";

/**
 * Task 006's review-gate container page (../../.claude/plan/task-006-review-gate.md): one
 * `SceneVariantPicker` per scene still `awaiting_review`, and a "Render" button that only enables
 * once every scene has been approved — mirroring the pipeline engine's own gate
 * (be/src/pipeline/pipeline-engine.ts: it pauses the WHOLE run until every scene clears review).
 * Owns the data (TanStack Query + mutations) and passes plain props to the presentational picker
 * (../.claude/rules/component-design.md).
 */
export function ProjectReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error } = useProject(id);
  const approveScene = useApproveScene(id);
  const regenerateScene = useRegenerateScene(id);
  const startRender = useStartRender(id);

  // Only the LATEST mutation's own error should stay visible — without this, an approve
  // failure lingers on screen even after a later regenerate succeeds, since each `useMutation`
  // keeps its own error until reset (../.claude/rules/error-handling.md: an error must surface,
  // but a STALE one from an unrelated, already-resolved action is misleading, not helpful).
  function resetOtherErrors(justStarted: "approve" | "regenerate" | "render"): void {
    if (justStarted !== "approve") approveScene.reset();
    if (justStarted !== "regenerate") regenerateScene.reset();
    if (justStarted !== "render") startRender.reset();
  }

  if (isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Đang tải dự án...</main>;
  }

  if (isError || !project) {
    const suffix = error ? `: ${error.message}` : "";
    return <main className="p-6 text-sm text-destructive">{`Không tải được dự án${suffix}.`}</main>;
  }

  const scenesAwaitingReview = project.scenes.filter((scene) => scene.status === "awaiting_review");
  const everySceneApproved = scenesAwaitingReview.length === 0;
  // A `needs_user`/`fatal` error from any of the three mutations must SURFACE, not vanish behind
  // a button that just goes back to enabled (../.claude/rules/error-handling.md's "needs_user:
  // stop the run and surface it in the UI/log"; ../.claude/rules/state-management.md's "an inline
  // error state, never a silent blank screen").
  const mutationError = approveScene.error ?? regenerateScene.error ?? startRender.error;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">Duyệt ảnh — {project.title}</h1>
        <Button
          type="button"
          disabled={!everySceneApproved || startRender.isPending}
          onClick={() => {
            resetOtherErrors("render");
            startRender.mutate(undefined, {
              onSuccess: () => {
                void navigate(`/projects/${project.id}`);
              },
            });
          }}
        >
          Render
        </Button>
      </div>

      {mutationError && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mutationError.message}
        </p>
      )}

      {everySceneApproved ? (
        <p className="text-sm text-muted-foreground">
          Đã duyệt xong toàn bộ cảnh. Bấm "Render" để dựng video.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {project.scenes.map((scene, index) => {
            if (scene.status !== "awaiting_review") {
              return null;
            }
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Cảnh {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm text-muted-foreground">{scene.imagePrompt}</p>
                  {scene.imageFile === undefined ? (
                    // Should not happen (the pipeline always writes imageFile before a scene can
                    // reach awaiting_review), but a silent `null` here would look like the scene
                    // vanished rather than surfacing a real data problem.
                    <p className="text-sm text-destructive">
                      Cảnh này đang chờ duyệt nhưng chưa có ảnh nào — vui lòng báo lỗi này.
                    </p>
                  ) : (
                    <SceneVariantPicker
                      projectId={project.id}
                      sceneIndex={index}
                      imageFile={scene.imageFile}
                      variants={scene.imageVariants}
                      isPending={
                        (approveScene.isPending && approveScene.variables.sceneIndex === index) ||
                        (regenerateScene.isPending && regenerateScene.variables === index)
                      }
                      onApprove={(variantIndex) => {
                        resetOtherErrors("approve");
                        approveScene.mutate({ sceneIndex: index, variantIndex });
                      }}
                      onRegenerate={() => {
                        resetOtherErrors("regenerate");
                        regenerateScene.mutate(index);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
