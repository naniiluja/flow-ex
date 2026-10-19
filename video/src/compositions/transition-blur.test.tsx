import React from "react";
import { describe, expect, it } from "vitest";

import { crossZoomPresentation } from "./cross-zoom-presentation.tsx";
import { softFadePresentation } from "./soft-fade-presentation.tsx";

type Direction = "entering" | "exiting";

function filterAt(
  presentation: ReturnType<typeof softFadePresentation>,
  presentationDirection: Direction,
  presentationProgress: number,
): string | undefined {
  const Component = presentation.component as unknown as (
    props: Record<string, unknown>,
  ) => React.ReactElement;
  const element = Component({
    children: null,
    presentationDirection,
    presentationProgress,
    passedProps: {},
  }) as React.ReactElement<{ style: React.CSSProperties }>;
  const filter = element.props.style.filter;
  return typeof filter === "string" ? filter : undefined;
}

const blurPx = (filter: string | undefined): number =>
  Number(/blur\(([\d.]+)px\)/.exec(filter ?? "")?.[1] ?? Number.NaN);

/**
 * Motion-blur softens the hand-off. Regression guard from the same family as the opacity bug:
 * Remotion holds the ENTERING side at `presentationProgress === 1` for the rest of its scene, so
 * its blur must be EXACTLY 0 there or the whole scene stays soft.
 */
describe.each([
  ["crossZoomPresentation", crossZoomPresentation],
  ["softFadePresentation", softFadePresentation],
])("%s blur", (_name, make) => {
  const presentation = make();

  it("leaves the incoming scene perfectly sharp at progress 1", () => {
    expect(blurPx(filterAt(presentation, "entering", 1))).toBe(0);
  });

  it("starts the outgoing scene sharp", () => {
    expect(blurPx(filterAt(presentation, "exiting", 0))).toBe(0);
  });

  it("blurs both scenes mid-transition", () => {
    expect(blurPx(filterAt(presentation, "exiting", 0.5))).toBeGreaterThan(0);
    expect(blurPx(filterAt(presentation, "entering", 0.5))).toBeGreaterThan(0);
  });
});
