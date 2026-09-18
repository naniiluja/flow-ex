import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { createPipelineEventBus, type PipelineEventBus } from "../pipeline/pipeline-events.ts";
import { createProjectStore } from "../store/project-store.ts";

/**
 * `GET /api/projects/:id/events` (SSE): every event the given projectId's bus emits must reach
 * the client as a well-formed `event: <type>\ndata: <json>\n\n` frame, and events for a
 * DIFFERENT projectId must never leak into this stream.
 */
describe("GET /api/projects/:id/events (SSE)", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;
  let eventBus: PipelineEventBus;
  let baseUrl: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-events-"));
    eventBus = createPipelineEventBus();
    app = buildApp({ store: createProjectStore(root), eventBus });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    if (address === null || typeof address === "string") {
      throw new Error("expected a bound TCP address");
    }
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("streams a scene event and a log event for the subscribed project, in SSE frame format", async () => {
    const projectId = randomUUID();
    const otherProjectId = randomUUID();
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/events`, {
      signal: controller.signal,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const maybeReader = response.body?.getReader();
    if (maybeReader === undefined) throw new Error("expected a readable SSE body");
    const reader: ReadableStreamDefaultReader<Uint8Array> = maybeReader;
    const decoder = new TextDecoder();
    let received = "";

    async function readUntil(
      predicate: (text: string) => boolean,
      timeoutMs: number,
    ): Promise<void> {
      const deadline = Date.now() + timeoutMs;
      while (!predicate(received)) {
        if (Date.now() > deadline) throw new Error(`timed out waiting for: ${received}`);
        const { value, done } = await reader.read();
        if (done) throw new Error("SSE stream ended unexpectedly");
        received += decoder.decode(value, { stream: true });
      }
    }

    // Wait for the initial ":ok" comment so we know the subscription is live before emitting.
    await readUntil((text) => text.includes(":ok"), 2000);

    eventBus.emit(projectId, {
      type: "scene",
      projectId,
      runId: "run-1",
      sceneIndex: 0,
      status: "generating_image",
    });
    eventBus.emit(projectId, {
      type: "log",
      projectId,
      runId: "run-1",
      level: "info",
      time: 123,
      stage: "image",
      msg: "pipeline.scene.image.success",
    });
    // An event for a DIFFERENT project must never appear in this stream.
    eventBus.emit(otherProjectId, {
      type: "scene",
      projectId: otherProjectId,
      runId: "run-2",
      sceneIndex: 0,
      status: "failed",
    });

    await readUntil((text) => text.includes("event: log"), 2000);

    expect(received).toContain("event: scene\n");
    expect(received).toContain('"sceneIndex":0');
    expect(received).toContain('"status":"generating_image"');
    expect(received).toContain("event: log\n");
    expect(received).toContain("pipeline.scene.image.success");
    expect(received).not.toContain(otherProjectId);

    controller.abort();
  });
});
