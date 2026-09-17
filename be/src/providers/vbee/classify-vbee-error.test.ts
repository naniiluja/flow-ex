import { describe, expect, it } from "vitest";

import { classifyVbeeHttpError, isRequestNotFound } from "./classify-vbee-error.ts";

/**
 * Decision table for `classifyVbeeHttpError({status, rawBody})`
 * (../../.claude/rules/vbee-tts.md's error-code table).
 *
 * | status | rawBody                                          | Expected errorKind |
 * | -------- | --------------------------------------------------- | --------------------- |
 * | 401      | HTML (nginx), not JSON                                | needs_user            |
 * | 401      | valid JSON error body (still unauthorized)             | needs_user            |
 * | 400      | {error:{message:"insufficient credit"}}                 | needs_user            |
 * | 400      | {error:{message:"unknown voiceCode"}}                    | fatal                 |
 * | 400      | {error:{message:"CREDIT low"}} (case-insensitive match)   | needs_user            |
 * | 429      | {error:{code:"TTS_CCR_MAX_LIMIT_REACHED",...}}             | transient             |
 * | 500      | {error:{code:"TTS_SPEND_CREDITS_FAILED",...}}               | transient             |
 * | 502      | non-JSON body (e.g. a gateway error page)                    | transient             |
 */
describe("classifyVbeeHttpError", () => {
  it("classifies a 401 with an HTML (non-JSON) body as needs_user", () => {
    const error = classifyVbeeHttpError({ status: 401, rawBody: "<html>401 Unauthorized</html>" });
    expect(error.errorKind).toBe("needs_user");
  });

  it("classifies a 401 with a valid JSON body as needs_user", () => {
    const error = classifyVbeeHttpError({
      status: 401,
      rawBody: JSON.stringify({ error: { code: "UNAUTHORIZED", message: "bad token" } }),
    });
    expect(error.errorKind).toBe("needs_user");
  });

  it("classifies a 400 whose message concerns credit as needs_user", () => {
    const error = classifyVbeeHttpError({
      status: 400,
      rawBody: JSON.stringify({ error: { code: "BAD_REQUEST", message: "insufficient credit" } }),
    });
    expect(error.errorKind).toBe("needs_user");
  });

  it("classifies a 400 for an unrelated reason (bad voiceCode) as fatal", () => {
    const error = classifyVbeeHttpError({
      status: 400,
      rawBody: JSON.stringify({ error: { code: "BAD_REQUEST", message: "unknown voiceCode" } }),
    });
    expect(error.errorKind).toBe("fatal");
  });

  it("matches the credit keyword case-insensitively", () => {
    const error = classifyVbeeHttpError({
      status: 400,
      rawBody: JSON.stringify({ error: { code: "BAD_REQUEST", message: "CREDIT low" } }),
    });
    expect(error.errorKind).toBe("needs_user");
  });

  it("classifies a 429 as transient", () => {
    const error = classifyVbeeHttpError({
      status: 429,
      rawBody: JSON.stringify({
        error: { code: "TTS_CCR_MAX_LIMIT_REACHED", message: "too many" },
      }),
    });
    expect(error.errorKind).toBe("transient");
  });

  it("classifies a 500 as transient", () => {
    const error = classifyVbeeHttpError({
      status: 500,
      rawBody: JSON.stringify({ error: { code: "TTS_SPEND_CREDITS_FAILED", message: "internal" } }),
    });
    expect(error.errorKind).toBe("transient");
  });

  it("classifies a non-JSON body on a non-401 status as transient", () => {
    const error = classifyVbeeHttpError({ status: 502, rawBody: "<html>Bad Gateway</html>" });
    expect(error.errorKind).toBe("transient");
  });
});

/**
 * EP/BVA matrix for `isRequestNotFound({status, rawBody})`.
 *
 * | status | rawBody                                                | Expected |
 * | -------- | ----------------------------------------------------------- | ---------- |
 * | 400      | {error:{code:"BAD_REQUEST",message:"Request is not found"}}   | true       |
 * | 400      | {error:{code:"BAD_REQUEST",message:"unknown voiceCode"}}        | false     |
 * | 404      | same "Request is not found" message but wrong status            | false     |
 * | 400      | non-JSON body                                                     | false     |
 */
describe("isRequestNotFound", () => {
  it("recognizes Vbee's exact 'Request is not found' 400 body", () => {
    const result = isRequestNotFound({
      status: 400,
      rawBody: JSON.stringify({ error: { code: "BAD_REQUEST", message: "Request is not found" } }),
    });
    expect(result).toBe(true);
  });

  it("returns false for a different 400 message", () => {
    const result = isRequestNotFound({
      status: 400,
      rawBody: JSON.stringify({ error: { code: "BAD_REQUEST", message: "unknown voiceCode" } }),
    });
    expect(result).toBe(false);
  });

  it("returns false when the status is not 400, even with the same message", () => {
    const result = isRequestNotFound({
      status: 404,
      rawBody: JSON.stringify({ error: { code: "NOT_FOUND", message: "Request is not found" } }),
    });
    expect(result).toBe(false);
  });

  it("returns false for a non-JSON body", () => {
    expect(isRequestNotFound({ status: 400, rawBody: "not json" })).toBe(false);
  });
});
