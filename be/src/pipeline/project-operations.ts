import PQueue from "p-queue";

import { AppError } from "../domain/app-error.ts";
import type { ProjectStore } from "../store/project-store.ts";

// Shared by both transports and imports. Separate from the store's write queue so a
// service may perform several reads/updates under one short application operation.
const queues = new WeakMap<ProjectStore, Map<string, PQueue>>();

export function withProjectOperation<T>(store: ProjectStore, id: string, action: () => Promise<T>): Promise<T> {
  let byId = queues.get(store);
  if (!byId) { byId = new Map(); queues.set(store, byId); }
  let queue = byId.get(id);
  if (!queue) { queue = new PQueue({ concurrency: 1 }); byId.set(id, queue); }
  return queue.add(action);
}

export function requireInactive(activeRuns: Set<string>, projectId: string): void {
  if (activeRuns.has(projectId)) throw new AppError({
    code: "PIPELINE_ALREADY_RUNNING", errorKind: "needs_user",
    message: "Wait for the active run to finish before changing images or starting again.",
  });
}
