import { EventEmitter } from "node:events";

import type { PipelineEvent } from "@flow-ex/shared-schemas";

export type { LogPipelineEvent, PipelineEvent, ScenePipelineEvent } from "@flow-ex/shared-schemas";

/** Per-project pub/sub so `GET /api/projects/:id/events` (SSE) can observe a run's scene-status
 * changes and log lines live, without the route and the pipeline engine knowing about each other
 * directly (../../.claude/rules/architecture.md: routes -> services, never the reverse). The
 * event SHAPE itself is `@flow-ex/shared-schemas`'s `pipelineEventSchema` — the single definition
 * this module and every SSE consumer validate against. */
export interface PipelineEventBus {
  emit(projectId: string, event: PipelineEvent): void;
  subscribe(projectId: string, handler: (event: PipelineEvent) => void): () => void;
}

export function createPipelineEventBus(): PipelineEventBus {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);

  return {
    emit(projectId, event) {
      emitter.emit(projectId, event);
    },
    subscribe(projectId, handler) {
      emitter.on(projectId, handler);
      return () => {
        emitter.off(projectId, handler);
      };
    },
  };
}
