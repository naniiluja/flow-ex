import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the REAL `remotion` module's `delayRender`/`continueRender` (not a hand-rolled stand-in) —
// per this task's explicit instruction, a test that only reads the font module's return value
// would not catch the original bug (loadFont's `waitUntilDone` promise silently discarded), since
// the return value looks identical whether the render is actually delayed or not.
const delayRenderMock = vi.fn<(label?: string) => number>();
const continueRenderMock = vi.fn<(handle: number) => void>();
vi.mock("remotion", () => ({
  delayRender: delayRenderMock,
  continueRender: continueRenderMock,
}));

let nextHandle = 0;
let waitUntilDoneImpl: () => Promise<undefined> = () => Promise.resolve(undefined);
const loadFontMock = vi.fn(() => ({
  fontFamily: "Be Vietnam Pro",
  fonts: {},
  unicodeRanges: {},
  waitUntilDone: waitUntilDoneImpl,
}));
vi.mock("@remotion/google-fonts/BeVietnamPro", () => ({
  loadFont: (...args: unknown[]) => loadFontMock(...(args as [])),
}));

beforeEach(() => {
  vi.resetModules();
  delayRenderMock.mockReset();
  continueRenderMock.mockReset();
  loadFontMock.mockClear();
  nextHandle = 0;
  delayRenderMock.mockImplementation(() => {
    nextHandle += 1;
    return nextHandle;
  });
  waitUntilDoneImpl = () => Promise.resolve(undefined);
});

/**
 * Contract-level EP/BVA matrix for `loadCaptionFont(options)`:
 *
 * | weight (class)      | subsets (class)              | calls | Expected                                   |
 * | ------------------- | ----------------------------- | ----- | ------------------------------------------- |
 * | valid ("800")        | default (includes vietnamese)  | 1     | success; delayRender+continueRender paired  |
 * | invalid ("999")       | default                        | 1     | throws                                      |
 * | valid ("800")         | missing "vietnamese" ([])       | 1     | throws                                      |
 * | valid ("800")         | default                        | 2 (same args) | delayRender called only ONCE (cached) |
 */
describe("loadCaptionFont", () => {
  it("delays the render and continues it with the SAME handle once the font resolves (valid weight)", async () => {
    const { loadCaptionFont } = await import("./font.ts");

    let resolveWait: (() => void) | undefined;
    waitUntilDoneImpl = () =>
      new Promise((resolve) => {
        resolveWait = () => {
          resolve(undefined);
        };
      });

    const result = loadCaptionFont({ weight: "800", subsets: ["vietnamese"] });

    expect(result.fontFamily).toBe("Be Vietnam Pro");
    expect(delayRenderMock).toHaveBeenCalledTimes(1);
    expect(continueRenderMock).not.toHaveBeenCalled();

    const handle = delayRenderMock.mock.results[0]?.value as number;
    resolveWait?.();
    // Let the microtask queue drain so the `.then`/`.finally` chain in font.ts runs.
    await Promise.resolve();
    await Promise.resolve();

    expect(continueRenderMock).toHaveBeenCalledTimes(1);
    expect(continueRenderMock).toHaveBeenCalledWith(handle);
  });

  it("rejects an unsupported font weight (invalid class, boundary of the allowed set)", async () => {
    const { loadCaptionFont } = await import("./font.ts");

    expect(() =>
      loadCaptionFont({ weight: "999" as unknown as "800", subsets: ["vietnamese"] }),
    ).toThrow();
    expect(delayRenderMock).not.toHaveBeenCalled();
  });

  it("rejects subsets missing the required 'vietnamese' entry (missing-subset class)", async () => {
    const { loadCaptionFont } = await import("./font.ts");

    expect(() => loadCaptionFont({ weight: "800", subsets: [] })).toThrow(/vietnamese/i);
    expect(delayRenderMock).not.toHaveBeenCalled();
  });

  it("caches by (weight, subsets): a second call with the same options does not delayRender again", async () => {
    const { loadCaptionFont } = await import("./font.ts");

    const first = loadCaptionFont({ weight: "800", subsets: ["vietnamese"] });
    const second = loadCaptionFont({ weight: "800", subsets: ["vietnamese"] });

    expect(second).toBe(first);
    expect(delayRenderMock).toHaveBeenCalledTimes(1);
    expect(loadFontMock).toHaveBeenCalledTimes(1);
  });
});
