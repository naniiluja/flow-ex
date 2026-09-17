import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { createProjectStore } from "../store/project-store.ts";

/**
 * Contract-level EP/BVA matrix for `GET /api/projects/:id/assets/*`.
 *
 * | request path (class)                              | Expected                                |
 * | ----------------------------------------------------- | ------------------------------------------ |
 * | existing file under <id>/assets/images/               | 200, CORS header, matching bytes            |
 * | missing file under <id>/assets/                        | 404                                          |
 * | path-traversal attempt (`../../project.json`)          | 400 ASSET_PATH_INVALID (never serves it)    |
 * | a DIFFERENT project's assets folder                     | never reachable, own project id in the path |
 */
describe("GET /api/projects/:id/assets/*", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;
  const projectId = randomUUID();
  const otherProjectId = randomUUID();

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-project-assets-"));
    const imagesDir = path.join(root, projectId, "assets", "images");
    await fs.mkdir(imagesDir, { recursive: true });
    await fs.writeFile(path.join(imagesDir, "000.png"), Buffer.from([1, 2, 3, 4]));
    await fs.writeFile(
      path.join(root, projectId, "project.json"),
      JSON.stringify({ secret: true }),
    );

    const otherImagesDir = path.join(root, otherProjectId, "assets", "images");
    await fs.mkdir(otherImagesDir, { recursive: true });
    await fs.writeFile(path.join(otherImagesDir, "000.png"), Buffer.from([9, 9, 9, 9]));

    app = buildApp({ store: createProjectStore(root) });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("serves an existing per-project asset with a permissive CORS header", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/assets/images/000.png`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.rawPayload).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it("returns 404 for a file that does not exist under the project's assets folder, in the standard error shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/assets/images/missing.png`,
    });
    expect(response.statusCode).toBe(404);
    // `@fastify/static`'s own `reply.callNotFound()` reaches `app.ts`'s `setNotFoundHandler`,
    // which must answer with ../.claude/rules/api-design.md's `{ error: { code, message } }`
    // shape (never Fastify's default `{message, error, statusCode}`, which also leaks the
    // internal route path).
    expect(JSON.parse(response.body)).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("rejects a plain '..' traversal attempt (collapsed by URL normalization, never reaching the project's files)", async () => {
    // Fastify/Node normalize a LITERAL '..' path segment before routing, so this never matches
    // the wildcard route at all (404) rather than reaching the handler — still safe, just via a
    // different layer than the in-handler check below.
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/assets/../project.json`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("rejects an encoded-slash traversal attempt with 400 instead of serving a file outside assets/", async () => {
    // Percent-encoding ONLY the slash (`..%2Fproject.json`) survives Fastify's own URL
    // normalization and reaches the handler with a literal ".." in the wildcard capture — this is
    // the case the in-handler path-containment check in project-assets.ts actually defends.
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/assets/..%2Fproject.json`,
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ error: { code: "ASSET_PATH_INVALID" } });
  });

  it("rejects an encoded-slash cross-project traversal attempt (400, not the other project's file)", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/assets/..%2F..%2F${otherProjectId}%2Fassets%2Fimages%2F000.png`,
    });
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ error: { code: "ASSET_PATH_INVALID" } });
  });

  it("serves the OTHER project's own asset only through its OWN id in the path", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${otherProjectId}/assets/images/000.png`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload).toEqual(Buffer.from([9, 9, 9, 9]));
  });
});

/**
 * Contract-level EP/BVA matrix for `GET /api/projects/:id/output` (the finished `output.mp4`,
 * which lives at the project's ROOT, not under `assets/**` — see the route's own comment on why
 * it is a NAMED route rather than a wildcard mounted at the project root).
 *
 * | project state                          | Expected                        |
 * | ----------------------------------------- | ---------------------------------- |
 * | output.mp4 exists at the project root     | 200, CORS header, matching bytes |
 * | project has no output.mp4 yet (not rendered) | 404                             |
 */
describe("GET /api/projects/:id/output", () => {
  let root: string;
  let app: ReturnType<typeof buildApp>;
  const projectId = randomUUID();

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-project-output-"));
    await fs.mkdir(path.join(root, projectId), { recursive: true });
    await fs.writeFile(path.join(root, projectId, "output.mp4"), Buffer.from([5, 6, 7, 8]));
    app = buildApp({ store: createProjectStore(root) });
  });

  afterEach(async () => {
    await app.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  it("serves the project's output.mp4 with a permissive CORS header", async () => {
    const response = await app.inject({ method: "GET", url: `/api/projects/${projectId}/output` });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
    expect(response.rawPayload).toEqual(Buffer.from([5, 6, 7, 8]));
  });

  it("returns 404 for a project that has not rendered an output.mp4 yet, in the standard error shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/projects/${randomUUID()}/output`,
    });
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({ error: { code: "NOT_FOUND" } });
  });
});
