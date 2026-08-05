/**
 * A miniature genre graph that exercises every rule the app has.
 *
 * Shaped to include the case that actually matters: `alternative-dance` is a fusion of
 * BOTH `alternative-rock` and `dance`, which is the real MusicBrainz relationship and the
 * exact situation the original plan called out — two big genres that must not be
 * connected by a visible edge, but whose fused child must appear under each when focused.
 */
import type { GenreEdge, GenreNode, GraphDataset } from '../src/types';

export const NODES: GenreNode[] = [
  {
    id: 'rock',
    mbid: '0e3fc579-2d24-4f20-9dae-736e1ec78798',
    name: 'rock',
    popularity: 547091,
    depth: 0,
    family: 'rock',
    x: -320,
    y: -40,
  },
  {
    id: 'alternative-rock',
    mbid: 'ceeaa283-5d7b-4202-8d1d-e25d116b2a18',
    name: 'alternative rock',
    popularity: 84210,
    depth: 1,
    family: 'rock',
    x: -180,
    y: 60,
  },
  {
    id: 'grunge',
    mbid: '1b50083b-1afa-4778-82c8-548b309af783',
    name: 'grunge',
    popularity: 9412,
    depth: 2,
    family: 'rock',
    x: -140,
    y: 168,
  },
  {
    id: 'electronic',
    mbid: '89255676-1f14-4dd8-bbad-fca839d6aff4',
    name: 'electronic',
    popularity: 312044,
    depth: 0,
    family: 'electronic',
    x: 300,
    y: -60,
  },
  {
    id: 'dance',
    mbid: '5a89d1e4-a3ea-4f3f-bbb4-e1c3f2a2c0e0',
    name: 'dance',
    popularity: 61830,
    depth: 1,
    family: 'electronic',
    x: 190,
    y: 70,
  },
  {
    id: 'techno',
    mbid: '3ba38b19-8c2f-4a94-a1c0-45c8e2a2b1a3',
    name: 'techno',
    popularity: 70770,
    depth: 1,
    family: 'electronic',
    x: 380,
    y: 84,
  },
  {
    id: 'melodic-techno',
    mbid: 'c9f1c1ee-6de4-4d1a-9f10-9a4e5e2f0b71',
    name: 'melodic techno',
    popularity: 4210,
    depth: 2,
    family: 'electronic',
    x: 430,
    y: 190,
  },
  {
    id: 'alternative-dance',
    mbid: 'a3f0b2f6-2f7b-4a1b-9f6b-2a0f1e9b2d44',
    name: 'alternative dance',
    popularity: 7305,
    depth: 2,
    family: 'electronic',
    x: 30,
    y: 172,
  },
];

export const EDGES: GenreEdge[] = [
  { source: 'rock', target: 'alternative-rock', kind: 'subgenre' },
  { source: 'alternative-rock', target: 'grunge', kind: 'subgenre' },
  { source: 'electronic', target: 'dance', kind: 'subgenre' },
  { source: 'electronic', target: 'techno', kind: 'subgenre' },
  { source: 'techno', target: 'melodic-techno', kind: 'subgenre' },
  // The case the whole edge rule exists for.
  { source: 'alternative-rock', target: 'alternative-dance', kind: 'fusion' },
  { source: 'dance', target: 'alternative-dance', kind: 'fusion' },
  { source: 'rock', target: 'grunge', kind: 'influence' },
];

export const DATASET: GraphDataset = {
  builtAt: '2026-08-04T00:00:00.000Z',
  nodes: NODES,
  edges: EDGES,
};

export function nodeById(id: string): GenreNode {
  const node = NODES.find((n) => n.id === id);
  if (!node) throw new Error(`fixture has no node "${id}"`);
  return node;
}
