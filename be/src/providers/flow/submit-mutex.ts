/** Task 014: guards ONLY the shared-page-mutation part of a Flow submission (agent-mode toggle,
 * aspect-ratio overlay, typing into the ONE shared `.ProseMirror` editor, and the generate click
 * that reads the tile list) so two scenes running concurrently on the SAME `Page`
 * (`../../.claude/rules/flow-automation.md`'s connection reuse) never interleave their own typing
 * or misread the tile list mid-click. The ~25-30s decode wait after a submission is released
 * happens OUTSIDE this mutex — see `flow-automation.ts`'s `submitImage`/`waitForImageAtTile`. A
 * plain promise-chain mutex (no external dependency) is enough: `p-queue` (already a project
 * dependency) is reserved for the IMAGE-STEP concurrency limiter in `pipeline-engine.ts`, a
 * separate concern from this per-page critical section. */
export interface SubmitMutex {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}

export function createSubmitMutex(): SubmitMutex {
  let tail: Promise<unknown> = Promise.resolve();

  function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    // Chains onto the tail regardless of whether the PREVIOUS holder resolved or rejected — a
    // failed submission must still release the lock for the next scene, never leave it stuck.
    const result = tail.then(fn, fn);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { runExclusive };
}
