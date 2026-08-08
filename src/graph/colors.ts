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
 * Family hues are assigned by POPULARITY RANK around the golden-angle sequence, not
 * by hashing the name: hashing put rock and electronic — the two biggest families on
 * the map — on nearly the same magenta (found live in milestone 3). Ranking
 * guarantees the biggest families, which dominate the screen, sit far apart on the
 * wheel; ties break on family id so a refresh with identical data keeps its colours.
 *
 * Singleton families (131 of the 179 roots are lone nodes with no tree connections)
 * get NO hue — they render in a shared muted neutral instead of burning 131 distinct
 * hues nobody could tell apart. `genreColor(null, …)` is that neutral.
 */
export const GOLDEN_ANGLE = 137.508;

/** The muted slate-violet used for singleton families. */
export const NEUTRAL_HUE = 250;
export const NEUTRAL_SATURATION = 10;

export function assignFamilyHues(
  nodes: readonly { family: string; popularity: number }[],
): Map<string, number> {
  const sizes = new Map<string, { count: number; popularity: number }>();
  for (const node of nodes) {
    const entry = sizes.get(node.family) ?? { count: 0, popularity: 0 };
    entry.count += 1;
    entry.popularity += node.popularity;
    sizes.set(node.family, entry);
  }
  const ranked = [...sizes.entries()]
    .filter(([, entry]) => entry.count >= 2)
    .sort((a, b) => b[1].popularity - a[1].popularity || a[0].localeCompare(b[0]));
  return new Map(ranked.map(([family], rank) => [family, (rank * GOLDEN_ANGLE) % 360]));
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

/**
 * The colour of a genre node: family hue, depth-faded. `hue === null` means a
 * singleton family — the shared muted neutral.
 */
export function genreColor(hue: number | null, depth: number): Hsl {
  const clampedDepth = Math.max(0, Math.min(depth, MAX_RAMP_DEPTH));
  const t = clampedDepth / MAX_RAMP_DEPTH;
  const saturation =
    hue === null
      ? NEUTRAL_SATURATION
      : ROOT_SATURATION + (LEAF_SATURATION - ROOT_SATURATION) * t;
  return {
    h: hue ?? NEUTRAL_HUE,
    s: saturation,
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

export function nodeGradient(hue: number | null, depth: number): GradientStops {
  const base = genreColor(hue, depth);
  return {
    inner: toCss({ ...base, l: Math.min(base.l + CORE_LIGHTNESS_BOOST, 96) }),
    outer: toCss(base),
  };
}

/** Structural edges are drawn in the child's colour, dimmed — they read as lineage. */
export const EDGE_ALPHA = 0.28;

export function edgeColor(hue: number | null, depth: number): string {
  return toCss(genreColor(hue, depth), EDGE_ALPHA);
}
