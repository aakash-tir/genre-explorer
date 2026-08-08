/**
 * Level of detail — what is on screen at a given zoom, focus and filter.
 *
 * From the original plan: "not all the nodes need to be shown at once. eg when zoomed out
 * just show the big ones, when clicked on zoom into that category", and "when a node is
 * clicked and zoomed in [...] still show some sub nodes if any with the titles".
 *
 * Three inputs decide it:
 *
 *   1. ZOOM      — a node must clear a popularity cutoff that falls as you zoom in.
 *   2. FOCUS     — the focused genre and its children are ALWAYS visible, whatever the
 *                  zoom cutoff says. This is the "still show some sub nodes" rule.
 *   3. FILTER    — if the filter panel has a selection, everything outside the selected
 *                  genres and their structural descendants is hidden outright. The filter
 *                  is a hard gate: it overrides focus.
 *
 * Labels have their own, stricter threshold — a genre can be a visible speck before it
 * has earned a name.
 *
 * Pure functions. No canvas, no React. The render loop calls these; it does not contain
 * them.
 */
import type { GenreNode } from '../types';
import { focusChildren, structuralDescendants } from './edges';
import type { GenreEdge } from '../types';

export interface LodState {
  /** d3-zoom scale. 1 = fully zoomed out, larger = closer in. */
  zoom: number;
  /** The currently focused genre id, or null. */
  focusId: string | null;
  /** Genre ids selected in the filter panel. Empty = no filtering. */
  selectedIds: readonly string[];
}

/**
 * Popularity a node must clear to be drawn at a given zoom, on a log scale.
 *
 * Popularity spans five orders of magnitude (rock: 547,091 · vaporwave: 15,981 · the
 * pipeline's cutoff: 50), so this works in log10 space. At zoom 1 only genres with 10^5
 * (100,000) tagged release-groups are drawn — a handful of family roots. The exponent
 * falls linearly with log2(zoom) and reaches 0 at {@link FULL_DETAIL_ZOOM}, where
 * everything is visible.
 *
 * These two constants are the main tuning knobs for how the map feels. Raising
 * MIN_VISIBLE_EXPONENT makes the overview sparser; raising FULL_DETAIL_ZOOM makes the
 * reveal slower and the descent feel longer.
 */
export const MIN_VISIBLE_EXPONENT = 4.3;
export const FULL_DETAIL_ZOOM = 64;

export function popularityCutoff(zoom: number): number {
  const clamped = Math.max(1, Math.min(zoom, FULL_DETAIL_ZOOM));
  // log2(zoom) runs 0 → 5 across the zoom range; scale that onto the exponent range.
  const progress = Math.log2(clamped) / Math.log2(FULL_DETAIL_ZOOM);
  const exponent = MIN_VISIBLE_EXPONENT * (1 - progress);
  return Math.pow(10, exponent);
}

/** Nodes need to be roughly this zoomed-in, relative to their own cutoff, to get a label. */
export const LABEL_ZOOM_MULTIPLIER = 2;

/**
 * Resolve the filter selection into the full set of ids the filter permits.
 *
 * Selecting `techno` keeps `melodic techno` and everything structurally below it, per the
 * plan: "hide everything else that is not the the selected genre or sub genre to it."
 * Returns `null` when nothing is selected, meaning "no filtering" — distinct from an
 * empty set, which would mean "hide everything".
 */
export function resolveFilter(
  selectedIds: readonly string[],
  edges: readonly GenreEdge[],
): Set<string> | null {
  if (selectedIds.length === 0) return null;
  const allowed = new Set<string>();
  for (const id of selectedIds) {
    for (const descendant of structuralDescendants(id, edges)) {
      allowed.add(descendant);
    }
  }
  return allowed;
}

/**
 * The ids kept visible by focus regardless of zoom: the focused genre itself plus its
 * structural AND associative children.
 *
 * Associative children are included on purpose — that is how a fusion genre appears under
 * each of its parents in turn without any edge being drawn. See `edges.ts`.
 */
export function focusSet(
  focusId: string | null,
  edges: readonly GenreEdge[],
): Set<string> {
  if (focusId === null) return new Set();
  return new Set([focusId, ...focusChildren(focusId, edges)]);
}

export interface VisibilityContext {
  cutoff: number;
  focused: Set<string>;
  /** `null` means no filter is active. */
  allowed: Set<string> | null;
}

/** Build the context once per frame rather than recomputing it per node. */
export function visibilityContext(
  state: LodState,
  edges: readonly GenreEdge[],
): VisibilityContext {
  return {
    cutoff: popularityCutoff(state.zoom),
    focused: focusSet(state.focusId, edges),
    allowed: resolveFilter(state.selectedIds, edges),
  };
}

export function isNodeVisible(node: GenreNode, context: VisibilityContext): boolean {
  // The filter is a hard gate and overrides everything, including focus.
  if (context.allowed !== null && !context.allowed.has(node.id)) return false;
  if (context.focused.has(node.id)) return true;
  return node.popularity >= context.cutoff;
}

/**
 * Labels are stricter than dots. Exceptions, both about orientation:
 *   - a focused node and its children are always labelled (the plan wants sub-node
 *     titles readable once you've zoomed into a genre);
 *   - FAMILY ROOTS are always labelled while visible — they are the landmarks the
 *     whole map is navigated by, and an unlabelled landmark is just a dot.
 */
export function isLabelVisible(node: GenreNode, context: VisibilityContext): boolean {
  if (!isNodeVisible(node, context)) return false;
  if (context.focused.has(node.id)) return true;
  if (node.depth === 0) return true;
  return node.popularity >= context.cutoff * LABEL_ZOOM_MULTIPLIER;
}

export function visibleNodes(
  nodes: readonly GenreNode[],
  context: VisibilityContext,
): GenreNode[] {
  return nodes.filter((node) => isNodeVisible(node, context));
}

/**
 * Node radius in world units, log-scaled.
 *
 * `rock` (547,091) and `vaporwave` (15,981) differ by 34x in popularity but should differ
 * by roughly 2x on screen. Linear scaling makes the map unreadable.
 */
export const MIN_RADIUS = 3;
export const MAX_RADIUS = 44;

export function nodeRadius(popularity: number): number {
  const scaled = Math.log10(Math.max(popularity, 1) + 1) / 6;
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.min(scaled, 1);
}
