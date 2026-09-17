import { Link } from "react-router";

import type { ProjectSummary } from "@flow-ex/shared-schemas";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { StatusBadge } from "../components/status-badge";
import { useProjects } from "../hooks/use-projects";

interface Metric {
  label: string;
  value: number;
}

function computeMetrics(projects: ProjectSummary[]): Metric[] {
  return [
    { label: "Tổng project", value: projects.length },
    { label: "Đang chạy", value: projects.filter((p) => p.runStatus === "running").length },
    {
      label: "Chờ duyệt",
      value: projects.filter((p) => p.runStatus === "awaiting_review").length,
    },
    { label: "Đã xong", value: projects.filter((p) => p.runStatus === "completed").length },
  ];
}

export function DashboardPage() {
  const { data: projects, isLoading } = useProjects();

  const metrics = computeMetrics(projects ?? []);
  const latest = [...(projects ?? [])]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)
          : metrics.map((metric) => (
              <Card key={metric.label}>
                <CardHeader>
                  <CardTitle className="text-sm font-normal text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-semibold">{metric.value}</span>
                </CardContent>
              </Card>
            ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Project mới nhất</h2>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có project nào.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {latest.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
                >
                  <span>{project.title}</span>
                  <StatusBadge status={project.runStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
