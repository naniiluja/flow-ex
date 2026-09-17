import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Project } from "@flow-ex/shared-schemas";

import { FakeEventSource } from "../test-support/fake-event-source";
import { useProjectEvents } from "./use-project-events";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "22222222-2222-4222-8222-222222222222";

function makeProject(): Project {
  return {
    id: PROJECT_ID,
    title: "Du an test",
    voice: "v",
    aspectRatio: "16:9",
    reviewEnabled: false,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runStatus: "running",
    scenes: [
      { narration: "a", imagePrompt: "a", status: "pending", attempts: 0, imageVariants: [] },
      { narration: "b", imagePrompt: "b", status: "pending", attempts: 0, imageVariants: [] },
    ],
  };
}

function sceneEvent(sceneIndex: number, status: string) {
  return { type: "scene", projectId: PROJECT_ID, runId: RUN_ID, sceneIndex, status };
}

function logEvent(overrides: Partial<{ level: string; time: number; stage: string; msg: string }>) {
  return {
    type: "log",
    projectId: PROJECT_ID,
    runId: RUN_ID,
    level: "info",
    time: 1,
    stage: "pipeline",
    msg: "",
    ...overrides,
  };
}

/**
 * Contract-level EP/BVA/decision-table matrix for `useProjectEvents(projectId)`, validated
 * against `@flow-ex/shared-schemas`'s `scenePipelineEventSchema`/`logPipelineEventSchema`.
 *
 * | event                                       | Expected                                             |
 * | ---------------------------------------------- | --------------------------------------------------------|
 * | scene event, known status, valid index          | patches the cached project's scene status               |
 * | scene event, sceneIndex = -1 (BVA: below min)   | ignored (schema rejects a negative index)                |
 * | scene event, sceneIndex out of the scenes array  | ignored, cache unchanged (boundary above max)            |
 * | scene event, status outside the enum              | ignored (schema rejects an unknown status)               |
 * | scene event arrives with no cached project yet   | no-op, does not throw                                    |
 * | scene event, malformed JSON                        | ignored, does not throw inside the listener              |
 * | log event                                            | appended to the returned logLines, in arrival order      |
 * | projectId is undefined                                | no EventSource is opened at all                          |
 * | unmount                                                | the EventSource is closed                                |
 */
describe("useProjectEvents", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderWithClient(projectId: string | undefined, seedProject = true) {
    const queryClient = new QueryClient();
    if (seedProject) {
      queryClient.setQueryData(["project", projectId], makeProject());
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const hook = renderHook(() => useProjectEvents(projectId), { wrapper });
    return { hook, queryClient };
  }

  it("patches the cached project's scene status on a scene event", async () => {
    const { hook, queryClient } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");
    expect(source.url).toBe(`/api/projects/${PROJECT_ID}/events`);

    source.emit("scene", sceneEvent(1, "generating_image"));

    await waitFor(() => {
      const project = queryClient.getQueryData<Project>(["project", PROJECT_ID]);
      expect(project?.scenes[1]?.status).toBe("generating_image");
    });
    // Scene 0 is untouched.
    expect(queryClient.getQueryData<Project>(["project", PROJECT_ID])?.scenes[0]?.status).toBe(
      "pending",
    );
    hook.unmount();
  });

  it("ignores a scene event with sceneIndex -1 (boundary below the schema's minimum)", () => {
    const { queryClient } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    source.emit("scene", sceneEvent(-1, "ready_for_render"));

    const project = queryClient.getQueryData<Project>(["project", PROJECT_ID]);
    expect(project?.scenes.every((scene) => scene.status === "pending")).toBe(true);
  });

  it("ignores a scene event whose sceneIndex is out of the scenes array (boundary above max)", () => {
    const { queryClient } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    source.emit("scene", sceneEvent(99, "ready_for_render"));

    const project = queryClient.getQueryData<Project>(["project", PROJECT_ID]);
    expect(project?.scenes).toHaveLength(2);
    expect(project?.scenes.every((scene) => scene.status === "pending")).toBe(true);
  });

  it("ignores a scene event whose status is outside the known enum", () => {
    const { queryClient } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    source.emit("scene", sceneEvent(0, "not_a_real_status"));

    const project = queryClient.getQueryData<Project>(["project", PROJECT_ID]);
    expect(project?.scenes[0]?.status).toBe("pending");
  });

  it("does nothing (does not throw) when a scene event arrives with no project cached yet", () => {
    const { queryClient } = renderWithClient(PROJECT_ID, false);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    expect(() => source.emit("scene", sceneEvent(0, "generating_image"))).not.toThrow();
    expect(queryClient.getQueryData(["project", PROJECT_ID])).toBeUndefined();
  });

  it("ignores a malformed (non-JSON) scene frame without throwing inside the listener", () => {
    renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    expect(() => source.emitRaw("scene", "{not valid json")).not.toThrow();
  });

  it("accumulates log events in arrival order", async () => {
    const { hook } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    source.emit("log", logEvent({ msg: "first", time: 1 }));
    source.emit("log", logEvent({ level: "error", msg: "second", time: 2 }));

    await waitFor(() => {
      expect(hook.result.current.logLines.map((line) => line.msg)).toEqual(["first", "second"]);
    });
  });

  it("opens no EventSource when projectId is undefined", () => {
    renderWithClient(undefined);
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  it("closes the EventSource on unmount", () => {
    const { hook } = renderWithClient(PROJECT_ID);
    const source = FakeEventSource.instances[0];
    if (source === undefined) throw new Error("expected an EventSource to have been opened");

    hook.unmount();

    expect(source.closed).toBe(true);
  });
});
