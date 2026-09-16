import { apiErrorBodySchema, type Project, projectSchema } from "@flow-ex/shared-schemas";

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

export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    throw await toApiError(response);
  }

  return projectSchema.parse(await response.json());
}
