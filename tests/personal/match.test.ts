/**
 * Matching is where a wrong result is worse than a missing one — the ambiguity
 * rules and the weight curve are the contract, so they are pinned exactly.
 */
import { describe, expect, it } from 'vitest';

import { artistWeight, matchGenres } from '../../src/personal/match';
import type { ArtistIndex } from '../../src/types';

const INDEX: ArtistIndex = {
  builtAt: '2026-08-10T00:00:00.000Z',
  genreIds: ['techno', 'idm', 'house'],
  artists: [
    { spotifyId: 'sidAphex', name: 'aphex twin', genres: [0, 1] },
    { spotifyId: 'sidMills', name: 'jeff mills', genres: [0] },
    { name: 'no spotify act', genres: [2] },
    // Deliberately ambiguous name, two different artists:
    { spotifyId: 'sidBushUk', name: 'bush', genres: [0] },
    { spotifyId: 'sidBushCa', name: 'bush', genres: [2] },
  ],
};

describe('artistWeight', () => {
  it('is 1 at rank 0 and decays gently', () => {
    expect(artistWeight(0)).toBe(1);
    expect(artistWeight(3)).toBe(0.5);
    expect(artistWeight(49)).toBeCloseTo(0.1414, 3);
  });
});

describe('matchGenres', () => {
  it('matches by spotify id and credits every tagged genre in full', () => {
    const weights = matchGenres(
      [{ spotifyId: 'sidAphex', name: 'Aphex Twin', rank: 0 }],
      INDEX,
    );
    expect(weights).toEqual([
      { id: 'idm', weight: 1, artistNames: ['Aphex Twin'] },
      { id: 'techno', weight: 1, artistNames: ['Aphex Twin'] },
    ]);
  });

  it('falls back to a unique normalized name when the id is unknown', () => {
    const weights = matchGenres(
      [{ spotifyId: 'sidUnknown', name: 'No Spötify Act', rank: 0 }],
      INDEX,
    );
    expect(weights.map((genre) => genre.id)).toEqual(['house']);
  });

  it('refuses ambiguous names outright', () => {
    const weights = matchGenres(
      [{ spotifyId: 'sidNeither', name: 'Bush', rank: 0 }],
      INDEX,
    );
    expect(weights).toEqual([]);
  });

  it('normalizes weights so the strongest genre is exactly 1', () => {
    const weights = matchGenres(
      [
        { spotifyId: 'sidAphex', name: 'Aphex Twin', rank: 0 },
        { spotifyId: 'sidMills', name: 'Jeff Mills', rank: 3 },
      ],
      INDEX,
    );
    const techno = weights.find((genre) => genre.id === 'techno');
    const idm = weights.find((genre) => genre.id === 'idm');
    // techno: 1 + 0.5 = 1.5 (max) → 1; idm: 1 → 1/1.5
    expect(techno?.weight).toBe(1);
    expect(idm?.weight).toBeCloseTo(2 / 3, 5);
    expect(techno?.artistNames).toEqual(['Aphex Twin', 'Jeff Mills']);
  });

  it('returns nothing when nothing matches', () => {
    expect(matchGenres([{ spotifyId: 'x', name: 'Nobody', rank: 0 }], INDEX)).toEqual([]);
  });
});
