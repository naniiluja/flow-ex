import { describe, expect, it } from "vitest";

import { loadEnv } from "./env.ts";

const base = { VBEE_APP_ID: undefined, VBEE_TOKEN: undefined } as NodeJS.ProcessEnv;

describe("loadEnv", () => {
  // EP/BVA matrix on PORT: absent -> default; "0" (boundary, positive() rejects 0);
  // "-1" (invalid); "abc" (Number() -> NaN, rejected); "3001" (valid).
  it("defaults PORT to 3001 when absent", () => {
    expect(loadEnv(base).PORT).toBe(3001);
  });

  it("rejects PORT=0 (boundary: positive() excludes zero)", () => {
    expect(() => loadEnv({ ...base, PORT: "0" })).toThrow();
  });

  it("rejects a negative PORT", () => {
    expect(() => loadEnv({ ...base, PORT: "-1" })).toThrow();
  });

  it("rejects a non-numeric PORT", () => {
    expect(() => loadEnv({ ...base, PORT: "abc" })).toThrow();
  });

  it("accepts a valid PORT", () => {
    expect(loadEnv({ ...base, PORT: "3099" }).PORT).toBe(3099);
  });

  it("defaults LOG_LEVEL to info and NODE_ENV to development", () => {
    const env = loadEnv(base);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects an unknown LOG_LEVEL", () => {
    expect(() => loadEnv({ ...base, LOG_LEVEL: "verbose" })).toThrow();
  });

  it("defaults VBEE_WEBHOOK_URL to the .invalid callback", () => {
    expect(loadEnv(base).VBEE_WEBHOOK_URL).toBe("https://vbee-callback.invalid/noop");
  });
});
