import { z } from "zod";

import {
  apiErrorBodySchema,
  type Project,
  projectSchema,
  projectSummarySchema,
} from "@flow-ex/shared-schemas";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiError(response.status, "UNKNOWN_ERROR", response.statusText);
  }

  const parsed = apiErrorBodySchema.safeParse(body);
  if (!parsed.success) {
    return new ApiError(
      response.status,
      "UNKNOWN_ERROR",
      `HTTP ${String(response.status)} ${response.statusText}`,
    );
  }

  return new ApiError(response.status, parsed.data.error.code, parsed.data.error.message);
}

export async function createProject(input: unknown): Promise<Project> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return projectSchema.parse(await response.json());
}

const listProjectsResponseSchema = z.object({ projects: z.array(projectSummarySchema) });

export async function listProjects() {
  const response = await fetch("/api/projects");

  if (!response.ok) {
    throw await toApiError(response);
  }

  return listProjectsResponseSchema.parse(await response.json()).projects;
}

export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    throw await toApiError(response);
  }

  return projectSchema.parse(await response.json());
}

/** Task 006's review-gate routes (../../be/.claude/rules/api-design.md): both return the whole
 * updated `Project`, which the calling mutation hook writes straight into the TanStack Query
 * cache (../.claude/rules/state-management.md) instead of waiting on an SSE event — the pipeline
 * ENGINE itself never emits one for either route (it isn't running during a review-gate pause),
 * but the `approve` ROUTE does emit its own `event: scene` afterward (`be/src/routes/scenes.ts`,
 * api-design.md), so another tab watching the same project still sees the status change land. */
export async function approveScene(
  projectId: string,
  sceneIndex: number,
  variantIndex?: number,
): Promise<Project> {
  const response = await fetch(`/api/projects/${projectId}/scenes/${String(sceneIndex)}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variantIndex === undefined ? {} : { variantIndex }),
  });

  if (!response.ok) {
    throw await toApiError(response);
  }

  return projectSchema.parse(await response.json());
}

export async function regenerateScene(projectId: string, sceneIndex: number): Promise<Project> {
  const response = await fetch(
    `/api/projects/${projectId}/scenes/${String(sceneIndex)}/regenerate`,
    { method: "POST" },
  );

  if (!response.ok) {
    throw await toApiError(response);
  }

  return projectSchema.parse(await response.json());
}

export async function startRender(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/render`, { method: "POST" });

  if (!response.ok) {
    throw await toApiError(response);
  }
}
