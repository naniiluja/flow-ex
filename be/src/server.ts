import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "./app.ts";
import { loadEnv } from "./env.ts";
import { createLogger } from "./logger.ts";
import { createProjectStore } from "./store/project-store.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const env = loadEnv();
const logger = createLogger(env);
const projectsRoot = env.PROJECTS_DIR ?? path.resolve(__dirname, "..", "..", "projects");
const store = createProjectStore(projectsRoot);
const vbeeCredentials =
  env.VBEE_APP_ID && env.VBEE_TOKEN
    ? { appId: env.VBEE_APP_ID, token: env.VBEE_TOKEN, webhookUrl: env.VBEE_WEBHOOK_URL }
    : undefined;

const app = buildApp({ store, loggerInstance: logger, vbeeCredentials });

async function start(): Promise<void> {
  try {
    await app.listen({ port: env.PORT });
  } catch (error) {
    logger.error({ err: error }, "server.start.error");
    process.exit(1);
  }
}

function shutdown(): void {
  app.close().then(
    () => process.exit(0),
    (error: unknown) => {
      logger.error({ err: error }, "server.shutdown.error");
      process.exit(1);
    },
  );
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, shutdown);
}

void start();
