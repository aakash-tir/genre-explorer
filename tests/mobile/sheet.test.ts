/**
 * Drag-to-collapse. The gesture starts on the sheet header, exactly where a thumb
 * rests while reading, so the threshold has to tolerate drift without dismissing what
 * the user is looking at.
 */
import { describe, expect, it } from 'vitest';

import { SHEET_DRAG_THRESHOLD_PX, sheetAfterDrag } from '../../src/mobile/sheet';

const EXPANDED = false;
const COLLAPSED = true;

describe('sheetAfterDrag', () => {
  it('collapses on a decisive drag down', () => {
    expect(sheetAfterDrag(EXPANDED, 0, 120)).toBe(true);
  });

  it('expands on a decisive drag up', () => {
    expect(sheetAfterDrag(COLLAPSED, 0, -120)).toBe(false);
  });

  it('ignores drift below the threshold — a thumb resting is not a gesture', () => {
    expect(sheetAfterDrag(EXPANDED, 0, SHEET_DRAG_THRESHOLD_PX - 1)).toBe(EXPANDED);
    expect(sheetAfterDrag(COLLAPSED, 0, -(SHEET_DRAG_THRESHOLD_PX - 1))).toBe(COLLAPSED);
  });

  it('ignores a mostly-horizontal drag', () => {
    expect(sheetAfterDrag(EXPANDED, 300, 60)).toBe(EXPANDED);
  });

  it('accepts a diagonal that is still clearly vertical', () => {
    expect(sheetAfterDrag(EXPANDED, 40, 200)).toBe(true);
  });

  it('is idempotent — repeating a gesture never fights the user', () => {
    expect(sheetAfterDrag(COLLAPSED, 0, 200)).toBe(true);
    expect(sheetAfterDrag(EXPANDED, 0, -200)).toBe(false);
  });

  it('has a threshold larger than the horizontal deck swipe', async () => {
    // The sheet gesture starts under a resting thumb; the deck's does not.
    const { SWIPE_THRESHOLD_PX } = await import('../../src/mobile/slides');
    expect(SHEET_DRAG_THRESHOLD_PX).toBeGreaterThan(SWIPE_THRESHOLD_PX);
  });
});
