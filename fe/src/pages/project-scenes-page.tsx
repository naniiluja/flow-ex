import { useState } from "react";
import { Link, useParams } from "react-router";

import { Alert, AlertDescription } from "../components/ui/alert";
import { ProjectLogTab } from "../components/project-log-tab";
import { SceneDetailDialog } from "../components/scene-detail-dialog";
import { SceneGrid } from "../components/scene-grid";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useProject } from "../hooks/use-project";
import { useProjectEvents } from "../hooks/use-project-events";
import { useStartRender } from "../hooks/use-scene-review";

export function ProjectScenesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, error } = useProject(id);
  // Only open the SSE stream once the project has actually loaded — an unknown/failed id would
  // otherwise hold a connection open behind an error screen with nothing to show for it.
  const { logLines } = useProjectEvents(project ? id : undefined);
  const startRender = useStartRender(id);
  const [openSceneIndex, setOpenSceneIndex] = useState<number | undefined>(undefined);

  if (isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Đang tải dự án...</main>;
  }

  if (isError || !project) {
    const suffix = error ? `: ${error.message}` : "";
    return <main className="p-6 text-sm text-destructive">{`Không tải được dự án${suffix}.`}</main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {"← Dự án mới"}
          </Link>
          <h1 className="text-lg font-medium">{project.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {(project.runStatus === "awaiting_review" ||
            project.scenes.some((scene) => scene.status === "awaiting_review")) && (
            // Gated on BOTH: `runStatus` catches the case where every scene has already been
            // approved (no scene is individually "awaiting_review" anymore) but the run itself
            // hasn't been re-triggered yet — without this half, leaving the review page before
            // clicking "Render" strands the project with no link back to it (a real dead end
            // caught by /ccf:check's task 007 review). The per-scene check stays too, for the
            // normal case of arriving here mid-review before anything is approved.
            <Link
              to={`/projects/${project.id}/review`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Duyệt ảnh
            </Link>
          )}
          {(project.runStatus === "idle" ||
            project.runStatus === "failed" ||
            project.runStatus === "running" ||
            project.runStatus === "awaiting_review") && (
            <Button
              type="button"
              size="sm"
              disabled={startRender.isPending}
              onClick={() => startRender.mutate()}
            >
              {project.runStatus === "failed"
                ? "Chạy lại"
                : project.runStatus === "running" || project.runStatus === "awaiting_review"
                  ? "Tiếp tục"
                  : "Bắt đầu dựng video"}
            </Button>
          )}
          {project.runStatus === "completed" && project.outputFile !== undefined && (
            <span className="text-sm text-muted-foreground">Đã dựng xong — xem ở tab "Video"</span>
          )}
        </div>
      </div>
      {startRender.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{startRender.error.message}</AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="scenes">
        <TabsList>
          <TabsTrigger value="scenes">Cảnh</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="scenes">
          <SceneGrid
            projectId={project.id}
            scenes={project.scenes}
            aspectRatio={project.aspectRatio}
            onSelectScene={setOpenSceneIndex}
          />
          {openSceneIndex !== undefined && project.scenes[openSceneIndex] && (
            <SceneDetailDialog
              projectId={project.id}
              sceneIndex={openSceneIndex}
              scene={project.scenes[openSceneIndex]}
              open={true}
              onOpenChange={(open) => {
                if (!open) setOpenSceneIndex(undefined);
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="log">
          <ProjectLogTab logLines={logLines} />
        </TabsContent>
        <TabsContent value="video">
          {project.runStatus === "completed" && project.outputFile !== undefined ? (
            <video
              controls
              aria-label={`Video đã dựng: ${project.title}`}
              className="w-full rounded-md"
              src={`/api/projects/${project.id}/output`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Video chưa dựng xong.</p>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
