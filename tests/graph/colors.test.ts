import { describe, expect, it } from 'vitest';
import {
  GOLDEN_ANGLE,
  LEAF_LIGHTNESS,
  LEAF_SATURATION,
  MAX_RAMP_DEPTH,
  NEUTRAL_HUE,
  NEUTRAL_SATURATION,
  ROOT_LIGHTNESS,
  ROOT_SATURATION,
  assignFamilyHues,
  edgeColor,
  genreColor,
  nodeGradient,
  toCss,
} from '../../src/graph/colors';

function nodes(...families: [string, number, number][]) {
  // [family, memberCount, popularityPerMember]
  return families.flatMap(([family, count, popularity]) =>
    Array.from({ length: count }, () => ({ family, popularity })),
  );
}

describe('assignFamilyHues', () => {
  it('ranks multi-node families by total popularity around the golden angle', () => {
    const hues = assignFamilyHues(
      nodes(['electronic', 3, 100000], ['rock', 2, 120000], ['jazz', 2, 50000]),
    );
    // electronic: 300k > rock: 240k > jazz: 100k.
    expect(hues.get('electronic')).toBe(0);
    expect(hues.get('rock')).toBeCloseTo(GOLDEN_ANGLE % 360);
    expect(hues.get('jazz')).toBeCloseTo((2 * GOLDEN_ANGLE) % 360);
  });

  it('keeps the biggest families far apart — the rock/electronic regression', () => {
    const hues = assignFamilyHues(nodes(['electronic', 5, 100000], ['rock', 5, 90000]));
    const gap = Math.abs(hues.get('electronic')! - hues.get('rock')!);
    expect(Math.min(gap, 360 - gap)).toBeGreaterThan(60);
  });

  it('gives singleton families no hue at all', () => {
    const hues = assignFamilyHues(nodes(['rock', 2, 1000], ['acholitronix', 1, 60]));
    expect(hues.has('acholitronix')).toBe(false);
    expect(hues.has('rock')).toBe(true);
  });

  it('is deterministic under popularity ties via family id ordering', () => {
    const a = assignFamilyHues(nodes(['b-fam', 2, 500], ['a-fam', 2, 500]));
    expect(a.get('a-fam')).toBe(0);
    expect(a.get('b-fam')).toBeCloseTo(GOLDEN_ANGLE % 360);
  });
});

describe('genreColor depth ramp', () => {
  it('is vivid at the root', () => {
    const root = genreColor(120, 0);
    expect(root.h).toBe(120);
    expect(root.s).toBe(ROOT_SATURATION);
    expect(root.l).toBe(ROOT_LIGHTNESS);
  });

  it('fades and lightens with depth', () => {
    const depths = [0, 1, 2, 3, 4].map((d) => genreColor(120, d));
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i].s).toBeLessThan(depths[i - 1].s);
      expect(depths[i].l).toBeGreaterThan(depths[i - 1].l);
    }
  });

  it('keeps the hue fixed within a family', () => {
    for (const depth of [0, 1, 2, 3, 4, 9]) {
      expect(genreColor(211, depth).h).toBe(211);
    }
  });

  it('bottoms out past the ramp depth so deep genres stay visible', () => {
    const floor = genreColor(120, MAX_RAMP_DEPTH);
    expect(genreColor(120, MAX_RAMP_DEPTH + 5)).toEqual(floor);
    expect(floor.s).toBe(LEAF_SATURATION);
    expect(floor.l).toBe(LEAF_LIGHTNESS);
  });

  it('treats a negative depth as the root rather than overshooting', () => {
    expect(genreColor(120, -3)).toEqual(genreColor(120, 0));
  });

  it('renders singletons in the shared muted neutral, still depth-lightened', () => {
    const neutral = genreColor(null, 0);
    expect(neutral.h).toBe(NEUTRAL_HUE);
    expect(neutral.s).toBe(NEUTRAL_SATURATION);
    expect(genreColor(null, 3).l).toBeGreaterThan(neutral.l);
    expect(genreColor(null, 3).s).toBe(NEUTRAL_SATURATION);
  });
});

describe('css output', () => {
  it('emits modern hsl syntax', () => {
    expect(toCss({ h: 200, s: 50, l: 40 })).toBe('hsl(200 50% 40%)');
  });

  it('includes alpha when it is not opaque', () => {
    expect(toCss({ h: 200, s: 50, l: 40 }, 0.25)).toBe('hsl(200 50% 40% / 0.25)');
  });

  it('rounds so the canvas is not handed 14 decimal places', () => {
    expect(toCss({ h: 1 / 3, s: 50, l: 40 })).toBe('hsl(0.33 50% 40%)');
  });
});

describe('nodeGradient', () => {
  it('has a brighter core than rim, which is what gives nodes depth', () => {
    const { inner, outer } = nodeGradient(120, 0);
    expect(inner).not.toBe(outer);
    const lightness = (css: string) => Number(/(\d+(?:\.\d+)?)%\)/.exec(css)?.[1]);
    expect(lightness(inner)).toBeGreaterThan(lightness(outer));
  });

  it('never blows past white on an already-pale deep genre', () => {
    const { inner } = nodeGradient(120, 9);
    const lightness = Number(/(\d+(?:\.\d+)?)%\)/.exec(inner)?.[1]);
    expect(lightness).toBeLessThanOrEqual(96);
  });
});

describe('edgeColor', () => {
  it('is translucent so lineage reads as background structure', () => {
    expect(edgeColor(120, 1)).toContain('/');
  });
});
