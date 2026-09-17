import { Link, useParams } from "react-router";

import type { SceneStatus } from "@flow-ex/shared-schemas";

import { ProjectLogTab } from "../components/project-log-tab";
import { SceneAudioPreview } from "../components/scene-audio-preview";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useProject } from "../hooks/use-project";
import { useProjectEvents } from "../hooks/use-project-events";

const STATUS_LABEL: Record<SceneStatus, string> = {
  pending: "Chờ xử lý",
  generating_image: "Đang sinh ảnh",
  awaiting_review: "Chờ duyệt",
  generating_audio: "Đang sinh giọng đọc",
  transcribing: "Đang tạo phụ đề",
  ready_for_render: "Sẵn sàng dựng video",
  failed: "Thất bại",
};

export function ProjectScenesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, error } = useProject(id);
  // Only open the SSE stream once the project has actually loaded — an unknown/failed id would
  // otherwise hold a connection open behind an error screen with nothing to show for it.
  const { logLines } = useProjectEvents(project ? id : undefined);

  if (isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Đang tải dự án...</main>;
  }

  if (isError || !project) {
    const suffix = error ? `: ${error.message}` : "";
    return <main className="p-6 text-sm text-destructive">{`Không tải được dự án${suffix}.`}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">{project.title}</h1>
        {project.scenes.some((scene) => scene.status === "awaiting_review") && (
          <Link
            to={`/projects/${project.id}/review`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Duyệt ảnh
          </Link>
        )}
      </div>
      <Tabs defaultValue="scenes">
        <TabsList>
          <TabsTrigger value="scenes">Cảnh</TabsTrigger>
          <TabsTrigger value="log">Log</TabsTrigger>
        </TabsList>
        <TabsContent value="scenes">
          <div className="flex flex-col gap-3" data-testid="scene-list">
            {project.scenes.map((scene, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Cảnh {index + 1}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABEL[scene.status]}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <p>
                    <span className="font-medium">Lời thoại: </span>
                    {scene.narration}
                  </p>
                  <p>
                    <span className="font-medium">Prompt ảnh: </span>
                    {scene.imagePrompt}
                  </p>
                  <SceneAudioPreview projectId={project.id} audioFile={scene.audioFile} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="log">
          <ProjectLogTab logLines={logLines} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
