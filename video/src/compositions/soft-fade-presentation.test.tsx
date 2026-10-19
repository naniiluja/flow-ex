import React from "react";
import { describe, expect, it } from "vitest";

import { crossZoomPresentation } from "./cross-zoom-presentation.tsx";
import { softFadePresentation } from "./soft-fade-presentation.tsx";

type Direction = "entering" | "exiting";

function styleAt(
  presentation: ReturnType<typeof softFadePresentation>,
  presentationDirection: Direction,
  presentationProgress: number,
): React.CSSProperties {
  const Component = presentation.component;
  const element = Component({
    children: null,
    presentationDirection,
    presentationProgress,
    passedProps: {},
  }) as React.ReactElement<{ style: React.CSSProperties }>;
  return element.props.style;
}

/**
 * Contract matrix for `softFadePresentation()`, the second presentation the composition alternates
 * with (`transition-plan.ts`). Hand-written CSS, like `crossZoomPresentation` — the built-in
 * `@remotion/transitions` presentations that draw through a WebGL2 canvas rendered fully BLACK in
 * this project's headless-Chrome renderer (../../../.claude/rules/video.md).
 *
 * | direction | progress | Expected                                             |
 * | --------- | -------- | ----------------------------------------------------- |
 * | exiting   | 0        | fully opaque                                          |
 * | exiting   | 1        | fully transparent                                     |
 * | entering  | 0        | fully transparent                                     |
 * | entering  | 1        | EXACTLY opaque, never 0.99                            |
 * | entering  | 1        | scale back to exactly 1, no residual transform drift  |
 *
 * The `entering`/progress=1 rows are the regression guard for a bug this project already shipped
 * once: Remotion keeps the entering side wrapped at `presentationProgress === 1` for the REST of
 * that scene, so anything short of full opacity there leaves the whole scene faded, and an
 * inverted sign left it fully black.
 */
describe("softFadePresentation", () => {
  const presentation = softFadePresentation();

  it("holds the outgoing scene fully opaque as the transition starts", () => {
    expect(styleAt(presentation, "exiting", 0).opacity).toBe(1);
  });

  it("fades the outgoing scene out completely by the end", () => {
    expect(styleAt(presentation, "exiting", 1).opacity).toBe(0);
  });

  it("starts the incoming scene invisible", () => {
    expect(styleAt(presentation, "entering", 0).opacity).toBe(0);
  });

  it("reaches EXACTLY full opacity on the incoming scene, which Remotion holds for the rest of it", () => {
    expect(styleAt(presentation, "entering", 1).opacity).toBe(1);
  });

  it("leaves no residual scale on the incoming scene once the transition is over", () => {
    expect(styleAt(presentation, "entering", 1).transform).toBe("perspective(100px) scale(1)");
  });

  it("moves the opposite way from cross-zoom, so the two read as different transitions", () => {
    // cross-zoom pushes the outgoing scene IN (scale grows past 1); this one pulls it BACK.
    const crossZoomExit = styleAt(crossZoomPresentation(), "exiting", 1).transform ?? "";
    const softFadeExit = styleAt(presentation, "exiting", 1).transform ?? "";

    expect(crossZoomExit).not.toBe(softFadeExit);
    expect(scaleOf(crossZoomExit)).toBeGreaterThan(1);
    expect(scaleOf(softFadeExit)).toBeLessThan(1);
  });
});

function scaleOf(transform: string): number {
  return Number(/scale\(([\d.]+)\)/.exec(transform)?.[1] ?? "1");
}
