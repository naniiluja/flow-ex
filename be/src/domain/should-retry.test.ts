import { describe, expect, it } from "vitest";

import { AppError } from "./app-error.ts";
import { isRetryableError } from "./should-retry.ts";

/**
 * Decision table for `isRetryableError(error)` (../../.claude/rules/error-handling.md: "Retry
 * only transient errors with backoff; never retry needs_user or fatal").
 *
 * | error                                  | Expected |
 * | --------------------------------------- | -------- |
 * | AppError, errorKind: transient          | true     |
 * | AppError, errorKind: needs_user         | false    |
 * | AppError, errorKind: fatal              | false    |
 * | a plain Error (not an AppError, a bug)  | false    |
 * | a non-Error thrown value (string)       | false    |
 */
describe("isRetryableError", () => {
  it("retries a transient AppError", () => {
    const error = new AppError({ code: "X", errorKind: "transient", message: "flaky" });
    expect(isRetryableError(error)).toBe(true);
  });

  it("does not retry a needs_user AppError", () => {
    const error = new AppError({ code: "X", errorKind: "needs_user", message: "log in again" });
    expect(isRetryableError(error)).toBe(false);
  });

  it("does not retry a fatal AppError", () => {
    const error = new AppError({ code: "X", errorKind: "fatal", message: "bad input" });
    expect(isRetryableError(error)).toBe(false);
  });

  it("does not retry a plain Error (an unclassified bug, not a domain error)", () => {
    expect(isRetryableError(new TypeError("undefined is not a function"))).toBe(false);
  });

  it("does not retry a non-Error thrown value", () => {
    expect(isRetryableError("just a string throw")).toBe(false);
  });
});
