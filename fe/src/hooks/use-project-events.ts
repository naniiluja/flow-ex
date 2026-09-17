import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { z } from "zod";

import {
  logPipelineEventSchema,
  scenePipelineEventSchema,
  type LogPipelineEvent,
  type Project,
} from "@flow-ex/shared-schemas";

import { getProjectLogs } from "../lib/api-client";

export type { LogPipelineEvent } from "@flow-ex/shared-schemas";

/** Cap on accumulated log lines: a real run with several retries (30s/2m/5m backoff) can emit
 * thousands of lines over its lifetime, and keeping all of them in React state would re-render
 * the whole page on every line and grow unbounded. Oldest lines are dropped first (FIFO). */
const MAX_LOG_LINES = 500;

function parseEvent<T>(schema: z.ZodType<T>, raw: string): T | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : undefined;
}

/**
 * Subscribes to `GET /api/projects/:id/events` (SSE, ../../be/.claude/rules/api-design.md) for
 * the lifetime of `projectId`. Per ../.claude/rules/state-management.md, a `scene` event patches
 * the TanStack Query cache directly (`setQueryData`) instead of the page polling; a `log` event
 * is local UI state fed to the Log tab, seeded once from `GET /api/projects/:id/logs`'s history
 * (the SSE stream only ever emits lines from the moment THIS client connects, so without the
 * seed, reloading the page on an already-running or already-finished project showed an empty Log
 * tab even though `logs/run-<runId>.ndjson` has the full history on disk). Both event shapes are
 * validated against `@flow-ex/shared-schemas`'s `pipelineEventSchema` (the single BE/FE contract)
 * rather than a hand-rolled type guard, and a malformed/unparseable frame is dropped rather than
 * thrown from inside the `EventSource` listener.
 */
export function useProjectEvents(projectId: string | undefined): { logLines: LogPipelineEvent[] } {
  const queryClient = useQueryClient();
  const [logLines, setLogLines] = useState<LogPipelineEvent[]>([]);

  useEffect(() => {
    if (projectId === undefined) {
      return;
    }
    setLogLines([]);
    let cancelled = false;
    void getProjectLogs(projectId)
      .then((history) => {
        if (!cancelled) setLogLines(history);
      })
      .catch(() => undefined); // history is a best-effort seed; SSE still works without it
    const source = new EventSource(`/api/projects/${projectId}/events`);

    source.addEventListener("scene", (event) => {
      const payload = parseEvent(scenePipelineEventSchema, (event as MessageEvent<string>).data);
      if (payload === undefined) {
        return;
      }
      queryClient.setQueryData<Project>(["project", projectId], (current) => {
        if (current === undefined) {
          return current;
        }
        const scene = current.scenes[payload.sceneIndex];
        if (scene === undefined) {
          return current;
        }
        const scenes = [...current.scenes];
        scenes[payload.sceneIndex] = { ...scene, status: payload.status };
        return { ...current, scenes };
      });
      // A `scene` event only ever carries that ONE scene's status; `project.runStatus`/
      // `outputFile` (which flip once EVERY scene clears, ../../be/.claude/rules/api-design.md)
      // never get patched by the line above, so the UI (e.g. the render button's label, the
      // Video tab) can go stale for the rest of the run without this. Cheap: at most one event
      // per scene per stage, never per log line.
      void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    });

    source.addEventListener("log", (event) => {
      const payload = parseEvent(logPipelineEventSchema, (event as MessageEvent<string>).data);
      if (payload === undefined) {
        return;
      }
      setLogLines((previous) => {
        const next = [...previous, payload];
        return next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
      });
    });

    return () => {
      cancelled = true;
      source.close();
    };
  }, [projectId, queryClient]);

  return { logLines };
}
