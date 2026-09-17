import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared-schemas",
          root: "packages/shared-schemas",
          environment: "node",
        },
      },
      {
        test: {
          name: "be",
          root: "be",
          environment: "node",
          coverage: {
            include: ["src/pipeline/**"],
            thresholds: {
              lines: 80,
              functions: 80,
              branches: 80,
              statements: 80,
            },
          },
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./fe/src"),
          },
        },
        test: {
          name: "fe",
          root: "fe",
          environment: "jsdom",
          setupFiles: ["./src/test-setup.ts"],
        },
      },
      {
        test: {
          name: "video",
          root: "video",
          environment: "node",
          coverage: {
            include: ["src/timing/**"],
            thresholds: {
              lines: 80,
              functions: 80,
              branches: 80,
              statements: 80,
            },
          },
        },
      },
    ],
  },
});
