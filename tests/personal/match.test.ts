/**
 * Matching is where a wrong result is worse than a missing one — the ambiguity
 * rules and the weight curve are the contract, so they are pinned exactly.
 */
import { describe, expect, it } from 'vitest';

import { artistWeight, genreShare, matchGenres } from '../../src/personal/match';
import type { ArtistIndex } from '../../src/types';

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const INDEX: ArtistIndex = {
  builtAt: '2026-08-10T00:00:00.000Z',
  genreIds: ['techno', 'idm', 'house'],
  artists: [
    // Equally tagged for both genres, so the share term is 1 on each.
    {
      mbid: M(1),
      spotifyId: 'sidAphex',
      name: 'aphex twin',
      genres: [0, 1],
      votes: [8, 8],
    },
    { mbid: M(2), spotifyId: 'sidMills', name: 'jeff mills', genres: [0], votes: [8] },
    { mbid: M(3), name: 'no spotify act', genres: [2], votes: [4] },
    // Deliberately ambiguous name, two different artists:
    { mbid: M(4), spotifyId: 'sidBushUk', name: 'bush', genres: [0], votes: [3] },
    { mbid: M(5), spotifyId: 'sidBushCa', name: 'bush', genres: [2], votes: [3] },
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
  it('matches by spotify id and credits equally tagged genres equally', () => {
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

  it('matches by MusicBrainz id first — the ListenBrainz path is exact', () => {
    // The mbid wins even when the name is ambiguous and no spotify id is given.
    const weights = matchGenres([{ mbid: M(5), name: 'Bush', rank: 0 }], INDEX);
    expect(weights.map((genre) => genre.id)).toEqual(['house']);
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

  it('weights a versatile artist by how much of them each genre actually is', () => {
    // Coldplay's real MusicBrainz tags: alternative rock 34, post-britpop 3,
    // britpop 1. Before this weighting all three came out identical, which is what
    // made a Coldplay listener read as equally a britpop listener.
    const index: ArtistIndex = {
      builtAt: '2026-08-17T00:00:00.000Z',
      genreIds: ['alternative-rock', 'post-britpop', 'britpop'],
      artists: [
        {
          mbid: M(6),
          spotifyId: 'sidColdplay',
          name: 'coldplay',
          genres: [0, 1, 2],
          votes: [34, 3, 1],
        },
      ],
    };
    const weights = matchGenres(
      [{ spotifyId: 'sidColdplay', name: 'Coldplay', rank: 0 }],
      index,
    );
    expect(weights.map((genre) => genre.id)).toEqual([
      'alternative-rock',
      'post-britpop',
      'britpop',
    ]);
    expect(weights[0].weight).toBe(1);
    expect(weights[1].weight).toBeCloseTo(Math.sqrt(3 / 34), 5);
    expect(weights[2].weight).toBeCloseTo(Math.sqrt(1 / 34), 5);
    // Quiet, but present — a marginal genre is dimmed, not erased.
    expect(weights[2].weight).toBeGreaterThan(0.1);
  });
});

describe('genreShare', () => {
  it('gives the strongest genre of an artist exactly 1', () => {
    expect(genreShare(34, 34)).toBe(1);
  });

  it('leaves a single-genre artist completely unaffected', () => {
    expect(genreShare(1, 1)).toBe(1);
    expect(genreShare(300, 300)).toBe(1);
  });

  it('fades a marginal genre without erasing it', () => {
    const share = genreShare(1, 34);
    expect(share).toBeLessThan(0.2);
    expect(share).toBeGreaterThan(0.15);
  });

  it('is measured relative to the artist, not an absolute scale', () => {
    // A lightly tagged artist is not a weaker signal, just less tagged.
    expect(genreShare(2, 4)).toBe(genreShare(100, 200));
  });

  it('never returns NaN on degenerate input', () => {
    expect(genreShare(0, 0)).toBe(0);
    expect(genreShare(5, 0)).toBe(0);
    expect(genreShare(-2, 10)).toBe(0);
  });
});
