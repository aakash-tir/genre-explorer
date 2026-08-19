/**
 * The bottom sheet's drag-to-collapse rule. Pure, so the thresholds are testable.
 *
 * The sheet used to be a horizontally swipeable deck. On a real phone that read as
 * broken: mid-gesture the whole sheet — heading, tab row, track list — slid sideways
 * together, so "DEEPER CUTS" showed as "PER CUTS" and "Spotify" as "fy". Horizontal
 * motion was the wrong axis for a surface anchored to the bottom edge; the tabs already
 * switch content, and they do it without moving anything.
 *
 * So the sheet moves on the axis it is anchored to instead: drag DOWN to get it out of
 * the way, drag UP from its top edge to bring it back.
 */

/**
 * Minimum vertical travel, in CSS pixels, before a drag changes the sheet's state.
 *
 * Deliberately larger than the deck's horizontal threshold: this gesture starts on the
 * sheet's header, right where a thumb rests while reading, so accidental drift must not
 * dismiss what you are looking at.
 */
export const SHEET_DRAG_THRESHOLD_PX = 56;

/** Dominance ratio — the drag must be this much more vertical than horizontal. */
export const SHEET_VERTICAL_RATIO = 1.2;

/**
 * Whether the sheet ends up collapsed.
 *
 * Idempotent by design: dragging down on an already-collapsed sheet leaves it
 * collapsed rather than toggling, so a repeated gesture never fights the user. A drag
 * too small, or too sideways, changes nothing.
 */
export function sheetAfterDrag(
  collapsed: boolean,
  deltaX: number,
  deltaY: number,
): boolean {
  if (Math.abs(deltaY) < SHEET_DRAG_THRESHOLD_PX) return collapsed;
  if (Math.abs(deltaY) < Math.abs(deltaX) * SHEET_VERTICAL_RATIO) return collapsed;
  // Screen y grows downward, so a positive delta is a downward drag.
  return deltaY > 0;
}
