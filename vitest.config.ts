
import { defineConfig } from "vitest/config";

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
          // `.whisper-cache/` is real whisper.cpp install output (task 007's `installWhisperCpp`,
          // gitignored), not our source — it ships its own bundled test file that fails without
          // its native addon built, and vitest's default include glob would otherwise pick it up.
          exclude: ["**/node_modules/**", ".whisper-cache/**"],
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
