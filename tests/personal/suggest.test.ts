/**
 * Suggestion scoring is the product's "branch out" promise. Pinned: the factor
 * ordering (fusion/influence > parent/child > sibling), convergence boosting,
 * exclusion of listened genres, and because-attribution.
 */
import { describe, expect, it } from 'vitest';

import {
  FUSION_FACTOR,
  SIBLING_FACTOR,
  SUBGENRE_FACTOR,
  suggestGenres,
} from '../../src/personal/suggest';
import type { GenreEdge } from '../../src/types';

const weight = (id: string, value = 1) => ({ id, weight: value, artistNames: [] });

describe('suggestGenres', () => {
  it('never suggests a genre the listener already has', () => {
    const edges: GenreEdge[] = [{ source: 'rock', target: 'grunge', kind: 'subgenre' }];
    const suggestions = suggestGenres([weight('rock'), weight('grunge')], edges);
    expect(suggestions).toEqual([]);
  });

  it('ranks a fusion/influence neighbour above a tree neighbour of equal weight', () => {
    const edges: GenreEdge[] = [
      { source: 'dub', target: 'trip-hop', kind: 'influence' },
      { source: 'dub', target: 'roots-reggae', kind: 'subgenre' },
    ];
    const suggestions = suggestGenres([weight('dub')], edges);
    expect(suggestions.map((s) => s.id)).toEqual(['trip-hop', 'roots-reggae']);
    expect(suggestions[0].score).toBeCloseTo(FUSION_FACTOR, 5);
    expect(suggestions[1].score).toBeCloseTo(SUBGENRE_FACTOR, 5);
  });

  it('recommends upward too — listening to the child suggests the parent', () => {
    const edges: GenreEdge[] = [{ source: 'rock', target: 'grunge', kind: 'subgenre' }];
    const suggestions = suggestGenres([weight('grunge')], edges);
    expect(suggestions.map((s) => s.id)).toEqual(['rock']);
  });

  it('lets several listened genres converge on one candidate', () => {
    const edges: GenreEdge[] = [
      { source: 'house', target: 'acid-house', kind: 'subgenre' },
      { source: 'techno', target: 'acid-house', kind: 'influence' },
    ];
    const suggestions = suggestGenres([weight('house'), weight('techno')], edges);
    expect(suggestions[0].id).toBe('acid-house');
    expect(suggestions[0].score).toBeCloseTo(SUBGENRE_FACTOR + FUSION_FACTOR, 5);
    expect(suggestions[0].because).toEqual(['techno', 'house']);
  });

  it('nudges siblings of a listened genre, faintly', () => {
    const edges: GenreEdge[] = [
      { source: 'techno', target: 'acid-techno', kind: 'subgenre' },
      { source: 'techno', target: 'dub-techno', kind: 'subgenre' },
    ];
    const suggestions = suggestGenres([weight('acid-techno')], edges);
    const dubTechno = suggestions.find((s) => s.id === 'dub-techno');
    // parent (0.7) outranks sibling (0.35)
    expect(suggestions[0].id).toBe('techno');
    expect(dubTechno?.score).toBeCloseTo(SIBLING_FACTOR, 5);
  });

  it('scales contributions by the listened genre weight and caps the list', () => {
    const edges: GenreEdge[] = [
      { source: 'strong', target: 'a', kind: 'influence' },
      { source: 'faint', target: 'b', kind: 'influence' },
    ];
    const suggestions = suggestGenres(
      [weight('strong', 1), weight('faint', 0.1)],
      edges,
      1,
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].id).toBe('a');
  });

  it('returns nothing for an empty profile', () => {
    expect(suggestGenres([], [{ source: 'a', target: 'b', kind: 'subgenre' }])).toEqual(
      [],
    );
  });
});
