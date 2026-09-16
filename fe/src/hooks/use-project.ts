import { skipToken, useQuery } from "@tanstack/react-query";

import { getProject } from "../lib/api-client";

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    // `skipToken` disables the query (like `enabled: false`) while keeping `queryFn` typed
    // against a defined `id`, so there is no unreachable `id ?? ""` fallback to maintain.
    queryFn: id ? () => getProject(id) : skipToken,
  });
}
