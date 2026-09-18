import { AppError } from "./app-error.ts";

/** Only a `transient` `AppError` is retried (../../.claude/rules/error-handling.md). An
 * unclassified error (not an `AppError` at all) is a bug, not a known transient failure, so it
 * is NOT retried either — retrying an unknown bug would hide it behind a 5-minute backoff
 * instead of surfacing it. */
export function isRetryableError(error: unknown): boolean {
  return error instanceof AppError && error.errorKind === "transient";
}
