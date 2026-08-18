/**
 * The popular/obscure split — the decision rule behind both panel halves.
 *
 * Two things matter most here. The floor: ListenBrainz's bottom decile is data
 * artifacts (1 listen, 1 user), and "obscure" must mean "genuinely listened to, just
 * not famous". And the scoring key: "popular" weighs tag agreement against reach, so
 * that a megastar with one stray tag vote cannot head a genre they barely belong to.
 */
import { describe, expect, it } from 'vitest';

import { OBSCURE_MIN_LISTENS } from '../../scripts/build-dataset/config';
import { panelScore, selectEntities } from '../../scripts/build-dataset/rank';

const M = (n: number) =>
  `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

/** Candidates all equally well tagged, so ordering reduces to listen count. */
function candidates(
  listens: number[],
  votes = 1,
): { list: { mbid: string; tagVotes: number }[]; map: Map<string, number> } {
  const list = listens.map((_, i) => ({ mbid: M(i + 1), tagVotes: votes }));
  return { list, map: new Map(list.map((c, i) => [c.mbid, listens[i]])) };
}

describe('panelScore', () => {
  it('rises with both tag votes and listens', () => {
    expect(panelScore(4, 1000)).toBeGreaterThan(panelScore(1, 1000));
    expect(panelScore(4, 10_000)).toBeGreaterThan(panelScore(4, 1000));
  });

  it('lets a well-tagged artist beat a far more listened stray tag', () => {
    // The britpop case: Oasis (14 votes, 38M) must outrank The Beatles (1, 144M).
    expect(panelScore(14, 38_000_000)).toBeGreaterThan(panelScore(1, 144_000_000));
  });

  it('still lets reach decide between equally tagged artists', () => {
    expect(panelScore(5, 10_000_000)).toBeGreaterThan(panelScore(5, 10_000));
  });

  it('compresses votes — 47 votes is not 47x one vote', () => {
    expect(panelScore(47, 1000) / panelScore(1, 1000)).toBeLessThan(10);
  });

  it('treats a zero-listen candidate as scoreless whatever its tags', () => {
    expect(panelScore(50, 0)).toBe(0);
  });

  it('does not produce NaN if a non-positive vote count ever reaches it', () => {
    expect(panelScore(-3, 1000)).toBe(0);
  });
});

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

  it('ranks popular by tag agreement, not listens alone', () => {
    // Straight from the shipped britpop panel.
    const list = [
      { mbid: M(1), tagVotes: 1, name: 'The Beatles' },
      { mbid: M(2), tagVotes: 14, name: 'Oasis' },
      { mbid: M(3), tagVotes: 16, name: 'Blur' },
    ];
    const map = new Map([
      [M(1), 144_000_000],
      [M(2), 38_000_000],
      [M(3), 20_000_000],
    ]);
    const { popular } = selectEntities(list, map);
    expect(popular.map((r) => r.entity.name)).toEqual(['Blur', 'Oasis', 'The Beatles']);
  });

  it('never lets an entity appear in both lists', () => {
    const { list, map } = candidates([300, 300, 300, 300, 300, 300]);
    const { popular, obscure } = selectEntities(list, map);
    const popularIds = new Set(popular.map((r) => r.entity.mbid));
    expect(obscure.some((r) => popularIds.has(r.entity.mbid))).toBe(false);
    expect(popular).toHaveLength(5);
    expect(obscure).toHaveLength(1);
  });

  it('excludes from obscure whatever the score promoted, not just the top five by listens', () => {
    // The best-tagged artist here is also the quietest: it must be promoted to
    // popular and NOT reappear as a deep cut.
    const list = [
      { mbid: M(1), tagVotes: 1 },
      { mbid: M(2), tagVotes: 1 },
      { mbid: M(3), tagVotes: 40 },
    ];
    const map = new Map([
      [M(1), 900_000],
      [M(2), 800_000],
      [M(3), 5_000],
    ]);
    const { popular, obscure } = selectEntities(list, map);
    expect(popular[0].entity.mbid).toBe(M(3));
    expect(obscure.some((r) => r.entity.mbid === M(3))).toBe(false);
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
