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
    // `w-full` is load-bearing, not decorative: AppShell's own <main> (app-shell.tsx) is a
    // flex-col container, and a flex item with `width:auto` PLUS cross-axis `margin:auto`
    // (mx-auto) disables the default stretch-to-fill behavior per the flexbox spec — the item
    // instead shrinks to its own CONTENT width and only then gets centered by the auto margins.
    // Scene grid content happens to be wide enough that this was invisible, but the Log tab's
    // narrow box and the Video tab's narrow 9:16 player shrank the whole page down to their own
    // width and visibly drifted to the middle of the content area. `w-full` gives the item an
    // explicit width so `mx-auto` goes back to classically centering the (now correctly
    // max-w-6xl-capped) box, instead of negotiating around flex stretch.
    <main className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Về dự án mới"
            className="text-lg font-medium text-primary hover:underline"
          >
            {"←"}
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
            // No `w-full`: a 9:16 (TikTok preset) render stretched to the container's full width
            // (max-w-6xl) blows up to an enormous height, since only width was ever constrained.
            // Capping height instead and letting width auto-follow the video's own intrinsic
            // aspect ratio (same as a plain <img>) keeps both 16:9 and 9:16 renders a sane size.
            // Left-aligned (no `mx-auto`), matching the title/tabs/scene grid above it — centering
            // a narrow 9:16 box on its own read as "flying off to the middle" against an otherwise
            // left-aligned page.
            <video
              controls
              aria-label={`Video đã dựng: ${project.title}`}
              className="block max-h-[70vh] w-auto max-w-full rounded-md bg-black"
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
