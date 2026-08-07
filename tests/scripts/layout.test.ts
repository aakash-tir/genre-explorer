/**
 * The layout's one hard requirement: DETERMINISM. Baked coordinates are the product's
 * spatial-memory promise — the same input graph must produce byte-identical output on
 * every machine, every build, or the weekly refresh moves the map under people's feet.
 */
import { describe, expect, it } from 'vitest';

import type { UnplacedNode } from '../../scripts/build-dataset/build-graph';
import { layoutGraph } from '../../scripts/build-dataset/layout';
import type { GenreEdge } from '../../src/types';

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const nodes: UnplacedNode[] = [
  { id: 'rock', mbid: M(1), name: 'rock', popularity: 500000, depth: 0, family: 'rock' },
  {
    id: 'grunge',
    mbid: M(2),
    name: 'grunge',
    popularity: 7000,
    depth: 1,
    family: 'rock',
  },
  { id: 'jazz', mbid: M(3), name: 'jazz', popularity: 200000, depth: 0, family: 'jazz' },
  {
    id: 'fusion',
    mbid: M(4),
    name: 'fusion',
    popularity: 9000,
    depth: 1,
    family: 'jazz',
  },
];

const edges: GenreEdge[] = [
  { source: 'rock', target: 'grunge', kind: 'subgenre' },
  { source: 'jazz', target: 'fusion', kind: 'subgenre' },
  // Associative edges must NOT influence the layout.
  { source: 'rock', target: 'fusion', kind: 'influence' },
];

describe('layoutGraph', () => {
  it('produces identical coordinates across runs', () => {
    expect(layoutGraph(nodes, edges)).toEqual(layoutGraph(nodes, edges));
  });

  it('places every node with finite coordinates', () => {
    for (const node of layoutGraph(nodes, edges)) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it('actually spreads the nodes out', () => {
    // Guards against a silent force misconfiguration leaving everything at the origin.
    // (Whether the layout LOOKS good is judged on the real dataset, not a 4-node toy —
    // collision radii dominate at this scale and make proximity assertions flaky.)
    const placed = layoutGraph(nodes, edges);
    const positions = new Set(placed.map((n) => `${n.x},${n.y}`));
    expect(positions.size).toBe(placed.length);
    const maxDist = Math.max(...placed.map((n) => Math.hypot(n.x, n.y)));
    expect(maxDist).toBeGreaterThan(10);
  });

  it('ignores associative edges when laying out', () => {
    const withOnlyTree = layoutGraph(
      nodes,
      edges.filter((e) => e.kind === 'subgenre'),
    );
    expect(layoutGraph(nodes, edges)).toEqual(withOnlyTree);
  });
});
