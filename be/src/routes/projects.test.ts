import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { projectSchema } from "@flow-ex/shared-schemas";

import { buildApp } from "../app.ts";
import { createProjectStore } from "../store/project-store.ts";

const errorBodySchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

const validBody = {
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  scenes: [{ narration: "Xin chao", imagePrompt: "a sunny beach" }],
};

describe("POST /api/projects + GET /api/projects/:id", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-routes-"));
    app = buildApp({ store: createProjectStore(root) });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("creates a project and writes project.json atomically", async () => {
    const response = await app.inject({ method: "POST", url: "/api/projects", payload: validBody });
    expect(response.statusCode).toBe(201);

    const body = projectSchema.parse(response.json());
    expect(body.schemaVersion).toBe(1);

    const onDisk = await fs.readFile(path.join(root, body.id, "project.json"), "utf8");
    expect(projectSchema.parse(JSON.parse(onDisk)).id).toBe(body.id);
  });

  it("rejects an invalid body with 400 VALIDATION_ERROR", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { ...validBody, scenes: [] },
    });
    expect(response.statusCode).toBe(400);
    expect(errorBodySchema.parse(response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("reads back a created project", async () => {
    const created = await app.inject({ method: "POST", url: "/api/projects", payload: validBody });
    const { id } = projectSchema.parse(created.json());

    const response = await app.inject({ method: "GET", url: `/api/projects/${id}` });
    expect(response.statusCode).toBe(200);
    expect(projectSchema.parse(response.json()).id).toBe(id);
  });

  it("returns 404 for an unknown project id", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
    });
    expect(response.statusCode).toBe(404);
    expect(errorBodySchema.parse(response.json()).error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("returns 400 for a malformed project id (not a uuid)", async () => {
    const response = await app.inject({ method: "GET", url: "/api/projects/not-a-uuid" });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 VALIDATION_ERROR for a malformed JSON request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: { "content-type": "application/json" },
      payload: "{not valid json",
    });
    expect(response.statusCode).toBe(400);
    expect(errorBodySchema.parse(response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 INTERNAL_ERROR (not 400) for a corrupt project.json on disk", async () => {
    const created = await app.inject({ method: "POST", url: "/api/projects", payload: validBody });
    const { id } = projectSchema.parse(created.json());
    await fs.writeFile(path.join(root, id, "project.json"), JSON.stringify({ bad: true }));

    const response = await app.inject({ method: "GET", url: `/api/projects/${id}` });
    expect(response.statusCode).toBe(500);
    expect(errorBodySchema.parse(response.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
