import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project, ProjectScene } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { ProjectReviewPage } from "./project-review-page";

function renderAt(projectId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/review`]}>
        <Routes>
          <Route path="/projects/:id/review" element={<ProjectReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const AWAITING_REVIEW_SCENES: ProjectScene[] = [
  {
    narration: "Xin chao",
    imagePrompt: "beach",
    status: "awaiting_review",
    attempts: 1,
    imageFile: "images/000.png",
    imageWidth: 1376,
    imageHeight: 768,
    imageVariants: [{ file: "images/000.png", width: 1376, height: 768 }],
  },
  {
    narration: "Tam biet",
    imagePrompt: "evening",
    status: "awaiting_review",
    attempts: 1,
    imageFile: "images/001.png",
    imageWidth: 1376,
    imageHeight: 768,
    imageVariants: [{ file: "images/001.png", width: 1376, height: 768 }],
  },
];

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Du an test",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    aspectRatio: "16:9",
    reviewEnabled: true,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runStatus: "awaiting_review",
    scenes: AWAITING_REVIEW_SCENES,
    ...overrides,
  };
}

/**
 * EP/BVA + decision table for `ProjectReviewPage` (task 006's review-gate container page).
 *
 * | scenes awaiting_review count | Render button                     |
 * | ------------------------------- | ------------------------------------ |
 * | 2 (boundary: none approved)        | disabled                        |
 * | 1 (one approved, one left)         | disabled                        |
 * | 0 (boundary: all approved)         | enabled, click triggers startRender |
 */
describe("ProjectReviewPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders one scene-card per awaiting_review scene", async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(2));
  });

  it("opening a card shows its SceneVariantPicker with a Duyệt button in the dialog", async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);
    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(2));

    const firstCard = screen.getAllByTestId("scene-card")[0];
    if (firstCard === undefined) throw new Error("expected at least one scene-card");
    fireEvent.click(firstCard);

    await waitFor(() => expect(screen.getByRole("button", { name: "Duyệt" })).toBeInTheDocument());
  });

  it("keeps the Render button disabled while any scene is still awaiting_review", async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(2));
    expect(screen.getByRole("button", { name: /Render/i })).toBeDisabled();
  });

  it("approving a scene from the dialog patches the cache from the response", async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    const approvedScenes = project.scenes.map((scene, index) =>
      index === 0 ? { ...scene, status: "generating_audio" as const } : scene,
    );
    vi.spyOn(apiClient, "approveScene").mockResolvedValue({ ...project, scenes: approvedScenes });

    renderAt(project.id);
    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(2));

    const firstCard = screen.getAllByTestId("scene-card")[0];
    if (firstCard === undefined) throw new Error("expected at least one scene-card");
    fireEvent.click(firstCard);
    await waitFor(() => expect(screen.getByRole("button", { name: "Duyệt" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Duyệt" }));

    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(1));
    expect(apiClient.approveScene).toHaveBeenCalledWith(project.id, 0, 0);
  });

  it('"Duyệt tất cả" approves every awaiting_review scene one request at a time', async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    // Builds the mocked response CUMULATIVELY off the current scenes array (not the original
    // `project` snapshot) — otherwise the second approve's mocked response would revert the
    // first scene back to awaiting_review, and the page would never converge.
    let currentScenes = project.scenes;
    const approveSceneSpy = vi
      .spyOn(apiClient, "approveScene")
      .mockImplementation((_id, sceneIndex) => {
        currentScenes = currentScenes.map((scene, index) =>
          index === sceneIndex ? { ...scene, status: "generating_audio" as const } : scene,
        );
        return Promise.resolve({ ...project, scenes: currentScenes });
      });

    renderAt(project.id);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: /Duyệt tất cả/ }));

    await waitFor(() => expect(screen.getByText(/Đã duyệt xong toàn bộ cảnh/)).toBeInTheDocument());
    expect(approveSceneSpy).toHaveBeenCalledTimes(2);
    expect(approveSceneSpy).toHaveBeenNthCalledWith(1, project.id, 0, undefined);
    expect(approveSceneSpy).toHaveBeenNthCalledWith(2, project.id, 1, undefined);
  });

  it("enables Render and triggers startRender once every scene is approved", async () => {
    const project = makeProject({
      scenes: AWAITING_REVIEW_SCENES.map((scene) => ({
        ...scene,
        status: "generating_audio" as const,
      })),
    });
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    const startRenderSpy = vi.spyOn(apiClient, "startRender").mockResolvedValue(undefined);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByRole("button", { name: /Render/i })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: /Render/i }));
    await waitFor(() => expect(startRenderSpy).toHaveBeenCalledWith(project.id));
  });

  it("surfaces an approve failure inline instead of silently going back to enabled (regression)", async () => {
    const project = makeProject();
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    vi.spyOn(apiClient, "approveScene").mockRejectedValue(
      new apiClient.ApiError(409, "SCENE_NOT_AWAITING_REVIEW", "not awaiting review anymore"),
    );

    renderAt(project.id);
    await waitFor(() => expect(screen.getAllByTestId("scene-card")).toHaveLength(2));

    const firstCard = screen.getAllByTestId("scene-card")[0];
    if (firstCard === undefined) throw new Error("expected at least one scene-card");
    fireEvent.click(firstCard);
    await waitFor(() => expect(screen.getByRole("button", { name: "Duyệt" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Duyệt" }));

    await waitFor(() =>
      expect(screen.getByText(/not awaiting review anymore/)).toBeInTheDocument(),
    );
  });
});
