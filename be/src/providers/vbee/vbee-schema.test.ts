import { describe, expect, it } from "vitest";

import {
  vbeeErrorBodySchema,
  vbeePollingResponseSchema,
  vbeeSubmitResponseSchema,
} from "./vbee-schema.ts";

/**
 * EP/BVA matrix for the Vbee response schemas (../../.claude/rules/vbee-tts.md, verified live).
 *
 * | schema                    | body class                                  | Expected |
 * | --------------------------- | ---------------------------------------------- | ---------- |
 * | vbeeSubmitResponseSchema     | {requestId, status:"PROCESSING"}                | success  |
 * | vbeeSubmitResponseSchema     | status:"COMPLETED" (wrong for a submit response) | error   |
 * | vbeePollingResponseSchema    | {requestId, status:"PROCESSING"}                | success  |
 * | vbeePollingResponseSchema    | {requestId, status:"COMPLETED", audioLink}       | success  |
 * | vbeePollingResponseSchema    | status:"COMPLETED" missing audioLink             | error   |
 * | vbeeErrorBodySchema           | {error:{code,message}}                          | success  |
 * | vbeeErrorBodySchema           | off-contract shape                              | error   |
 */
describe("vbeeSubmitResponseSchema", () => {
  it("accepts a real submit success body", () => {
    const result = vbeeSubmitResponseSchema.safeParse({
      requestId: "req-1",
      status: "PROCESSING",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a status other than PROCESSING", () => {
    const result = vbeeSubmitResponseSchema.safeParse({ requestId: "req-1", status: "COMPLETED" });
    expect(result.success).toBe(false);
  });
});

describe("vbeePollingResponseSchema", () => {
  it("accepts a PROCESSING poll response", () => {
    const result = vbeePollingResponseSchema.safeParse({
      requestId: "req-1",
      status: "PROCESSING",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a COMPLETED poll response with audioLink", () => {
    const result = vbeePollingResponseSchema.safeParse({
      requestId: "req-1",
      status: "COMPLETED",
      audioLink: "https://vbee.vn/s/req-1/abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a COMPLETED poll response missing audioLink", () => {
    const result = vbeePollingResponseSchema.safeParse({ requestId: "req-1", status: "COMPLETED" });
    expect(result.success).toBe(false);
  });
});

describe("vbeeErrorBodySchema", () => {
  it("accepts Vbee's documented error envelope", () => {
    const result = vbeeErrorBodySchema.safeParse({
      error: { code: "BAD_REQUEST", message: "Request is not found" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an off-contract body", () => {
    const result = vbeeErrorBodySchema.safeParse({ message: "Route not found", statusCode: 404 });
    expect(result.success).toBe(false);
  });
});
