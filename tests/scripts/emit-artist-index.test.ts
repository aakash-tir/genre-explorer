/**
 * The reverse index is what the personal lens matches listening history against.
 * Pinned: inversion across genres, deduplication by MBID, spotify-id extraction,
 * deterministic ordering (weekly refresh diffs must stay reviewable).
 */
import { describe, expect, it } from 'vitest';

import { buildArtistIndex } from '../../scripts/build-dataset/emit-artist-index';
import type { Artist, GenreDetail } from '../../src/types';

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const BUILT_AT = '2026-08-10T00:00:00.000Z';

function artist(n: number, name: string, spotifyId?: string, tagVotes = 5): Artist {
  return {
    mbid: M(n),
    name,
    listens: 100,
    tagVotes,
    links: spotifyId
      ? [{ kind: 'spotify', url: `https://open.spotify.com/artist/${spotifyId}` }]
      : [{ kind: 'bandcamp', url: 'https://example.bandcamp.com' }],
  };
}

function detail(id: string, popular: Artist[], small: Artist[] = []): GenreDetail {
  return {
    id,
    popularArtists: popular,
    smallArtists: small,
    popularTracks: [],
    obscureTracks: [],
  };
}

describe('buildArtistIndex', () => {
  it('inverts detail files into artist → genre-index entries', () => {
    const index = buildArtistIndex(
      [
        detail('techno', [artist(1, 'Jeff Mills', 'sidJeff')]),
        detail('house', [artist(2, 'Frankie Knuckles', 'sidFrankie')]),
      ],
      BUILT_AT,
    );
    expect(index.genreIds).toEqual(['techno', 'house']);
    expect(index.artists).toEqual([
      {
        mbid: M(2),
        spotifyId: 'sidFrankie',
        name: 'frankie knuckles',
        genres: [1],
        votes: [5],
      },
      {
        mbid: M(1),
        spotifyId: 'sidJeff',
        name: 'jeff mills',
        genres: [0],
        votes: [5],
      },
    ]);
  });

  it('carries each genre-specific tag vote, positionally paired with genres', () => {
    // Coldplay's real shape: strongly alternative rock, marginally post-britpop.
    const index = buildArtistIndex(
      [
        detail('alternative-rock', [artist(1, 'Coldplay', 'sidCold', 34)]),
        detail('post-britpop', [artist(1, 'Coldplay', 'sidCold', 3)]),
      ],
      BUILT_AT,
    );
    expect(index.artists).toHaveLength(1);
    expect(index.artists[0].genres).toEqual([0, 1]);
    expect(index.artists[0].votes).toEqual([34, 3]);
  });

  it('keeps genres and votes the same length however many panels an artist reaches', () => {
    const index = buildArtistIndex(
      [
        detail('techno', [artist(1, 'Aphex Twin', 'sidAphex', 9)]),
        detail('idm', [], [artist(1, 'Aphex Twin', 'sidAphex', 4)]),
        detail('house', [artist(1, 'Aphex Twin', 'sidAphex', 2)]),
      ],
      BUILT_AT,
    );
    const entry = index.artists[0];
    expect(entry.votes).toHaveLength(entry.genres.length);
    expect(entry.votes).toEqual([9, 4, 2]);
  });

  it('merges the same MBID across genres and across popular/small lists', () => {
    const index = buildArtistIndex(
      [
        detail('techno', [artist(1, 'Aphex Twin', 'sidAphex')]),
        detail('idm', [], [artist(1, 'Aphex Twin', 'sidAphex')]),
      ],
      BUILT_AT,
    );
    expect(index.artists).toHaveLength(1);
    expect(index.artists[0].genres).toEqual([0, 1]);
  });

  it('omits spotifyId when the artist has no spotify link, keeping mbid + name keys', () => {
    const index = buildArtistIndex(
      [detail('gabber', [artist(3, 'Obscúre Act')])],
      BUILT_AT,
    );
    expect(index.artists[0].spotifyId).toBeUndefined();
    expect(index.artists[0].mbid).toBe(M(3));
    expect(index.artists[0].name).toBe('obscure act');
  });

  it('orders artists by normalized name for stable diffs', () => {
    const index = buildArtistIndex(
      [detail('techno', [artist(2, 'Zeta', 'sidZ'), artist(1, 'Álpha', 'sidA')])],
      BUILT_AT,
    );
    expect(index.artists.map((entry) => entry.name)).toEqual(['alpha', 'zeta']);
  });
});
