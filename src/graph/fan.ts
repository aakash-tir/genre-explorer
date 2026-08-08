/**
 * The radial fan — where a focused genre's children sit while focus is held.
 *
 * From the original plan: clicking a genre zooms to it and its children fan out
 * around it with labels. This is a RENDERING TRANSFORM ONLY: the baked layout never
 * changes, and releasing focus lets every child fall back to its resting position.
 * That rule is why this module returns an override map instead of mutating nodes.
 *
 * Pure functions in world coordinates; the canvas applies them.
 */
import type { GenreNode } from '../types';
import { nodeRadius } from './lod';

export interface WorldPosition {
  x: number;
  y: number;
}

/** Breathing room between fanned siblings, in world units. */
export const FAN_GAP = 10;

/** The ring must clear the focused node by at least this factor of its radius. */
export const FAN_CLEARANCE = 2.2;

/**
 * Ring radius that fits every child without overlap: either the focused node's
 * clearance or the circumference the children need, whichever is larger.
 */
export function fanRadius(
  focus: Pick<GenreNode, 'popularity'>,
  children: readonly Pick<GenreNode, 'popularity'>[],
): number {
  const clearance = nodeRadius(focus.popularity) * FAN_CLEARANCE;
  const needed =
    children.reduce((sum, child) => sum + 2 * nodeRadius(child.popularity) + FAN_GAP, 0) /
    (2 * Math.PI);
  return Math.max(clearance, needed);
}

/**
 * Nodes that are neither the focus nor its children but sit INSIDE the fan ring
 * get displaced just outside it while focus is held — same contract as the fan
 * itself: a rendering transform only, everything falls back on release. Without
 * this, unrelated genres squat in the middle of the ring and the exploration view
 * is noise exactly where the user is looking (image 3 of the UI review).
 */
export const CLEARANCE_MARGIN = 1.25;

export function ringClearance(
  focus: Pick<GenreNode, 'x' | 'y' | 'popularity'>,
  ringRadius: number,
  bystanders: readonly Pick<GenreNode, 'id' | 'x' | 'y'>[],
): Map<string, WorldPosition> {
  const displaced = new Map<string, WorldPosition>();
  const clearTo = ringRadius * CLEARANCE_MARGIN;
  bystanders.forEach((node, index) => {
    const dx = node.x - focus.x;
    const dy = node.y - focus.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= clearTo) return;
    // Push outward along the existing bearing; a node exactly on the focus gets a
    // deterministic bearing from its list position instead of NaN.
    const angle =
      distance === 0
        ? (index / Math.max(bystanders.length, 1)) * 2 * Math.PI
        : Math.atan2(dy, dx);
    displaced.set(node.id, {
      x: focus.x + clearTo * Math.cos(angle),
      y: focus.y + clearTo * Math.sin(angle),
    });
  });
  return displaced;
}

/**
 * World positions for the fanned children, evenly spaced on the ring, starting at
 * 12 o'clock and proceeding clockwise in the order given. The order comes from
 * `focusChildren` (structural first, then associative, dataset order), which is
 * already stable — so the fan never reshuffles between renders.
 */
export function fanPositions(
  focus: Pick<GenreNode, 'x' | 'y' | 'popularity'>,
  children: readonly Pick<GenreNode, 'id' | 'popularity'>[],
): Map<string, WorldPosition> {
  const positions = new Map<string, WorldPosition>();
  if (children.length === 0) return positions;
  const radius = fanRadius(focus, children);
  const step = (2 * Math.PI) / children.length;
  children.forEach((child, index) => {
    const angle = -Math.PI / 2 + index * step;
    positions.set(child.id, {
      x: focus.x + radius * Math.cos(angle),
      y: focus.y + radius * Math.sin(angle),
    });
  });
  return positions;
}
