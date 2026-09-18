import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { retryWithSchedule } from "./retry-with-schedule.ts";

const SCHEDULE_MS = [30_000, 120_000, 300_000] as const;
const noJitter = (delayMs: number): number => delayMs;
const alwaysRetry = (): boolean => true;
const neverRetry = (): boolean => false;

/**
 * Contract-level EP/BVA matrix for `retryWithSchedule(task, options)`.
 *
 * | task behavior                | shouldRetry | signal          | Expected                                  |
 * | ----------------------------- | ----------- | ---------------- | ------------------------------------------ |
 * | succeeds on 1st call           | n/a         | none             | resolves, no delay, jitter never called    |
 * | fails 2x then succeeds         | true        | none             | resolves, delays = schedule[0], schedule[1]|
 * | fails schedule.length+1 times  | true        | none             | rejects with the LAST error (boundary: exhausted) |
 * | fails once                     | false       | none             | rejects immediately, no delay (boundary: 0 retries) |
 * | fails once                     | true        | already aborted  | rejects with abort reason, task called once |
 * | fails once                     | true        | aborted mid-sleep| rejects with abort reason                  |
 */
describe("retryWithSchedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves on the first successful call, without ever calling jitter", async () => {
    const jitter = vi.fn(noJitter);
    const task = vi.fn().mockResolvedValue("ok");

    const result = await retryWithSchedule(task, {
      scheduleMs: SCHEDULE_MS,
      jitter,
      shouldRetry: alwaysRetry,
    });

    expect(result).toBe("ok");
    expect(task).toHaveBeenCalledTimes(1);
    expect(jitter).not.toHaveBeenCalled();
  });

  it("retries with the exact scheduled delays until the task succeeds", async () => {
    const jitter = vi.fn(noJitter);
    const task = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom 1"))
      .mockRejectedValueOnce(new Error("boom 2"))
      .mockResolvedValueOnce("ok");

    const promise = retryWithSchedule(task, {
      scheduleMs: SCHEDULE_MS,
      jitter,
      shouldRetry: alwaysRetry,
    });

    await vi.advanceTimersByTimeAsync(SCHEDULE_MS[0]);
    await vi.advanceTimersByTimeAsync(SCHEDULE_MS[1]);
    await expect(promise).resolves.toBe("ok");

    expect(task).toHaveBeenCalledTimes(3);
    expect(jitter).toHaveBeenNthCalledWith(1, SCHEDULE_MS[0]);
    expect(jitter).toHaveBeenNthCalledWith(2, SCHEDULE_MS[1]);
  });

  it("rejects with the last error once the schedule is exhausted (boundary: schedule.length + 1 failures)", async () => {
    const errors = [new Error("e1"), new Error("e2"), new Error("e3"), new Error("e4 final")];
    const task = vi
      .fn()
      .mockRejectedValueOnce(errors[0])
      .mockRejectedValueOnce(errors[1])
      .mockRejectedValueOnce(errors[2])
      .mockRejectedValueOnce(errors[3]);

    const promise = retryWithSchedule(task, {
      scheduleMs: SCHEDULE_MS,
      jitter: noJitter,
      shouldRetry: alwaysRetry,
    });
    const assertion = expect(promise).rejects.toBe(errors[3]);

    await vi.advanceTimersByTimeAsync(SCHEDULE_MS[0]);
    await vi.advanceTimersByTimeAsync(SCHEDULE_MS[1]);
    await vi.advanceTimersByTimeAsync(SCHEDULE_MS[2]);
    await assertion;

    // 1 initial attempt + exactly 3 retries (schedule.length), never a 4th retry.
    expect(task).toHaveBeenCalledTimes(4);
  });

  it("rejects immediately with no delay when shouldRetry returns false (boundary: 0 retries)", async () => {
    const error = new Error("fatal, do not retry");
    const task = vi.fn().mockRejectedValue(error);

    await expect(
      retryWithSchedule(task, {
        scheduleMs: SCHEDULE_MS,
        jitter: noJitter,
        shouldRetry: neverRetry,
      }),
    ).rejects.toBe(error);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("rejects with the abort reason and never calls the task when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("cancelled up front"));
    const task = vi.fn().mockResolvedValue("should not run");

    await expect(
      retryWithSchedule(task, {
        scheduleMs: SCHEDULE_MS,
        jitter: noJitter,
        shouldRetry: alwaysRetry,
        signal: controller.signal,
      }),
    ).rejects.toThrow("cancelled up front");
    expect(task).not.toHaveBeenCalled();
  });

  it("rejects with the abort reason when the signal aborts while waiting between retries", async () => {
    const controller = new AbortController();
    const task = vi.fn().mockRejectedValue(new Error("transient"));

    const promise = retryWithSchedule(task, {
      scheduleMs: SCHEDULE_MS,
      jitter: noJitter,
      shouldRetry: alwaysRetry,
      signal: controller.signal,
    });
    const assertion = expect(promise).rejects.toThrow("cancelled mid-wait");

    controller.abort(new Error("cancelled mid-wait"));
    await assertion;
    expect(task).toHaveBeenCalledTimes(1);
  });
});
