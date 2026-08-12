/**
 * These links are the ONLY way a song row reaches a streaming service — the
 * dataset ships `Track.links` empty — so the exact URL shapes are pinned here.
 */
import { describe, expect, it } from 'vitest';

import { deezerTrackUrl, spotifySearchUrl, trackLinks } from '../../src/lib/trackLinks';
import type { Track } from '../../src/types';

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function track(overrides: Partial<Track> = {}): Track {
  return {
    mbid: M(1),
    title: 'Daughter',
    artistName: 'Pearl Jam',
    listens: 1200000,
    links: [],
    ...overrides,
  };
}

describe('spotifySearchUrl', () => {
  it('searches for artist and title together', () => {
    expect(spotifySearchUrl('Pearl Jam', 'Daughter')).toBe(
      'https://open.spotify.com/search/Pearl%20Jam%20Daughter',
    );
  });

  it('encodes the punctuation real MusicBrainz titles carry', () => {
    // Curly apostrophes and parenthesised remix credits are both common.
    expect(spotifySearchUrl('Basement Jaxx', 'Jump n’ Shout')).toBe(
      'https://open.spotify.com/search/Basement%20Jaxx%20Jump%20n%E2%80%99%20Shout',
    );
    expect(spotifySearchUrl('Tiga', 'Shoes (Mr Oizo remix)')).toBe(
      'https://open.spotify.com/search/Tiga%20Shoes%20(Mr%20Oizo%20remix)',
    );
  });

  it('collapses stray whitespace so the query has no empty terms', () => {
    expect(spotifySearchUrl('  Boards  of Canada ', ' Roygbiv ')).toBe(
      'https://open.spotify.com/search/Boards%20of%20Canada%20Roygbiv',
    );
  });
});

describe('deezerTrackUrl', () => {
  it('addresses the track page by its stable id', () => {
    expect(deezerTrackUrl(7173551)).toBe('https://www.deezer.com/track/7173551');
  });
});

describe('trackLinks', () => {
  it('gives every track a Spotify link even with nothing in the dataset', () => {
    const links = trackLinks(track());
    expect(links).toHaveLength(1);
    expect(links[0]?.kind).toBe('spotify');
    expect(links[0]?.url).toContain('/search/');
    // The tooltip is what keeps the label honest — it is a search, not the song page.
    expect(links[0]?.title).toContain('Search Spotify');
  });

  it('adds an exact Deezer link when stage 6 resolved an id', () => {
    const links = trackLinks(track({ deezerId: 7173551 }));
    expect(links.map((l) => l.kind)).toEqual(['spotify', 'deezer']);
    expect(links[1]?.url).toBe('https://www.deezer.com/track/7173551');
    expect(links[1]?.title).toBeUndefined();
  });

  it('yields to a real Spotify link rather than adding a search one', () => {
    const exact = 'https://open.spotify.com/track/2Foc5Q5nqNiosCNqttzHof';
    const links = trackLinks(track({ links: [{ kind: 'spotify', url: exact }] }));
    expect(links).toHaveLength(1);
    expect(links[0]?.url).toBe(exact);
    expect(links[0]?.title).toBeUndefined();
  });

  it('keeps dataset links of other kinds and still derives the missing ones', () => {
    const links = trackLinks(
      track({
        links: [{ kind: 'bandcamp', url: 'https://band.bandcamp.com/track/x' }],
        deezerId: 42,
      }),
    );
    expect(links.map((l) => l.kind)).toEqual(['bandcamp', 'spotify', 'deezer']);
  });
});
