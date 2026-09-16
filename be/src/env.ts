import { z } from "zod";

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 3001))
    .pipe(z.number().int().positive()),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VBEE_APP_ID: z.string().optional(),
  VBEE_TOKEN: z.string().optional(),
  VBEE_WEBHOOK_URL: z.string().optional().default("https://vbee-callback.invalid/noop"),
  CHROME_USER_DATA_DIR: z.string().optional().default("./chrome-profile"),
  // Overrides where project.json files live; used by tests/local runs, not documented as a
  // user-facing knob because the default (repo-root `projects/`) is what the app ships with.
  PROJECTS_DIR: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
