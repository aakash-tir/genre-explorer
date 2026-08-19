/**
 * Swipe rules for both mobile decks. The tap-vs-swipe threshold is the one that
 * matters most: get it wrong and every attempt to hit a play button skips a slide.
 */
import { describe, expect, it } from 'vitest';

import { SWIPE_THRESHOLD_PX, slideAfterSwipe } from '../../src/mobile/slides';

describe('slideAfterSwipe', () => {
  it('advances when dragged left, the carousel convention', () => {
    expect(slideAfterSwipe(0, 4, -120, 0)).toBe(1);
  });

  it('goes back when dragged right', () => {
    expect(slideAfterSwipe(2, 4, 120, 0)).toBe(1);
  });

  it('ignores a drag too small to be deliberate — that is a tap', () => {
    expect(slideAfterSwipe(1, 4, -(SWIPE_THRESHOLD_PX - 1), 0)).toBe(1);
  });

  it('ignores a mostly-vertical drag so scrolling a track list stays put', () => {
    expect(slideAfterSwipe(1, 4, -60, 400)).toBe(1);
  });

  it('accepts a diagonal that is still clearly horizontal', () => {
    expect(slideAfterSwipe(1, 4, -200, 60)).toBe(2);
  });

  it('clamps at both ends rather than wrapping', () => {
    expect(slideAfterSwipe(0, 4, 200, 0)).toBe(0);
    expect(slideAfterSwipe(3, 4, -200, 0)).toBe(3);
  });

  it('survives a deck that is empty or single-slide', () => {
    expect(slideAfterSwipe(0, 0, -200, 0)).toBe(0);
    expect(slideAfterSwipe(0, 1, -200, 0)).toBe(0);
  });

  it('pulls an out-of-range current index back in', () => {
    // A deck can shrink when a genre with fewer populated lists is picked.
    expect(slideAfterSwipe(9, 3, 0, 0)).toBe(2);
  });
});
