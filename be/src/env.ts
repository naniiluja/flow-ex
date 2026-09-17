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
  CHROME_CDP_PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : 9222))
    .pipe(z.number().int().positive()),
  // Overrides Chrome's executable path (default: the standard macOS Google Chrome.app location);
  // needed on Linux/Windows or a non-standard install, not part of the documented default setup.
  // Transforms "" to undefined: chrome-connection.ts uses `??` (only null/undefined fall back to
  // the default), and `.env.example` ships this key present but empty, which `??` alone would
  // treat as "explicitly set to an empty path" and pass straight to `spawn("")`.
  CHROME_EXECUTABLE_PATH: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  // Explicit opt-in for the real FlowImageProvider (task 005): unlike Vbee, Flow has no
  // credential whose mere presence can signal "use the real one" (CHROME_USER_DATA_DIR always
  // has a default), so this flag is the actual switch. Defaults to "fake" so local dev/tests never
  // accidentally spawn a real Chrome window expecting a logged-in Flow session.
  FLOW_IMAGE_PROVIDER: z.enum(["fake", "real"]).optional().default("fake"),
  // Explicit opt-in for the real WhisperTranscriptionProvider (task 007), same rationale as
  // FLOW_IMAGE_PROVIDER above: defaults to "fake" so local dev/tests never trigger a real
  // whisper.cpp install/model download just by starting the server.
  TRANSCRIBE_PROVIDER: z.enum(["fake", "whisper"]).optional().default("fake"),
  // A MULTILINGUAL model (no ".en" suffix, video.md's Captions rule) — "small" balances size
  // (~466MB) against transcription quality/speed for a localhost tool.
  WHISPER_MODEL: z
    .enum(["tiny", "base", "small", "medium", "large-v1", "large-v2", "large-v3", "large-v3-turbo"])
    .optional()
    .default("small"),
  WHISPER_CPP_VERSION: z.string().optional().default("1.5.5"),
  // Where the whisper.cpp binary + downloaded model are cached (shared across every
  // project/request, ../.claude/rules/data-layer.md's per-project projects/ folder is NOT the
  // right place for a large binary/model that has nothing to do with any one project).
  WHISPER_CACHE_DIR: z.string().optional().default("./.whisper-cache"),
  // Overrides where project.json files live; used by tests/local runs, not documented as a
  // user-facing knob because the default (repo-root `projects/`) is what the app ships with.
  PROJECTS_DIR: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
