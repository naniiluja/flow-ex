import { Link } from "react-router";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/status-badge";
import { useProjects } from "../hooks/use-projects";

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Danh sách project</h1>
        <Button render={<Link to="/projects/new" />}>Tạo mới</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có project nào. Bấm &quot;Tạo mới&quot; để bắt đầu.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <StatusBadge status={project.runStatus} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project.doneSceneCount}/{project.sceneCount} cảnh sẵn sàng
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
