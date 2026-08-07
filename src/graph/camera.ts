/**
 * Camera math — world coordinates to screen pixels.
 *
 * The baked `d3-force` coordinates are the resting state and never change (spatial
 * memory is the product). Two transforms compose on top of them, in order:
 *
 *   1. FIT      — a static mapping computed once per canvas size, scaling the whole
 *                 world extent into the viewport. Zoom 1 always means "the entire map".
 *   2. ZOOM     — the live `d3-zoom` transform (scale + pan) driven by the user.
 *
 * Keeping FIT separate from ZOOM is what makes `?zoom=8` in a shared URL mean the same
 * thing on a phone and a desktop: the URL stores only the user's zoom factor, never
 * pixel offsets.
 *
 * Pure functions with no canvas and no d3 imports, so all of it is unit-testable. The
 * live transform is passed in as a plain `{k, x, y}` — structurally compatible with
 * d3-zoom's ZoomTransform.
 */
import type { GenreNode } from '../types';
import { nodeRadius } from './lod';

/** World-unit padding around the layout's bounding box so rim nodes aren't clipped. */
export const FIT_PADDING = 80;

export interface Fit {
  /** World units → viewport pixels at zoom 1. */
  scale: number;
  /** World-space centre of the layout's bounding box. */
  cx: number;
  cy: number;
}

/** The live zoom transform. Same shape as d3-zoom's ZoomTransform. */
export interface CameraTransform {
  k: number;
  x: number;
  y: number;
}

export function computeFit(
  nodes: readonly Pick<GenreNode, 'x' | 'y'>[],
  width: number,
  height: number,
): Fit {
  if (nodes.length === 0 || width <= 0 || height <= 0) {
    return { scale: 1, cx: 0, cy: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }
  const extentX = maxX - minX + FIT_PADDING * 2;
  const extentY = maxY - minY + FIT_PADDING * 2;
  return {
    scale: Math.min(width / extentX, height / extentY),
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

/** World point → screen pixels under the fit and the live transform. */
export function worldToScreen(
  fit: Fit,
  t: CameraTransform,
  wx: number,
  wy: number,
  width: number,
  height: number,
): [number, number] {
  const bx = (wx - fit.cx) * fit.scale + width / 2;
  const by = (wy - fit.cy) * fit.scale + height / 2;
  return [bx * t.k + t.x, by * t.k + t.y];
}

/**
 * On-screen node radius.
 *
 * Grows with the square root of zoom rather than linearly: zooming from 1 to 64 should
 * make a node ~8x bigger, not 64x — linear growth turns family roots into walls of
 * colour long before their subgenres come into view.
 */
export function screenRadius(popularity: number, fit: Fit, zoomK: number): number {
  return nodeRadius(popularity) * fit.scale * Math.sqrt(Math.max(zoomK, 0.01));
}
