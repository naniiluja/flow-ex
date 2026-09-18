import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project } from "@flow-ex/shared-schemas";

import * as apiClient from "../lib/api-client";
import { FakeEventSource } from "../test-support/fake-event-source";
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

function makeProject(
  scenes: {
    narration: string;
    imagePrompt: string;
    status?: Project["scenes"][number]["status"];
  }[],
): Project {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Du an test",
    voice: "hn_female_ngochuyen_full_48k-fhg",
    aspectRatio: "16:9",
    preset: "youtube",
    reviewEnabled: false,
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    runStatus: "idle",
    references: [],
    scenes: scenes.map(({ status, ...scene }) => ({
      ...scene,
      referenceIds: [],
      status: status ?? "pending",
      attempts: 0,
      imageVariants: [],
    })),
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

  it("shows each scene's status label", async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getByText("Chờ xử lý")).toBeInTheDocument());
  });

  it('shows "Bắt đầu dựng video" for a fresh (idle) project and calls startRender on click (regression: this button never existed, so a project could never be started from the UI)', async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    const startRenderSpy = vi.spyOn(apiClient, "startRender").mockResolvedValue(undefined);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu dựng video" }));

    await waitFor(() => expect(startRenderSpy).toHaveBeenCalledWith(project.id));
  });

  it('shows "Chạy lại" instead once the run has failed', async () => {
    const project = {
      ...makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]),
      runStatus: "failed" as const,
    };
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Chạy lại" })).toBeInTheDocument(),
    );
  });

  it('shows "Tiếp tục" while runStatus is "running" (covers a run orphaned by a backend restart — the backend itself safely rejects a click with 409 if the run is genuinely still active, since be/src/routes/render.ts guards duplicate starts with an in-process Set, not the persisted runStatus)', async () => {
    const project = {
      ...makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]),
      runStatus: "running" as const,
    };
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);
    const startRenderSpy = vi.spyOn(apiClient, "startRender").mockResolvedValue(undefined);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));

    await waitFor(() => expect(startRenderSpy).toHaveBeenCalledWith(project.id));
  });

  it('shows the "Duyệt ảnh" link once a scene reaches awaiting_review, gated on the SCENE status (not runStatus, which SSE never patches)', async () => {
    const project = makeProject([
      { narration: "Xin chao", imagePrompt: "beach", status: "awaiting_review" },
    ]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Duyệt ảnh" })).toBeInTheDocument(),
    );
  });

  it('does not show the "Duyệt ảnh" link when no scene is awaiting_review', async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Duyệt ảnh" })).not.toBeInTheDocument();
  });

  it('shows "Đang phiên âm" for a scene in the transcribing status (task 007)', async () => {
    const project = makeProject([
      { narration: "Xin chao", imagePrompt: "beach", status: "transcribing" },
    ]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);

    await waitFor(() => expect(screen.getByText("Đang phiên âm")).toBeInTheDocument());
  });

  it('shows a playable <video> on the "Video" tab once the project has completed with an outputFile (regression: no route ever served output.mp4, so this tab had nothing to show)', async () => {
    const project = {
      ...makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]),
      runStatus: "completed" as const,
      outputFile: "output.mp4",
    };
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    const videoEl = document.querySelector("video");
    expect(videoEl).not.toBeNull();
    expect(videoEl?.getAttribute("src")).toBe(`/api/projects/${project.id}/output`);
  });

  it('shows a "not rendered yet" message on the "Video" tab before the project completes', async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Video" }));

    expect(screen.getByText("Video chưa dựng xong.")).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });

  it("switches to the Log tab and shows the empty-log placeholder before any SSE event arrives", async () => {
    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Log" }));

    expect(screen.getByText(/Chưa có log nào/)).toBeInTheDocument();
  });

  it("shows a real SSE log line in the Log tab once it arrives through the page's own hook", async () => {
    // Overrides test-setup.ts's inert stub with a controllable fake for this one test, so this
    // exercises the ACTUAL wiring (page -> useProjectEvents -> ProjectLogTab), not just each
    // piece in isolation — a page that hardcoded `logLines={[]}` would still pass every other
    // test in this file but fail this one.
    const originalEventSource = globalThis.EventSource;
    vi.stubGlobal("EventSource", FakeEventSource);
    FakeEventSource.instances = [];

    const project = makeProject([{ narration: "Xin chao", imagePrompt: "beach" }]);
    vi.spyOn(apiClient, "getProject").mockResolvedValue(project);

    renderAt(project.id);
    await waitFor(() => expect(screen.getByText("Cảnh 1")).toBeInTheDocument());

    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");
    source.emit("log", {
      type: "log",
      projectId: "11111111-1111-4111-8111-111111111111",
      runId: "22222222-2222-4222-8222-222222222222",
      level: "info",
      time: 1,
      stage: "image",
      msg: "sinh anh thanh cong",
    });

    fireEvent.click(screen.getByRole("tab", { name: "Log" }));
    await waitFor(() => expect(screen.getByText(/sinh anh thanh cong/)).toBeInTheDocument());

    vi.stubGlobal("EventSource", originalEventSource);
  });
});
