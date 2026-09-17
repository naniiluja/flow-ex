import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProjectSummary } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { DashboardPage } from "./dashboard-page";

const summary = (overrides: Partial<ProjectSummary>): ProjectSummary => ({
  id: overrides.id ?? "11111111-1111-1111-1111-111111111111",
  title: overrides.title ?? "Project",
  runStatus: overrides.runStatus ?? "idle",
  createdAt: overrides.createdAt ?? "2026-09-17T00:00:00.000Z",
  sceneCount: overrides.sceneCount ?? 1,
  doneSceneCount: overrides.doneSceneCount ?? 0,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes the four metric counts correctly from a mixed set of run statuses", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue([
      summary({ id: "1", runStatus: "running" }),
      summary({ id: "2", runStatus: "running" }),
      summary({ id: "3", runStatus: "awaiting_review" }),
      summary({ id: "4", runStatus: "completed" }),
      summary({ id: "5", runStatus: "idle" }),
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument(); // tổng project
    });
    expect(screen.getAllByText("2")).toHaveLength(1); // đang chạy
    expect(screen.getAllByText("1")).toHaveLength(2); // chờ duyệt + đã xong
  });

  it("shows the 5 most recent projects", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue(
      Array.from({ length: 7 }, (_, i) =>
        summary({
          id: String(i),
          title: `Project ${String(i)}`,
          createdAt: new Date(2026, 0, i + 1).toISOString(),
        }),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Project 6")).toBeInTheDocument();
    });
    expect(screen.queryByText("Project 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Project 1")).not.toBeInTheDocument();
  });
});
