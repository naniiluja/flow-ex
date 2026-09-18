/** Hand-written retry scheduler (see ../../.claude/rules/tech-stack.md for why `p-retry`'s
 * `minTimeout * factor^n` model cannot express a fixed 30s/2m/5m schedule). */
export interface RetryScheduleOptions {
  /** Delay (ms) before each retry, in order. Length = max retry count (not counting the
   * initial attempt): `[30_000, 120_000, 300_000]` means 1 initial attempt + up to 3 retries. */
  scheduleMs: readonly number[];
  /** Applied to each scheduled delay (e.g. add jitter) before waiting. */
  jitter: (delayMs: number) => number;
  /** Whether a thrown error should be retried at all (see ../domain/should-retry.ts). */
  shouldRetry: (error: unknown) => boolean;
  signal?: AbortSignal;
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("retryWithSchedule: aborted", { cause: signal.reason });
}

function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(abortReason(signal));
  }
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal ? abortReason(signal) : new Error("retryWithSchedule: aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Runs `task` once, then retries per `options.scheduleMs` (with `options.jitter` applied to each
 * delay) as long as `options.shouldRetry(error)` is true and the schedule is not exhausted.
 * Rethrows the LAST error once the schedule runs out or `shouldRetry` returns false.
 */
export async function retryWithSchedule<T>(
  task: () => Promise<T>,
  options: RetryScheduleOptions,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    options.signal?.throwIfAborted();
    try {
      return await task();
    } catch (error) {
      const baseDelayMs = options.scheduleMs[attempt];
      if (baseDelayMs === undefined || !options.shouldRetry(error)) {
        throw error;
      }
      attempt += 1;
      await sleep(options.jitter(baseDelayMs), options.signal);
    }
  }
}
