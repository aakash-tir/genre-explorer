/**
 * The radial fan is a rendering transform only — these tests pin the geometry the
 * canvas applies while a genre is focused.
 */
import { describe, expect, it } from 'vitest';

import { fanPositions, fanRadius, FAN_CLEARANCE } from '../../src/graph/fan';
import { nodeRadius } from '../../src/graph/lod';

const focus = { x: 100, y: -50, popularity: 500000 };
const child = (id: string, popularity = 5000) => ({ id, popularity });

describe('fanRadius', () => {
  it('always clears the focused node', () => {
    const r = fanRadius(focus, [child('a')]);
    expect(r).toBeGreaterThanOrEqual(nodeRadius(focus.popularity) * FAN_CLEARANCE);
  });

  it('grows when many children need circumference', () => {
    const few = fanRadius(focus, [child('a'), child('b')]);
    const many = fanRadius(
      focus,
      Array.from({ length: 40 }, (_, i) => child(`c${i}`)),
    );
    expect(many).toBeGreaterThan(few);
  });
});

describe('fanPositions', () => {
  it('places every child on the ring, centred on the focus', () => {
    const children = [child('a'), child('b'), child('c'), child('d')];
    const positions = fanPositions(focus, children);
    const radius = fanRadius(focus, children);
    expect(positions.size).toBe(4);
    for (const p of positions.values()) {
      expect(Math.hypot(p.x - focus.x, p.y - focus.y)).toBeCloseTo(radius);
    }
  });

  it('starts at 12 o’clock and is stable in input order', () => {
    const positions = fanPositions(focus, [child('first'), child('second')]);
    const first = positions.get('first')!;
    expect(first.x).toBeCloseTo(focus.x);
    expect(first.y).toBeLessThan(focus.y); // straight up
    // Two children: second lands opposite, straight down.
    const second = positions.get('second')!;
    expect(second.x).toBeCloseTo(focus.x);
    expect(second.y).toBeGreaterThan(focus.y);
  });

  it('returns an empty map for a childless focus', () => {
    expect(fanPositions(focus, []).size).toBe(0);
  });
});
