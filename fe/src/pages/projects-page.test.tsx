import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProjectSummary } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { ProjectsPage } from "./projects-page";

const summary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: "11111111-1111-1111-1111-111111111111",
  title: "Cau chuyen mua he",
  runStatus: "idle",
  createdAt: "2026-09-17T00:00:00.000Z",
  sceneCount: 3,
  doneSceneCount: 1,
  ...overrides,
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/projects"]}>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Skeleton placeholders while loading", () => {
    vi.spyOn(apiClient, "listProjects").mockReturnValue(
      new Promise(() => {
        /* never resolves: asserts the loading state */
      }),
    );
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no projects", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Chưa có project nào/)).toBeInTheDocument();
    });
  });

  it("renders one card per project when data is loaded", async () => {
    vi.spyOn(apiClient, "listProjects").mockResolvedValue([
      summary({ id: "a", title: "Project A" }),
      summary({ id: "b", title: "Project B" }),
      summary({ id: "c", title: "Project C" }),
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Project A")).toBeInTheDocument();
    });
    expect(screen.getByText("Project B")).toBeInTheDocument();
    expect(screen.getByText("Project C")).toBeInTheDocument();
    const cardLinks = screen
      .getAllByRole("link")
      .filter((el) => /^\/projects\/[a-c]$/.test(el.getAttribute("href") ?? ""));
    expect(cardLinks).toHaveLength(3);
  });
});
