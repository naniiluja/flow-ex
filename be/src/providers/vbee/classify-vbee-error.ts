import { AppError } from "../../domain/app-error.ts";
import { vbeeErrorBodySchema } from "./vbee-schema.ts";

export interface VbeeHttpFailure {
  status: number;
  /** The raw response text — Vbee returns an HTML body (not JSON) on a 401
   * (../../.claude/rules/vbee-tts.md), so this must be classified before assuming JSON. */
  rawBody: string;
}

function isCreditRelatedMessage(message: string): boolean {
  return message.toLowerCase().includes("credit");
}

/**
 * Classifies an HTTP failure from either the submit (`POST /v1/tts`) or poll
 * (`GET /v1/tts/requests/:id`) endpoint into an `AppError` per the table in
 * `../../.claude/rules/vbee-tts.md`:
 * - `401` (any body shape, including Vbee's own HTML) -> `needs_user`.
 * - `400` whose message concerns insufficient credit -> `needs_user`; any other `400` -> `fatal`.
 * - Everything else (`429`, `5xx`, an unexpected status, or a non-JSON body on a non-401 status)
 *   -> `transient`, retried per `error-handling.md`'s schedule.
 */
export function classifyVbeeHttpError(failure: VbeeHttpFailure): AppError {
  if (failure.status === 401) {
    return new AppError({
      code: "VBEE_UNAUTHORIZED",
      errorKind: "needs_user",
      message: "Vbee rejected the request as unauthorized (invalid or expired token)",
      context: { status: failure.status },
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(failure.rawBody) as unknown;
  } catch {
    parsedBody = undefined;
  }
  const errorBody = vbeeErrorBodySchema.safeParse(parsedBody);
  const message = errorBody.success ? errorBody.data.error.message : failure.rawBody;
  const vbeeCode = errorBody.success ? errorBody.data.error.code : "VBEE_UNKNOWN_ERROR";

  if (failure.status === 400) {
    if (isCreditRelatedMessage(message)) {
      return new AppError({
        code: "VBEE_NO_CREDIT",
        errorKind: "needs_user",
        message,
        context: { status: failure.status, vbeeCode },
      });
    }
    return new AppError({
      code: "VBEE_BAD_REQUEST",
      errorKind: "fatal",
      message,
      context: { status: failure.status, vbeeCode },
    });
  }

  return new AppError({
    code: "VBEE_TRANSIENT_ERROR",
    errorKind: "transient",
    message: `Vbee request failed with HTTP ${String(failure.status)}: ${message}`,
    context: { status: failure.status, vbeeCode },
  });
}

/** Vbee's own "Request is not found" 400 body (returned by the poll endpoint for an unknown or
 * expired requestId) is NOT an error to surface — it signals "submit a fresh request" instead. */
export function isRequestNotFound(failure: VbeeHttpFailure): boolean {
  if (failure.status !== 400) {
    return false;
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(failure.rawBody) as unknown;
  } catch {
    return false;
  }
  const errorBody = vbeeErrorBodySchema.safeParse(parsedBody);
  return errorBody.success && errorBody.data.error.message === "Request is not found";
}
