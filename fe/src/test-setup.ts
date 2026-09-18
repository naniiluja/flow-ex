import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom (the test environment) has no EventSource implementation. A benign no-op stub is enough
// for any page test that merely MOUNTS a component using `useProjectEvents` without exercising
// its SSE behavior; use-project-events.test.ts supplies a fully controllable fake for the tests
// that actually assert on scene/log event handling.
class InertEventSource {
  readonly url: string;
  readonly addEventListener = vi.fn();
  readonly removeEventListener = vi.fn();
  readonly close = vi.fn();

  constructor(url: string | URL) {
    this.url = String(url);
  }
}
vi.stubGlobal("EventSource", InertEventSource);

// jsdom has no `matchMedia` implementation either; the shadcn sidebar's `useIsMobile` hook
// (fe/src/hooks/use-mobile.ts) calls it on every mount, so any test mounting `AppShell` (or
// anything nested in a `SidebarProvider`) needs this benign stub, same reasoning as EventSource
// above — no test here exercises real responsive behavior.
vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

afterEach(() => {
  cleanup();
});
