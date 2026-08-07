/**
 * The graph builder is where every "what makes it onto the map" decision lives —
 * threshold, one-drawn-parent, cycle breaking, depth/family, slugs. All pure, so all
 * pinned here with tiny synthetic datasets.
 */
import { describe, expect, it } from 'vitest';

import { buildGraph, slugify } from '../../scripts/build-dataset/build-graph';
import type { GenreRef } from '../../scripts/build-dataset/fetch-genres';
import type { MbidEdge } from '../../scripts/build-dataset/fetch-hierarchy';

// Valid UUIDs, readable in assertions via the last character.
const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function genres(...names: string[]): GenreRef[] {
  return names.map((name, i) => ({ mbid: M(i + 1), name }));
}

describe('slugify', () => {
  it('kebab-cases and strips punctuation', () => {
    expect(slugify('melodic techno')).toBe('melodic-techno');
    expect(slugify('drum & bass')).toBe('drum-bass');
    expect(slugify("rock 'n' roll")).toBe('rock-n-roll');
  });

  it('strips diacritics', () => {
    expect(slugify('forró')).toBe('forro');
    expect(slugify('reggaetón')).toBe('reggaeton');
  });

  it('returns an empty string for unsluggable names (caller falls back to mbid)', () => {
    expect(slugify('演歌')).toBe('');
  });
});

describe('buildGraph', () => {
  it('drops genres under the threshold and edges touching them', () => {
    const g = genres('rock', 'grunge', 'acholitronix');
    const edges: MbidEdge[] = [
      { source: M(1), target: M(2), kind: 'subgenre' },
      { source: M(1), target: M(3), kind: 'subgenre' },
    ];
    const counts = new Map([
      [M(1), 1000],
      [M(2), 200],
      [M(3), 0],
    ]);
    const built = buildGraph(g, edges, counts, 50);
    expect(built.nodes.map((n) => n.id).sort()).toEqual(['grunge', 'rock']);
    expect(built.edges).toEqual([{ source: 'rock', target: 'grunge', kind: 'subgenre' }]);
    expect(built.report.dropped).toBe(1);
  });

  it('keeps exactly one subgenre edge per child, demoting extra parents to influence', () => {
    // child is a subgenre of BOTH a and b; b is more popular, so b keeps the drawn
    // edge and a's relation survives only associatively (focus reveal, never a line).
    const g = genres('a', 'b', 'child');
    const edges: MbidEdge[] = [
      { source: M(1), target: M(3), kind: 'subgenre' },
      { source: M(2), target: M(3), kind: 'subgenre' },
    ];
    const counts = new Map([
      [M(1), 100],
      [M(2), 500],
      [M(3), 60],
    ]);
    const built = buildGraph(g, edges, counts, 50);
    const drawn = built.edges.filter((e) => e.kind === 'subgenre');
    expect(drawn).toEqual([{ source: 'b', target: 'child', kind: 'subgenre' }]);
    expect(built.edges).toContainEqual({
      source: 'a',
      target: 'child',
      kind: 'influence',
    });
    expect(built.report.multiParent).toBe(1);
  });

  it('computes depth and family over the drawn tree', () => {
    const g = genres('rock', 'alt rock', 'grunge', 'jazz');
    const edges: MbidEdge[] = [
      { source: M(1), target: M(2), kind: 'subgenre' },
      { source: M(2), target: M(3), kind: 'subgenre' },
    ];
    const counts = new Map([
      [M(1), 1000],
      [M(2), 500],
      [M(3), 200],
      [M(4), 800],
    ]);
    const built = buildGraph(g, edges, counts, 50);
    const byId = new Map(built.nodes.map((n) => [n.id, n]));
    expect(byId.get('rock')).toMatchObject({ depth: 0, family: 'rock' });
    expect(byId.get('alt-rock')).toMatchObject({ depth: 1, family: 'rock' });
    expect(byId.get('grunge')).toMatchObject({ depth: 2, family: 'rock' });
    // Orphans stay roots of their own family — no synthetic "music" node.
    expect(byId.get('jazz')).toMatchObject({ depth: 0, family: 'jazz' });
    expect(built.report.roots).toBe(2);
  });

  it('breaks relation cycles instead of hanging', () => {
    // a → b → a, plus a's other parentage making a pure loop with no root.
    const g = genres('a', 'b');
    const edges: MbidEdge[] = [
      { source: M(1), target: M(2), kind: 'subgenre' },
      { source: M(2), target: M(1), kind: 'subgenre' },
    ];
    const counts = new Map([
      [M(1), 500],
      [M(2), 100],
    ]);
    const built = buildGraph(g, edges, counts, 50);
    // The more popular node is cut free and becomes the root.
    const byId = new Map(built.nodes.map((n) => [n.id, n]));
    expect(byId.get('a')).toMatchObject({ depth: 0, family: 'a' });
    expect(byId.get('b')).toMatchObject({ depth: 1, family: 'a' });
    expect(built.report.cyclesBroken).toBe(1);
    expect(built.edges.filter((e) => e.kind === 'subgenre')).toHaveLength(1);
  });

  it('keeps fusion and influence edges between surviving nodes, deduplicated', () => {
    const g = genres('alternative rock', 'dance', 'alternative dance');
    const edges: MbidEdge[] = [
      { source: M(1), target: M(3), kind: 'fusion' },
      { source: M(1), target: M(3), kind: 'fusion' },
      { source: M(2), target: M(3), kind: 'fusion' },
    ];
    const counts = new Map([
      [M(1), 1000],
      [M(2), 900],
      [M(3), 100],
    ]);
    const built = buildGraph(g, edges, counts, 50);
    const fusions = built.edges.filter((e) => e.kind === 'fusion');
    expect(fusions).toEqual([
      { source: 'alternative-rock', target: 'alternative-dance', kind: 'fusion' },
      { source: 'dance', target: 'alternative-dance', kind: 'fusion' },
    ]);
    // Fusion parents never produce a drawn edge or set depth/family.
    const byId = new Map(built.nodes.map((n) => [n.id, n]));
    expect(byId.get('alternative-dance')).toMatchObject({
      depth: 0,
      family: 'alternative-dance',
    });
  });

  it('falls back to the mbid on slug collisions', () => {
    const g: GenreRef[] = [
      { mbid: M(1), name: 'lo-fi' },
      { mbid: M(2), name: 'lo fi' },
    ];
    const counts = new Map([
      [M(1), 100],
      [M(2), 100],
    ]);
    const built = buildGraph(g, [], counts, 50);
    const ids = built.nodes.map((n) => n.id).sort();
    // Alphabetical order by name decides who keeps the clean slug: 'lo fi' < 'lo-fi'.
    expect(ids).toContain('lo-fi');
    expect(ids).toContain(M(1));
  });

  it('is deterministic: same input, same output', () => {
    const g = genres('rock', 'grunge', 'jazz');
    const edges: MbidEdge[] = [{ source: M(1), target: M(2), kind: 'subgenre' }];
    const counts = new Map([
      [M(1), 1000],
      [M(2), 200],
      [M(3), 800],
    ]);
    const a = buildGraph(g, edges, counts, 50);
    const b = buildGraph(g, edges, counts, 50);
    expect(a).toEqual(b);
  });
});
