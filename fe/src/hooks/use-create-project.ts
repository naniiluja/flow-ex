import { useMutation } from "@tanstack/react-query";

import { createProject } from "../lib/api-client";

export function useCreateProject() {
  return useMutation({
    mutationFn: createProject,
  });
}
