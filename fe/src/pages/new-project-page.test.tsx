import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { NewProjectPage } from "./new-project-page";

const validJson = JSON.stringify({
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  scenes: [{ narration: "Xin chao", imagePrompt: "beach" }],
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<NewProjectPage />} />
          <Route path="/projects/:id" element={<div>PROJECT_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function getTextarea(): HTMLElement {
  return screen.getByLabelText("Kịch bản (JSON)");
}

describe("NewProjectPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a parse error and never calls the API for invalid JSON", () => {
    const createSpy = vi.spyOn(apiClient, "createProject");
    renderPage();

    fireEvent.change(getTextarea(), { target: { value: "{ not valid json" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo dự án" }));

    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("submits the parsed script and navigates to the new project on success", async () => {
    const project: Project = {
      id: "33333333-3333-3333-3333-333333333333",
      title: "Cau chuyen mua he",
      voice: "hn_female_ngochuyen_full_48k-fhg",
      aspectRatio: "16:9",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      runStatus: "idle",
      scenes: [{ narration: "Xin chao", imagePrompt: "beach", status: "pending", attempts: 0 }],
    };
    const createSpy = vi.spyOn(apiClient, "createProject").mockResolvedValue(project);
    renderPage();

    fireEvent.change(getTextarea(), { target: { value: validJson } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo dự án" }));

    await waitFor(() => expect(screen.getByText("PROJECT_PAGE")).toBeInTheDocument());
    expect(createSpy.mock.calls[0]?.[0]).toEqual(JSON.parse(validJson));
  });

  it("shows the API error message when the server rejects the script", async () => {
    vi.spyOn(apiClient, "createProject").mockRejectedValue(
      new apiClient.ApiError(400, "VALIDATION_ERROR", "scenes must have at least 1 item"),
    );
    renderPage();

    fireEvent.change(getTextarea(), { target: { value: validJson } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo dự án" }));

    await waitFor(() =>
      expect(screen.getByText("scenes must have at least 1 item")).toBeInTheDocument(),
    );
  });
});
