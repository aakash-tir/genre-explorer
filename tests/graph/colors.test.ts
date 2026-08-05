import { describe, expect, it } from 'vitest';
import {
  LEAF_LIGHTNESS,
  LEAF_SATURATION,
  MAX_RAMP_DEPTH,
  ROOT_LIGHTNESS,
  ROOT_SATURATION,
  edgeColor,
  familyHue,
  genreColor,
  nodeGradient,
  toCss,
} from '../../src/graph/colors';

describe('familyHue', () => {
  it('is deterministic', () => {
    expect(familyHue('rock')).toBe(familyHue('rock'));
  });

  it('gives different families different hues', () => {
    const hues = ['rock', 'electronic', 'jazz', 'hip hop', 'folk'].map(familyHue);
    expect(new Set(hues).size).toBe(hues.length);
  });

  it('stays on the wheel', () => {
    for (const family of ['rock', 'electronic', 'jazz', '', 'a-very-long-genre-name']) {
      const hue = familyHue(family);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });
});

describe('genreColor depth ramp', () => {
  it('is vivid at the root', () => {
    const root = genreColor('rock', 0);
    expect(root.s).toBe(ROOT_SATURATION);
    expect(root.l).toBe(ROOT_LIGHTNESS);
  });

  it('fades and lightens with depth', () => {
    // "use gradients for the different subgenre based on how far away it is from the
    // original"
    const depths = [0, 1, 2, 3, 4].map((d) => genreColor('rock', d));
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i].s).toBeLessThan(depths[i - 1].s);
      expect(depths[i].l).toBeGreaterThan(depths[i - 1].l);
    }
  });

  it('keeps the hue fixed within a family', () => {
    const hue = familyHue('electronic');
    for (const depth of [0, 1, 2, 3, 4, 9]) {
      expect(genreColor('electronic', depth).h).toBe(hue);
    }
  });

  it('bottoms out past the ramp depth so deep genres stay visible', () => {
    const floor = genreColor('rock', MAX_RAMP_DEPTH);
    expect(genreColor('rock', MAX_RAMP_DEPTH + 5)).toEqual(floor);
    expect(floor.s).toBe(LEAF_SATURATION);
    expect(floor.l).toBe(LEAF_LIGHTNESS);
  });

  it('treats a negative depth as the root rather than overshooting', () => {
    expect(genreColor('rock', -3)).toEqual(genreColor('rock', 0));
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
    const { inner, outer } = nodeGradient('rock', 0);
    expect(inner).not.toBe(outer);
    const lightness = (css: string) => Number(/(\d+(?:\.\d+)?)%\)/.exec(css)?.[1]);
    expect(lightness(inner)).toBeGreaterThan(lightness(outer));
  });

  it('never blows past white on an already-pale deep genre', () => {
    const { inner } = nodeGradient('rock', 9);
    const lightness = Number(/(\d+(?:\.\d+)?)%\)/.exec(inner)?.[1]);
    expect(lightness).toBeLessThanOrEqual(96);
  });
});

describe('edgeColor', () => {
  it('is translucent so lineage reads as background structure', () => {
    expect(edgeColor('rock', 1)).toContain('/');
  });
});
