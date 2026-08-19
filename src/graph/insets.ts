/**
 * Where the camera should aim when chrome floats OVER the canvas.
 *
 * On mobile the canvas is full-bleed and the top banner and bottom sheet sit on top of
 * it, so the canvas keeps reporting the full screen height while a good part of it is
 * hidden. Every "centre the node" calculation that used `height / 2` was therefore
 * aiming at a point behind the sheet — exactly what the 2026-08-19 phone screenshots
 * showed, with the focused genre tucked under the panel edge.
 *
 * Separate module from `camera.ts` on purpose: that one maps world coordinates to
 * screen pixels and knows nothing about UI chrome. This one is only about which part of
 * the screen the user can actually see. Both are pure and unit-tested.
 */

/** How much chrome covers the canvas at each edge, in CSS pixels. */
export interface Insets {
  top: number;
  bottom: number;
}

export const NO_INSETS: Insets = { top: 0, bottom: 0 };

export interface Size {
  width: number;
  height: number;
}

/**
 * The screen point a focused node should land on.
 *
 * Clamped: if chrome somehow claims the whole height (a short viewport with banner and
 * sheet both open), fall back to the geometric centre rather than aiming off-screen.
 */
export function visibleCenter(size: Size, insets: Insets): { x: number; y: number } {
  const free = size.height - insets.top - insets.bottom;
  if (free <= 0) return { x: size.width / 2, y: size.height / 2 };
  return { x: size.width / 2, y: insets.top + free / 2 };
}

/** Height of the uncovered strip, floored at 1 so it is never a zero divisor. */
export function visibleHeight(size: Size, insets: Insets): number {
  return Math.max(1, size.height - insets.top - insets.bottom);
}

/**
 * How to re-frame when chrome opens or closes.
 *
 * The brief: opening the banner should keep showing "exactly what was shown earlier but
 * smaller". So the world point under the old visible centre moves to the new visible
 * centre, and the scale shrinks by the ratio of visible heights — the same content,
 * refitted into the smaller strip.
 *
 * Returns the scale multiplier and both centres; the caller turns those into a d3
 * transform. Keeping it pure means the ratio is testable without a canvas.
 */
export function reframe(
  size: Size,
  from: Insets,
  to: Insets,
): {
  scale: number;
  fromCenter: { x: number; y: number };
  toCenter: { x: number; y: number };
} {
  return {
    scale: visibleHeight(size, to) / visibleHeight(size, from),
    fromCenter: visibleCenter(size, from),
    toCenter: visibleCenter(size, to),
  };
}
