/**
 * Stage 7 — bake the force layout into the dataset.
 *
 * Runs at build time so the browser never simulates: the map must be IDENTICAL on
 * every visit or spatial memory breaks. Two things make the output deterministic:
 *
 *   - a seeded random source (`d3-force` calls it for initial jiggle and collision
 *     tie-breaks; the default is `Math.random`, which would move the map every build)
 *   - a fixed tick count instead of running to alpha-convergence
 *
 * Same input graph → byte-identical coordinates, so a weekly refresh with no upstream
 * changes produces an empty diff.
 *
 * SHAPE (redesigned after the first UI review — the plain force layout scattered
 * unrelated genres uniformly and the overview read as random dots):
 *
 *   - Each multi-node FAMILY gets an anchor on a ring around the origin, angles from
 *     the golden-angle sequence in popularity-rank order (matching the hue
 *     assignment in `src/graph/colors.ts`, so neighbouring clusters differ in hue
 *     too). Members are pulled toward their family's anchor — families become
 *     visible constellations of one colour.
 *   - SINGLETON families (no tree connections) are pushed to an outer halo, out of
 *     the way of the constellations — a rim of "everything else" instead of noise
 *     between the clusters.
 *   - Collision radii reserve room for on-screen growth and labels: the renderer
 *     grows radii ~2.1x by deep zoom (k^0.35), so the layout keeps nodes ~2.2x
 *     apart, which is what stops the overlap seen in the first version.
 */
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';

import type { GenreEdge, GenreNode } from '../../src/types';
import { GOLDEN_ANGLE } from '../../src/graph/colors';
import { nodeRadius } from '../../src/graph/lod';

import type { UnplacedNode } from './build-graph';

const TICKS = 300;

/** Radius of the ring family anchors sit on. */
const FAMILY_RING_RADIUS = 620;

/** Radius of the halo where singleton genres live. */
const HALO_RADIUS = 1150;

/** Collision spacing multiplier — reserves room for on-screen radius growth. */
const COLLIDE_SCALE = 2.2;
const COLLIDE_PADDING = 8;

/** mulberry32 — tiny, seedable, good enough for layout jiggle. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Anchor {
  x: number;
  y: number;
  strength: number;
}

/**
 * Anchor per node. Multi-node families ring the centre in popularity-rank order
 * (the same order the hue wheel uses); singletons sit on the outer halo, spread by
 * their position in a name-sorted list so the result is deterministic.
 */
export function computeAnchors(nodes: readonly UnplacedNode[]): Map<string, Anchor> {
  const totals = new Map<string, { count: number; popularity: number }>();
  for (const node of nodes) {
    const entry = totals.get(node.family) ?? { count: 0, popularity: 0 };
    entry.count += 1;
    entry.popularity += node.popularity;
    totals.set(node.family, entry);
  }

  const families = [...totals.entries()]
    .filter(([, t]) => t.count >= 2)
    .sort((a, b) => b[1].popularity - a[1].popularity || a[0].localeCompare(b[0]));
  const familyAnchor = new Map<string, { x: number; y: number }>();
  families.forEach(([family], rank) => {
    const angle = ((rank * GOLDEN_ANGLE) % 360) * (Math.PI / 180);
    familyAnchor.set(family, {
      x: FAMILY_RING_RADIUS * Math.cos(angle),
      y: FAMILY_RING_RADIUS * Math.sin(angle),
    });
  });

  const singletons = nodes
    .filter((node) => !familyAnchor.has(node.family))
    .map((node) => node.id)
    .sort();
  const haloIndex = new Map(singletons.map((id, index) => [id, index]));

  const anchors = new Map<string, Anchor>();
  for (const node of nodes) {
    const family = familyAnchor.get(node.family);
    if (family) {
      anchors.set(node.id, { ...family, strength: 0.06 });
    } else {
      const index = haloIndex.get(node.id) ?? 0;
      const angle = (index / Math.max(singletons.length, 1)) * 2 * Math.PI;
      anchors.set(node.id, {
        x: HALO_RADIUS * Math.cos(angle),
        y: HALO_RADIUS * Math.sin(angle),
        // Firmer: singletons have no links pulling them anywhere sensible.
        strength: 0.14,
      });
    }
  }
  return anchors;
}

export function layoutGraph(
  nodes: readonly UnplacedNode[],
  edges: readonly GenreEdge[],
): GenreNode[] {
  interface SimNode extends UnplacedNode {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
  }
  const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
  const byId = new Map(simNodes.map((n) => [n.id, n]));
  const anchors = computeAnchors(nodes);

  // Only the drawn tree shapes the layout. Fusion/influence edges pull unrelated
  // families together and turn the constellation into a hairball.
  const links = edges
    .filter((e) => e.kind === 'subgenre')
    .map((e) => ({ source: e.source, target: e.target }));

  const simulation = forceSimulation(simNodes)
    .randomSource(seededRandom(0x67656e72)) // "genr"
    .force(
      'link',
      forceLink(links)
        .id((n) => (n as SimNode).id)
        .distance(46)
        .strength(0.5),
    )
    .force('charge', forceManyBody().strength(-30))
    .force(
      'collide',
      forceCollide<SimNode>()
        .radius((n) => nodeRadius(n.popularity) * COLLIDE_SCALE + COLLIDE_PADDING)
        .iterations(2),
    )
    .force(
      'anchorX',
      forceX<SimNode>((n) => anchors.get(n.id)?.x ?? 0).strength(
        (n) => anchors.get(n.id)?.strength ?? 0.05,
      ),
    )
    .force(
      'anchorY',
      forceY<SimNode>((n) => anchors.get(n.id)?.y ?? 0).strength(
        (n) => anchors.get(n.id)?.strength ?? 0.05,
      ),
    )
    .stop();

  for (let i = 0; i < TICKS; i++) simulation.tick();

  return nodes.map((n) => {
    const placed = byId.get(n.id) as SimNode;
    return {
      ...n,
      // Two decimals is ~0.3% of a node radius and keeps graph.json well under budget.
      x: Math.round((placed.x as number) * 100) / 100,
      y: Math.round((placed.y as number) * 100) / 100,
    };
  });
}
