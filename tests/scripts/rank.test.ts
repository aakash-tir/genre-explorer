/**
 * The popular/obscure split — the decision rule behind both panel halves. The floor
 * matters most: ListenBrainz's bottom decile is data artifacts (1 listen, 1 user),
 * and "obscure" must mean "genuinely listened to, just not famous".
 */
import { describe, expect, it } from 'vitest';

import { OBSCURE_MIN_LISTENS } from '../../scripts/build-dataset/config';
import { selectEntities } from '../../scripts/build-dataset/rank';

const M = (n: number) =>
  `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

function candidates(listens: number[]): {
  list: { mbid: string }[];
  map: Map<string, number>;
} {
  const list = listens.map((_, i) => ({ mbid: M(i + 1) }));
  return { list, map: new Map(list.map((c, i) => [c.mbid, listens[i]])) };
}

describe('selectEntities', () => {
  it('takes the top five as popular and the quietest qualifying five as obscure', () => {
    const { list, map } = candidates([
      9000, 8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000, 500,
    ]);
    const { popular, obscure } = selectEntities(list, map);
    expect(popular.map((r) => r.listens)).toEqual([9000, 8000, 7000, 6000, 5000]);
    // Least-listened first — the panel leads with the deepest cut.
    expect(obscure.map((r) => r.listens)).toEqual([500, 1000, 2000, 3000, 4000]);
  });

  it('never lets an entity appear in both lists', () => {
    const { list, map } = candidates([300, 300, 300, 300, 300, 300]);
    const { popular, obscure } = selectEntities(list, map);
    const popularIds = new Set(popular.map((r) => r.entity.mbid));
    expect(obscure.some((r) => popularIds.has(r.entity.mbid))).toBe(false);
    expect(popular).toHaveLength(5);
    expect(obscure).toHaveLength(1);
  });

  it('excludes artifacts below the obscure floor and all zero-listen candidates', () => {
    const { list, map } = candidates([
      9000,
      8000,
      7000,
      6000,
      5000,
      OBSCURE_MIN_LISTENS - 1, // artifact tier — not a hidden gem
      0, // no ListenBrainz data at all
      OBSCURE_MIN_LISTENS,
    ]);
    const { popular, obscure } = selectEntities(list, map);
    expect(popular).toHaveLength(5);
    expect(obscure.map((r) => r.listens)).toEqual([OBSCURE_MIN_LISTENS]);
  });

  it('returns short lists for thin genres instead of padding', () => {
    const { list, map } = candidates([1200, 800]);
    const { popular, obscure } = selectEntities(list, map);
    expect(popular).toHaveLength(2);
    expect(obscure).toHaveLength(0);
  });

  it('is deterministic under ties via mbid ordering', () => {
    const { list, map } = candidates([500, 500, 500]);
    const a = selectEntities(list, map);
    const b = selectEntities([...list].reverse(), map);
    expect(a.popular.map((r) => r.entity.mbid)).toEqual(
      b.popular.map((r) => r.entity.mbid),
    );
  });
});
