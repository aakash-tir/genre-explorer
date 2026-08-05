/**
 * Colour — hue by genre family, gradient by depth.
 *
 * From the original plan: "use different colors for different genre. Maybe use gradients
 * for the different subgenre based on how far away it is from the original."
 *
 * The model:
 *   - HUE comes from the top-level family (`rock`, `electronic`, `jazz`, ...), spread
 *     evenly around the wheel so neighbouring families are visually distinct.
 *   - DEPTH desaturates and lightens. A family root is deep and vivid; a
 *     third-generation subgenre is pale and washed out, so you can read distance from the
 *     root at a glance without any labels.
 *
 * Works in HSL because the depth ramp is a straight interpolation of two channels, which
 * is exactly what HSL is good at. The canvas renderer turns these into radial gradients;
 * this module only decides the colours.
 *
 * Pure functions, no canvas — so the ramp can be unit-tested rather than eyeballed.
 */

export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–100 */
  s: number;
  /** 0–100 */
  l: number;
}

/**
 * Hue for a family, derived from its id.
 *
 * Uses the golden-angle sequence rather than the raw hash, so families added later still
 * land far from existing hues instead of colliding. The hash only decides the *position*
 * in the sequence; the sequence itself guarantees the spread.
 */
export const GOLDEN_ANGLE = 137.508;

export function familyHue(familyId: string): number {
  let hash = 0;
  for (let i = 0; i < familyId.length; i += 1) {
    hash = (hash * 31 + familyId.charCodeAt(i)) % 100000;
  }
  return (hash * GOLDEN_ANGLE) % 360;
}

/**
 * Depth at which the ramp bottoms out. Beyond this, colours stop fading — MusicBrainz
 * hierarchies occasionally run deep, and without a floor those nodes would be invisible
 * against the background.
 */
export const MAX_RAMP_DEPTH = 4;

export const ROOT_SATURATION = 78;
export const LEAF_SATURATION = 34;
export const ROOT_LIGHTNESS = 52;
export const LEAF_LIGHTNESS = 76;

/** The colour of a genre node: family hue, depth-faded. */
export function genreColor(familyId: string, depth: number): Hsl {
  const clampedDepth = Math.max(0, Math.min(depth, MAX_RAMP_DEPTH));
  const t = clampedDepth / MAX_RAMP_DEPTH;
  return {
    h: familyHue(familyId),
    s: ROOT_SATURATION + (LEAF_SATURATION - ROOT_SATURATION) * t,
    l: ROOT_LIGHTNESS + (LEAF_LIGHTNESS - ROOT_LIGHTNESS) * t,
  };
}

export function toCss({ h, s, l }: Hsl, alpha = 1): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  return alpha >= 1
    ? `hsl(${round(h)} ${round(s)}% ${round(l)}%)`
    : `hsl(${round(h)} ${round(s)}% ${round(l)}% / ${round(alpha)})`;
}

/**
 * The two stops of a node's radial gradient: a brighter core fading to the node's own
 * colour at the rim. This is what gives nodes depth on a dark background instead of
 * reading as flat discs.
 */
export interface GradientStops {
  inner: string;
  outer: string;
}

export const CORE_LIGHTNESS_BOOST = 16;

export function nodeGradient(familyId: string, depth: number): GradientStops {
  const base = genreColor(familyId, depth);
  return {
    inner: toCss({ ...base, l: Math.min(base.l + CORE_LIGHTNESS_BOOST, 96) }),
    outer: toCss(base),
  };
}

/** Structural edges are drawn in the child's colour, dimmed — they read as lineage. */
export const EDGE_ALPHA = 0.28;

export function edgeColor(familyId: string, depth: number): string {
  return toCss(genreColor(familyId, depth), EDGE_ALPHA);
}
