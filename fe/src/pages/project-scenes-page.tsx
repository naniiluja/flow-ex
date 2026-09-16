import { useParams } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useProject } from "../hooks/use-project";

export function ProjectScenesPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Đang tải dự án...</main>;
  }

  if (isError || !project) {
    const suffix = error ? `: ${error.message}` : "";
    return <main className="p-6 text-sm text-destructive">{`Không tải được dự án${suffix}.`}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-medium">{project.title}</h1>
      <div className="flex flex-col gap-3" data-testid="scene-list">
        {project.scenes.map((scene, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>Cảnh {index + 1}</CardTitle>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
