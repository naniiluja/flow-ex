import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { Alert, AlertDescription } from "../components/ui/alert";
import { SceneDetailDialog } from "../components/scene-detail-dialog";
import { SceneGrid } from "../components/scene-grid";
import { Button } from "../components/ui/button";
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
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [openSceneIndex, setOpenSceneIndex] = useState<number | undefined>(undefined);

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

  const sceneIndicesAwaitingReview = project.scenes
    .map((scene, index) => ({ scene, index }))
    .filter(({ scene }) => scene.status === "awaiting_review")
    .map(({ index }) => index);
  const everySceneApproved = sceneIndicesAwaitingReview.length === 0;

  // Approves every awaiting_review scene with its CURRENT default variant, one request at a
  // time — sequential rather than firing all 18 at once, since they all queue behind the same
  // per-project write lock anyway (data-layer.md) and a sequential loop keeps a single, honest
  // error surfaced (which scene it stopped at) instead of 18 requests racing into one message.
  async function handleApproveAll(): Promise<void> {
    resetOtherErrors("approve");
    setIsApprovingAll(true);
    try {
      for (const sceneIndex of sceneIndicesAwaitingReview) {
        await approveScene.mutateAsync({ sceneIndex });
      }
    } catch {
      // approveScene.error already holds the failure for the banner above; stop the loop here.
    } finally {
      setIsApprovingAll(false);
    }
  }
  // A `needs_user`/`fatal` error from any of the three mutations must SURFACE, not vanish behind
  // a button that just goes back to enabled (../.claude/rules/error-handling.md's "needs_user:
  // stop the run and surface it in the UI/log"; ../.claude/rules/state-management.md's "an inline
  // error state, never a silent blank screen").
  const mutationError = approveScene.error ?? regenerateScene.error ?? startRender.error;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${project.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {"← Cảnh"}
          </Link>
          <h1 className="text-lg font-medium">Duyệt ảnh — {project.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!everySceneApproved && (
            <Button
              type="button"
              variant="outline"
              disabled={isApprovingAll}
              onClick={() => {
                void handleApproveAll();
              }}
            >
              {isApprovingAll
                ? "Đang duyệt..."
                : `Duyệt tất cả (${String(sceneIndicesAwaitingReview.length)})`}
            </Button>
          )}
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
      </div>

      {mutationError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{mutationError.message}</AlertDescription>
        </Alert>
      )}

      {everySceneApproved ? (
        <p className="text-sm text-muted-foreground">
          Đã duyệt xong toàn bộ cảnh. Bấm "Render" để dựng video.
        </p>
      ) : (
        <>
          <SceneGrid
            projectId={project.id}
            scenes={project.scenes.filter((scene) => scene.status === "awaiting_review")}
            aspectRatio={project.aspectRatio}
            onSelectScene={setOpenSceneIndex}
          />
          {openSceneIndex !== undefined &&
            sceneIndicesAwaitingReview[openSceneIndex] !== undefined &&
            (() => {
              const realIndex = sceneIndicesAwaitingReview[openSceneIndex];
              const scene = project.scenes[realIndex];
              if (scene?.imageFile === undefined) return null;
              return (
                <SceneDetailDialog
                  projectId={project.id}
                  sceneIndex={realIndex}
                  scene={scene}
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) setOpenSceneIndex(undefined);
                  }}
                  review={{
                    isPending:
                      (approveScene.isPending && approveScene.variables.sceneIndex === realIndex) ||
                      (regenerateScene.isPending && regenerateScene.variables === realIndex),
                    onApprove: (variantIndex) => {
                      resetOtherErrors("approve");
                      approveScene.mutate({ sceneIndex: realIndex, variantIndex });
                    },
                    onRegenerate: () => {
                      resetOtherErrors("regenerate");
                      regenerateScene.mutate(realIndex);
                    },
                  }}
                />
              );
            })()}
        </>
      )}
    </main>
  );
}
