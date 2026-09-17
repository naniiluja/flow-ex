import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import PQueue from "p-queue";
import writeFileAtomic from "write-file-atomic";

import {
  CURRENT_SCHEMA_VERSION,
  projectSchema,
  type Project,
  type ScriptInput,
} from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";

export interface ProjectStore {
  create(input: ScriptInput): Promise<Project>;
  read(id: string): Promise<Project>;
  /** Atomically read-modify-write project.json: `mutate` receives the CURRENT on-disk project
   * and returns the next one, queued per-project (see ../../.claude/rules/data-layer.md) so two
   * concurrent scene-state writes never interleave. The result is validated against
   * `projectSchema` before it is written, so a bug in `mutate` fails loudly instead of corrupting
   * the file on disk. */
  update(id: string, mutate: (project: Project) => Project): Promise<Project>;
  /** The on-disk root every project folder lives under — needed by the per-project asset route
   * to serve `projects/<id>/assets/**` (video.md) without the route re-deriving the path itself. */
  readonly projectsRoot: string;
}

/** One project = one folder under projectsRoot, containing project.json (see ../../.claude/rules/data-layer.md). */
export function createProjectStore(projectsRoot: string): ProjectStore {
  const writeQueues = new Map<string, PQueue>();

  function queueFor(id: string): PQueue {
    const existing = writeQueues.get(id);
    if (existing) {
      return existing;
    }
    const queue = new PQueue({ concurrency: 1 });
    writeQueues.set(id, queue);
    return queue;
  }

  function projectDir(id: string): string {
    return path.join(projectsRoot, id);
  }

  function projectFile(id: string): string {
    return path.join(projectDir(id), "project.json");
  }

  async function create(input: ScriptInput): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...input,
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      runStatus: "idle",
      scenes: input.scenes.map((scene) => ({ ...scene, status: "pending", attempts: 0 })),
    };

    await queueFor(id).add(async () => {
      await fs.mkdir(projectDir(id), { recursive: true });
      await writeFileAtomic(projectFile(id), JSON.stringify(project, null, 2));
    });

    return project;
  }

  async function readFromDisk(id: string): Promise<Project> {
    let raw: string;
    try {
      raw = await fs.readFile(projectFile(id), "utf8");
    } catch (cause) {
      const code = cause instanceof Error ? (cause as NodeJS.ErrnoException).code : undefined;
      if (code === "ENOENT") {
        throw new AppError({
          code: "PROJECT_NOT_FOUND",
          errorKind: "fatal",
          message: `Project ${id} not found`,
          cause,
          context: { projectId: id },
        });
      }
      throw new AppError({
        code: "PROJECT_READ_FAILED",
        errorKind: "transient",
        message: `Failed to read project.json for ${id}`,
        cause,
        context: { projectId: id },
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch (cause) {
      throw new AppError({
        code: "PROJECT_CORRUPT",
        errorKind: "fatal",
        message: `project.json for ${id} is not valid JSON`,
        cause,
        context: { projectId: id },
      });
    }

    const parsed = projectSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError({
        code: "PROJECT_CORRUPT",
        errorKind: "fatal",
        message: `project.json for ${id} does not match the current schema`,
        cause: parsed.error,
        context: { projectId: id },
      });
    }

    return parsed.data;
  }

  async function update(id: string, mutate: (project: Project) => Project): Promise<Project> {
    return queueFor(id).add(async () => {
      const current = await readFromDisk(id);
      const next = mutate(current);
      const validated = projectSchema.parse(next);
      await writeFileAtomic(projectFile(id), JSON.stringify(validated, null, 2));
      return validated;
    });
  }

  return { create, read: readFromDisk, update, projectsRoot };
}
