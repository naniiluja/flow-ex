import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ApiError,
  approveScene,
  createProject,
  getProject,
  regenerateScene,
  startRender,
} from "./api-client";

// Node's native fetch (unlike a browser's) refuses a relative URL; resolve it against a fixed
// origin here so the app code can keep using plain relative paths (correct once served
// same-origin by be/'s @fastify/static, per api-design.md). msw must patch `globalThis.fetch`
// FIRST (via server.listen()), so this wrapper sits on top of msw's interceptor rather than
// bypassing it — otherwise msw never sees the (still-relative) request to match against.
const ORIGIN = "http://localhost";
const server = setupServer();
let fetchBeforeWrapping: typeof fetch;

function resolveRelative(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string" && input.startsWith("/")) {
    return new URL(input, ORIGIN);
  }
  return input;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  fetchBeforeWrapping = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    fetchBeforeWrapping(resolveRelative(input), init);
});

afterEach(() => server.resetHandlers());

afterAll(() => {
  globalThis.fetch = fetchBeforeWrapping;
  server.close();
});

const validProjectBody = {
  id: "44444444-4444-4444-8444-444444444444",
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  preset: "youtube",
  schemaVersion: 2,
  createdAt: new Date().toISOString(),
  runStatus: "idle",
  scenes: [{ narration: "Xin chao", imagePrompt: "beach", status: "pending", attempts: 0 }],
};

describe("createProject / getProject", () => {
  // EP/BVA matrix on the response boundary the API client owns:
  // | HTTP status | body                              | Expected                          |
  // | 2xx          | matches projectSchema             | resolves with the parsed Project  |
  // | 2xx          | does not match projectSchema       | rejects (ZodError propagates)     |
  // | non-2xx      | matches {error:{code,message}}     | rejects ApiError(status,code,msg) |
  // | non-2xx      | foreign/off-contract JSON shape     | rejects ApiError("UNKNOWN_ERROR") |
  // | non-2xx      | non-JSON body                       | rejects ApiError("UNKNOWN_ERROR") |
  it("resolves with the parsed project on a 2xx body that matches the contract", async () => {
    server.use(
      http.post(`${ORIGIN}/api/projects`, () =>
        HttpResponse.json(validProjectBody, { status: 201 }),
      ),
    );

    const project = await createProject({ title: "x" });
    expect(project.id).toBe(validProjectBody.id);
  });

  it("rejects with the underlying ZodError when the 2xx body is off-contract", async () => {
    server.use(http.post(`${ORIGIN}/api/projects`, () => HttpResponse.json({ oops: true })));

    await expect(createProject({ title: "x" })).rejects.toBeInstanceOf(z.ZodError);
  });

  it("rejects with an ApiError carrying the server's code/message for a contract error body", async () => {
    server.use(
      http.get(`${ORIGIN}/api/projects/:id`, () =>
        HttpResponse.json(
          { error: { code: "PROJECT_NOT_FOUND", message: "not found" } },
          { status: 404 },
        ),
      ),
    );

    const error = await getProject("00000000-0000-0000-0000-000000000000").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: "PROJECT_NOT_FOUND", message: "not found" });
  });

  it("falls back to UNKNOWN_ERROR for a non-2xx body that is off-contract JSON", async () => {
    server.use(
      http.get(`${ORIGIN}/api/projects/:id`, () =>
        HttpResponse.json(
          { message: "Route not found", error: "Not Found", statusCode: 404 },
          { status: 404 },
        ),
      ),
    );

    const error = await getProject("00000000-0000-0000-0000-000000000000").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNKNOWN_ERROR");
  });

  it("falls back to UNKNOWN_ERROR for a non-2xx, non-JSON body", async () => {
    server.use(
      http.get(
        `${ORIGIN}/api/projects/:id`,
        () => new HttpResponse("<html>gateway error</html>", { status: 502 }),
      ),
    );

    const error = await getProject("00000000-0000-0000-0000-000000000000").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("UNKNOWN_ERROR");
    expect((error as ApiError).status).toBe(502);
  });
});

/** These three thin wrappers share `createProject`/`getProject`'s own `toApiError` path (already
 * matrixed above), so only the request shape + happy path are asserted here (risk-based, per
 * ../../.claude/rules/testing.md's "internal test the paths most likely to break"). */
describe("approveScene / regenerateScene / startRender (task 006)", () => {
  const PROJECT_ID = "44444444-4444-4444-8444-444444444444";

  it("POSTs an empty body when no variantIndex is given", async () => {
    let receivedBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/projects/:id/scenes/:index/approve`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json(validProjectBody);
      }),
    );

    const project = await approveScene(PROJECT_ID, 0);
    expect(project.id).toBe(PROJECT_ID);
    expect(receivedBody).toEqual({});
  });

  it("POSTs the chosen variantIndex when given", async () => {
    let receivedBody: unknown;
    server.use(
      http.post(`${ORIGIN}/api/projects/:id/scenes/:index/approve`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json(validProjectBody);
      }),
    );

    await approveScene(PROJECT_ID, 0, 1);
    expect(receivedBody).toEqual({ variantIndex: 1 });
  });

  it("regenerateScene POSTs with no body and returns the updated project", async () => {
    server.use(
      http.post(`${ORIGIN}/api/projects/:id/scenes/:index/regenerate`, () =>
        HttpResponse.json(validProjectBody),
      ),
    );

    const project = await regenerateScene(PROJECT_ID, 0);
    expect(project.id).toBe(PROJECT_ID);
  });

  it("startRender POSTs to the render route and resolves with no body", async () => {
    server.use(
      http.post(`${ORIGIN}/api/projects/:id/render`, () =>
        HttpResponse.json({ status: "started" }, { status: 202 }),
      ),
    );

    await expect(startRender(PROJECT_ID)).resolves.toBeUndefined();
  });

  it("rejects with an ApiError when approve responds 409 (task 006's SCENE_NOT_AWAITING_REVIEW)", async () => {
    server.use(
      http.post(`${ORIGIN}/api/projects/:id/scenes/:index/approve`, () =>
        HttpResponse.json(
          { error: { code: "SCENE_NOT_AWAITING_REVIEW", message: "not awaiting review" } },
          { status: 409 },
        ),
      ),
    );

    const error = await approveScene(PROJECT_ID, 0).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("SCENE_NOT_AWAITING_REVIEW");
  });
});
