/**
 * Swipe → slide index. Pure, because it is the part that decides what you see.
 *
 * Both mobile surfaces are slide decks: the top banner (Filter · Your music) and the
 * bottom sheet (Popular songs · Deeper cuts · Popular artists · Small artists). Their
 * gesture rules are identical, so they share this rather than each growing their own
 * slightly-different threshold.
 */

/**
 * Minimum horizontal travel, in CSS pixels, before a drag counts as a swipe.
 *
 * Below this the gesture is treated as a tap, so tapping a play button or a Spotify
 * link inside a slide never skips the deck. 48px is roughly a thumb's worth of
 * accidental drift — larger than the ~10px a "still" finger wanders, small enough that a
 * deliberate flick always registers.
 */
export const SWIPE_THRESHOLD_PX = 48;

/** Dominance ratio: a gesture must be this much more horizontal than vertical. */
export const SWIPE_HORIZONTAL_RATIO = 1.2;

/**
 * Where a swipe lands.
 *
 * Clamped rather than wrapping — a deck that loops makes "which slide am I on" a
 * guessing game, and the dots exist precisely so position is legible. Vertical-ish
 * gestures return the current index unchanged so scrolling a long track list never
 * changes slide.
 */
export function slideAfterSwipe(
  current: number,
  count: number,
  deltaX: number,
  deltaY: number,
): number {
  if (count <= 0) return 0;
  const last = count - 1;
  const clamp = (n: number) => Math.max(0, Math.min(n, last));
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return clamp(current);
  if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_HORIZONTAL_RATIO) return clamp(current);
  // Dragging left (negative dx) moves FORWARD, the direction of travel on every
  // carousel the user has ever used.
  return clamp(current + (deltaX < 0 ? 1 : -1));
}
