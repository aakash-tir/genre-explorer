/**
 * Camera math — the world→screen mapping that makes `?zoom=8` mean the same view on
 * every screen size. Pure functions; the canvas just applies them.
 */
import { describe, expect, it } from 'vitest';

import {
  computeFit,
  FIT_PADDING,
  screenRadius,
  worldToScreen,
} from '../../src/graph/camera';

const IDENTITY = { k: 1, x: 0, y: 0 };

describe('computeFit', () => {
  it('scales the whole world extent into the viewport', () => {
    const nodes = [
      { x: -100, y: -50 },
      { x: 100, y: 50 },
    ];
    const fit = computeFit(nodes, 800, 600);
    expect(fit.cx).toBe(0);
    expect(fit.cy).toBe(0);
    // Width is the binding constraint: 800 / (200 + 2 * padding).
    expect(fit.scale).toBeCloseTo(800 / (200 + FIT_PADDING * 2));
    // Every node lands inside the viewport at zoom 1.
    for (const node of nodes) {
      const [sx, sy] = worldToScreen(fit, IDENTITY, node.x, node.y, 800, 600);
      expect(sx).toBeGreaterThanOrEqual(0);
      expect(sx).toBeLessThanOrEqual(800);
      expect(sy).toBeGreaterThanOrEqual(0);
      expect(sy).toBeLessThanOrEqual(600);
    }
  });

  it('centres the bounding box, not the origin', () => {
    const fit = computeFit(
      [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
      800,
      600,
    );
    expect(fit.cx).toBe(200);
    expect(fit.cy).toBe(150);
    const [sx, sy] = worldToScreen(fit, IDENTITY, 200, 150, 800, 600);
    expect(sx).toBeCloseTo(400);
    expect(sy).toBeCloseTo(300);
  });

  it('degrades safely on empty input', () => {
    expect(computeFit([], 800, 600)).toEqual({ scale: 1, cx: 0, cy: 0 });
    expect(computeFit([{ x: 1, y: 1 }], 0, 0)).toEqual({ scale: 1, cx: 0, cy: 0 });
  });
});

describe('worldToScreen', () => {
  it('applies the live transform after the fit', () => {
    const fit = { scale: 1, cx: 0, cy: 0 };
    // Zooming 2x about the origin doubles distances from the transform's own origin.
    const [sx, sy] = worldToScreen(fit, { k: 2, x: 10, y: -10 }, 50, 0, 200, 200);
    // base = (50 + 100) = 150 → 150 * 2 + 10 = 310; y: 100 * 2 - 10 = 190.
    expect(sx).toBe(310);
    expect(sy).toBe(190);
  });
});

describe('screenRadius', () => {
  const fit = { scale: 0.4, cx: 0, cy: 0 };

  it('is monotonic in popularity', () => {
    expect(screenRadius(500000, fit, 1)).toBeGreaterThan(screenRadius(500, fit, 1));
  });

  it('grows sublinearly with zoom', () => {
    const atOne = screenRadius(10000, fit, 1);
    const atSixtyFour = screenRadius(10000, fit, 64);
    expect(atSixtyFour).toBeCloseTo(atOne * 8); // sqrt(64), not 64
  });
});
