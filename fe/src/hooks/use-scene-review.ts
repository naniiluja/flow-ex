import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Project } from "@flow-ex/shared-schemas";

import { approveScene, regenerateScene, startRender } from "../lib/api-client";

/** Task 006's review-gate mutations: `approve`/`regenerate` return the whole updated `Project`,
 * so the cache is patched directly with the response (../.claude/rules/state-management.md)
 * instead of waiting on an SSE event from the pipeline ENGINE, which never emits one during a
 * review-gate pause (`approve`'s own ROUTE does emit `event: scene` separately, for any OTHER
 * tab watching the same project — see `../lib/api-client.ts`'s doc comment). */
export function useApproveScene(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sceneIndex, variantIndex }: { sceneIndex: number; variantIndex?: number }) => {
      if (projectId === undefined) {
        throw new Error("useApproveScene: no projectId");
      }
      return approveScene(projectId, sceneIndex, variantIndex);
    },
    onSuccess: (project: Project) => {
      queryClient.setQueryData(["project", projectId], project);
    },
  });
}

export function useRegenerateScene(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sceneIndex: number) => {
      if (projectId === undefined) {
        throw new Error("useRegenerateScene: no projectId");
      }
      return regenerateScene(projectId, sceneIndex);
    },
    onSuccess: (project: Project) => {
      queryClient.setQueryData(["project", projectId], project);
    },
  });
}

export function useStartRender(projectId: string | undefined) {
  return useMutation({
    mutationFn: () => {
      if (projectId === undefined) {
        throw new Error("useStartRender: no projectId");
      }
      return startRender(projectId);
    },
  });
}
