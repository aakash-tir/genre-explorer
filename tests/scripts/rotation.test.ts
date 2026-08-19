/**
 * The rolling refresh queue. The ordering rule IS the schedule, so it is pinned here:
 * get it wrong and some genre silently never gets refreshed again.
 */
import { describe, expect, it } from 'vitest';

import {
  SHARD_SIZE,
  selectShard,
  type RefreshCandidate,
} from '../../scripts/build-dataset/rotation';
import type { GenreNode } from '../../src/types';

function node(id: string): GenreNode {
  return {
    id,
    mbid: '00000000-0000-4000-8000-000000000001',
    name: id,
    popularity: 100,
    depth: 0,
    family: id,
    x: 0,
    y: 0,
  };
}

const at = (node_: GenreNode, refreshedAt: string | null): RefreshCandidate => ({
  node: node_,
  refreshedAt,
});

describe('selectShard', () => {
  it('takes the least-recently-refreshed genres first', () => {
    const shard = selectShard(
      [
        at(node('new'), '2026-08-18T00:00:00.000Z'),
        at(node('old'), '2026-08-01T00:00:00.000Z'),
        at(node('middle'), '2026-08-10T00:00:00.000Z'),
      ],
      2,
    );
    expect(shard.map((n) => n.id)).toEqual(['old', 'middle']);
  });

  it('puts never-refreshed genres at the very front', () => {
    // A genre new to the map has no detail file, so it must be built before any
    // merely-stale one is rebuilt.
    const shard = selectShard(
      [at(node('stale'), '2020-01-01T00:00:00.000Z'), at(node('brand-new'), null)],
      1,
    );
    expect(shard.map((n) => n.id)).toEqual(['brand-new']);
  });

  it('breaks ties on id so two runs pick the identical shard', () => {
    const same = '2026-08-01T00:00:00.000Z';
    const candidates = [at(node('zebra'), same), at(node('apple'), same)];
    expect(selectShard(candidates, 1).map((n) => n.id)).toEqual(['apple']);
    expect(selectShard([...candidates].reverse(), 1).map((n) => n.id)).toEqual(['apple']);
  });

  it('orders several never-refreshed genres deterministically too', () => {
    const shard = selectShard([at(node('zebra'), null), at(node('apple'), null)], 2);
    expect(shard.map((n) => n.id)).toEqual(['apple', 'zebra']);
  });

  it('does not mutate its input — the caller still holds the full list', () => {
    const candidates = [
      at(node('b'), '2026-08-02T00:00:00.000Z'),
      at(node('a'), '2026-08-01T00:00:00.000Z'),
    ];
    selectShard(candidates, 2);
    expect(candidates.map((c) => c.node.id)).toEqual(['b', 'a']);
  });

  it('returns everything when the shard is larger than the map', () => {
    expect(selectShard([at(node('only'), null)], 65)).toHaveLength(1);
  });

  it('returns nothing for a non-positive size rather than throwing', () => {
    expect(selectShard([at(node('a'), null)], 0)).toEqual([]);
    expect(selectShard([at(node('a'), null)], -5)).toEqual([]);
  });

  it('rotates: yesterday’s shard is last in line today', () => {
    // Simulate two consecutive days over a small map and assert full coverage with
    // no genre refreshed twice before every other genre has had a turn.
    let clock = 0;
    const state = new Map<string, string | null>([
      ['a', null],
      ['b', null],
      ['c', null],
      ['d', null],
    ]);
    const seen: string[] = [];
    for (let day = 0; day < 2; day++) {
      const shard = selectShard(
        [...state].map(([id, refreshedAt]) => at(node(id), refreshedAt)),
        2,
      );
      for (const n of shard) {
        seen.push(n.id);
        state.set(n.id, `2026-08-${String(10 + clock++).padStart(2, '0')}T00:00:00.000Z`);
      }
    }
    expect([...seen].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('SHARD_SIZE', () => {
  it('covers the 912-genre map inside a fortnight', () => {
    expect(Math.ceil(912 / SHARD_SIZE)).toBeLessThanOrEqual(14);
  });
});
