import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { ProjectScenesPage } from "./project-scenes-page";

function renderAt(projectId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectScenesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function makeProject(scenes: Project["scenes"]): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Du an test",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    aspectRatio: "16:9",
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    scenes,
  };
}

describe("ProjectScenesPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders exactly one scene card for a project with 1 scene", async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());
    expect(screen.queryByText("Cảnh 2")).not.toBeInTheDocument();
  });

  it("renders one card per scene for a project with many scenes", async () => {
    const project = makeProject([
      { narration: "Mo dau", imagePrompt: "sunrise" },
      { narration: "Giua chuyen", imagePrompt: "forest" },
      { narration: "Ket thuc", imagePrompt: "sunset" },
    ]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getByText("Cảnh 3")).toBeInTheDocument());
    expect(screen.getByText("Cảnh 1")).toBeInTheDocument();
    expect(screen.getByText("Cảnh 2")).toBeInTheDocument();
  });

  it("shows an error message when the project fails to load", async () => {
    vi.spyOn(apiClient, "getProject").mockRejectedValue(
      new apiClient.ApiError(404, "PROJECT_NOT_FOUND", "not found"),
    );

    renderAt("22222222-2222-2222-2222-222222222222");

    await waitFor(() => expect(screen.getByText(/Không tải được dự án/)).toBeInTheDocument());
  });
});
