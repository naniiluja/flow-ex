import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import pino from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scriptInputSchema, type ScriptInput } from "@flow-ex/shared-schemas";

import { AppError } from "../domain/app-error.ts";
import { createProjectStore, type ProjectStore } from "./project-store.ts";

// Parsed through the real schema (not a hand-written literal) so it carries the SAME defaults
// (`references: []`, `scene.referenceIds: []`, task 013) that Fastify's zod type-provider already
// applies to `request.body` before `store.create` ever sees it in production
// (be/src/routes/projects.ts's `body: scriptInputSchema`) — a literal missing those fields would
// make `store.create`'s output silently disagree with what the real route path produces.
const validInput: ScriptInput = scriptInputSchema.parse({
  title: "Cau chuyen mua he",
  voice: "hn_female_ngochuyen_full_48k-fhg",
  aspectRatio: "16:9",
  preset: "youtube",
  reviewEnabled: false,
  scenes: [{ narration: "Xin chao", imagePrompt: "a sunny beach" }],
});

describe("createProjectStore", () => {
  let root: string;
  let store: ProjectStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-project-store-"));
    store = createProjectStore(root);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("creates a project.json file that reads back identically", async () => {
    const created = await store.create(validInput);
    const onDisk = await fs.readFile(path.join(root, created.id, "project.json"), "utf8");
    expect(JSON.parse(onDisk)).toEqual(created);

    const read = await store.read(created.id);
    expect(read).toEqual(created);
  });

  it("stamps a fresh project with the current schemaVersion and a unique id", async () => {
    const a = await store.create(validInput);
    const b = await store.create(validInput);
    // Bumped 1 -> 2 in task 009 (see @flow-ex/shared-schemas's CURRENT_SCHEMA_VERSION doc
    // comment).
    expect(a.schemaVersion).toBe(3);
    expect(a.id).not.toBe(b.id);
  });

  it("throws AppError(PROJECT_NOT_FOUND, fatal) for an unknown id", async () => {
    await expect(store.read(randomUUID())).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof AppError &&
        error.code === "PROJECT_NOT_FOUND" &&
        error.errorKind === "fatal"
      );
    });
  });

  it("throws AppError(PROJECT_CORRUPT, fatal) when project.json fails schema validation", async () => {
    const created = await store.create(validInput);
    await fs.writeFile(path.join(root, created.id, "project.json"), JSON.stringify({ bad: true }));

    await expect(store.read(created.id)).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof AppError && error.code === "PROJECT_CORRUPT" && error.errorKind === "fatal"
      );
    });
  });

  it("throws AppError(PROJECT_CORRUPT, fatal), not a raw SyntaxError, for truncated JSON", async () => {
    const created = await store.create(validInput);
    await fs.writeFile(path.join(root, created.id, "project.json"), '{"title": "trunc');

    await expect(store.read(created.id)).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof AppError && error.code === "PROJECT_CORRUPT" && error.errorKind === "fatal"
      );
    });
  });

  it("throws AppError(PROJECT_READ_FAILED, transient), not PROJECT_NOT_FOUND, for a non-ENOENT read failure", async () => {
    const created = await store.create(validInput);
    // Replace the file with a directory of the same name: readFile then fails with EISDIR,
    // a real system error that must not be reported to the client as a missing resource.
    await fs.rm(path.join(root, created.id, "project.json"));
    await fs.mkdir(path.join(root, created.id, "project.json"));

    await expect(store.read(created.id)).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof AppError &&
        error.code === "PROJECT_READ_FAILED" &&
        error.errorKind === "transient"
      );
    });
  });
});

describe("createProjectStore.list", () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "flow-ex-project-store-list-"));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it("returns [] for an empty projectsRoot (EP: no projects)", async () => {
    const store = createProjectStore(root);
    await expect(store.list()).resolves.toEqual([]);
  });

  it("returns [] when projectsRoot itself does not exist yet (BVA: nothing ever created)", async () => {
    const store = createProjectStore(path.join(root, "does-not-exist"));
    await expect(store.list()).resolves.toEqual([]);
  });

  it("returns a lightweight summary for one valid project (EP: single project, no scenes[] leak)", async () => {
    const store = createProjectStore(root);
    const created = await store.create(validInput);

    const summaries = await store.list();
    expect(summaries).toEqual([
      {
        id: created.id,
        title: created.title,
        runStatus: "idle",
        createdAt: created.createdAt,
        sceneCount: 1,
        doneSceneCount: 0,
        outputFile: undefined,
      },
    ]);
    expect(summaries[0]).not.toHaveProperty("scenes");
  });

  it("skips a folder with no project.json and logs a warn (EP: broken folder, no silent catch)", async () => {
    const logger = pino({ level: "silent" });
    const warnSpy = vi.spyOn(logger, "warn");
    const store = createProjectStore(root, logger);

    await fs.mkdir(path.join(root, "not-a-project"), { recursive: true });
    await store.create(validInput);

    const summaries = await store.list();
    expect(summaries).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "not-a-project" }),
      "project.list.skip",
    );
  });

  it("skips a folder with corrupt project.json and logs a warn (EP: corrupt JSON)", async () => {
    const logger = pino({ level: "silent" });
    const warnSpy = vi.spyOn(logger, "warn");
    const store = createProjectStore(root, logger);

    const corruptId = "corrupt-project";
    await fs.mkdir(path.join(root, corruptId), { recursive: true });
    await fs.writeFile(path.join(root, corruptId, "project.json"), "{not valid json");
    await store.create(validInput);

    const summaries = await store.list();
    expect(summaries).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: corruptId }),
      "project.list.skip",
    );
  });

  it("orders 3 projects by createdAt descending (BVA: many projects, ordering boundary)", async () => {
    const store = createProjectStore(root);
    const first = await store.create(validInput);
    await store.update(first.id, (p) => ({ ...p, createdAt: "2020-01-01T00:00:00.000Z" }));
    const second = await store.create(validInput);
    await store.update(second.id, (p) => ({ ...p, createdAt: "2021-01-01T00:00:00.000Z" }));
    const third = await store.create(validInput);
    await store.update(third.id, (p) => ({ ...p, createdAt: "2022-01-01T00:00:00.000Z" }));

    const summaries = await store.list();
    expect(summaries.map((s) => s.id)).toEqual([third.id, second.id, first.id]);
  });
});
