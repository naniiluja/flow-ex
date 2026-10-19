/** Peak blur (px) mid-transition. Small enough to read as motion softness, not an out-of-focus shot. */
const PEAK_BLUR_PX = 6;

/** CSS `filter` for a transition side: sharp at both ends of the progress range, softest in the
 * middle, shared by both presentations (DRY). Rounded to 2 decimals so the resting state is the
 * exact string `blur(0px)` rather than a float-error exponent like `1.2e-16`, which would be both
 * invalid CSS and a leftover blur on the whole entering scene. */
export function transitionBlurFilter(presentationProgress: number): string {
  const px = Math.round(Math.sin(presentationProgress * Math.PI) * PEAK_BLUR_PX * 100) / 100;
  return `blur(${String(Math.max(0, px))}px)`;
}
