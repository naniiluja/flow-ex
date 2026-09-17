export type FakeEventSourceListener = (event: MessageEvent<string>) => void;

/** A controllable stand-in for the browser's `EventSource`, shared by every test that needs to
 * drive `useProjectEvents`'s actual SSE-handling logic (as opposed to `fe/src/test-setup.ts`'s
 * `InertEventSource`, which only exists so unrelated page tests don't crash on mount). */
export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  closed = false;
  private readonly listeners = new Map<string, FakeEventSourceListener[]>();

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: FakeEventSourceListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(): void {
    // Not needed by any test using this fake so far.
  }

  close(): void {
    this.closed = true;
  }

  /** `raw` is written directly, unparsed, to the frame's `data` field — lets a test send a
   * deliberately malformed frame (missing field, bad enum value) to exercise validation. */
  emitRaw(type: string, raw: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: raw } as MessageEvent<string>);
    }
  }

  emit(type: string, data: unknown): void {
    this.emitRaw(type, JSON.stringify(data));
  }
}
