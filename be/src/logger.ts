import pino from "pino";

import type { Env } from "./env.ts";

/** Root logger: redact set once here, never overridden on a child (see ../../.claude/rules/logging.md). */
export function createLogger(env: Pick<Env, "LOG_LEVEL" | "NODE_ENV">): pino.Logger {
  return pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        'req.headers["app-id"]',
        "*.authorization",
        "*.appId",
        "*.VBEE_TOKEN",
        "*.audioLink",
      ],
      censor: "[redacted]",
    },
    transport:
      env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss" },
          },
  });
}
