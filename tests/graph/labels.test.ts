import { describe, expect, it } from 'vitest';

import { placeLabels, type LabelCandidate } from '../../src/graph/labels';

const box = (
  id: string,
  x: number,
  y: number,
  priority: number,
  width = 60,
  height = 14,
): LabelCandidate => ({ id, x, y, width, height, priority });

describe('placeLabels', () => {
  it('keeps non-overlapping labels', () => {
    const visible = placeLabels([box('a', 0, 0, 10), box('b', 100, 100, 5)]);
    expect(visible).toEqual(new Set(['a', 'b']));
  });

  it('drops the lower-priority label of an overlapping pair', () => {
    const visible = placeLabels([box('small', 10, 5, 100), box('big', 0, 0, 90000)]);
    expect(visible.has('big')).toBe(true);
    expect(visible.has('small')).toBe(false);
  });

  it('a dropped label does not block others below it', () => {
    // c overlaps b; b was dropped for overlapping a — c must still get placed.
    const visible = placeLabels([
      box('a', 0, 0, 300),
      box('b', 30, 0, 200),
      box('c', 95, 0, 100),
    ]);
    expect(visible).toEqual(new Set(['a', 'c']));
  });

  it('respects the enforced gap between touching boxes', () => {
    // Exactly adjacent, zero px apart — inside LABEL_GAP, so one must go.
    const visible = placeLabels([box('a', 0, 0, 10, 60), box('b', 60, 0, 5, 60)]);
    expect(visible.has('a')).toBe(true);
    expect(visible.has('b')).toBe(false);
  });

  it('is deterministic under priority ties', () => {
    const a = placeLabels([box('x', 0, 0, 10), box('y', 10, 0, 10)]);
    const b = placeLabels([box('y', 10, 0, 10), box('x', 0, 0, 10)]);
    expect(a).toEqual(b);
    expect(a.has('x')).toBe(true); // 'x' < 'y'
  });
});
