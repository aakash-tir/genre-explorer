/**
 * Stage 7 — bake the force layout into the dataset.
 *
 * Runs at build time so the browser never simulates: the map must be IDENTICAL on every
 * visit or spatial memory breaks. Two things make the output deterministic:
 *
 *   - a seeded random source (`d3-force` calls it for initial jiggle and collision
 *     tie-breaks; the default is `Math.random`, which would move the map every build)
 *   - a fixed tick count instead of running to alpha-convergence
 *
 * Same input graph → byte-identical coordinates, so a weekly refresh with no upstream
 * changes produces an empty diff.
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

import type { UnplacedNode } from './build-graph';

const TICKS = 300;

/** Node radius used for collision — mirrors the renderer's log scale. */
function radius(popularity: number): number {
  return 4 + Math.log10(Math.max(popularity, 1)) * 3;
}

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
        .distance(30)
        .strength(0.6),
    )
    .force('charge', forceManyBody().strength(-40))
    .force(
      'collide',
      forceCollide<SimNode>().radius((n) => radius(n.popularity) + 2),
    )
    .force('x', forceX(0).strength(0.03))
    .force('y', forceY(0).strength(0.03))
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
