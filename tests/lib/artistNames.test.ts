/**
 * The normalization here is a CONTRACT between the build-time index emitter and the
 * runtime matcher — if these two ever disagree, name-fallback matching silently
 * misses, so the exact behaviour is pinned.
 */
import { describe, expect, it } from 'vitest';

import { normalizeArtistName, spotifyArtistIdFromUrl } from '../../src/lib/artistNames';

describe('normalizeArtistName', () => {
  it('lowercases and trims', () => {
    expect(normalizeArtistName('  Nine Inch Nails ')).toBe('nine inch nails');
  });

  it('strips diacritics so Spotify and MusicBrainz spellings meet', () => {
    expect(normalizeArtistName('Röyksopp')).toBe('royksopp');
    expect(normalizeArtistName('Björk')).toBe('bjork');
    expect(normalizeArtistName('Sigur Rós')).toBe('sigur ros');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeArtistName('Boards  of\tCanada')).toBe('boards of canada');
  });

  it('keeps leading articles — "The Knife" must not merge with "Knife"', () => {
    expect(normalizeArtistName('The Knife')).toBe('the knife');
  });

  it('leaves non-Latin scripts intact', () => {
    expect(normalizeArtistName('坂本龍一')).toBe('坂本龍一');
  });
});

describe('spotifyArtistIdFromUrl', () => {
  it('extracts the id from a canonical artist URL', () => {
    expect(
      spotifyArtistIdFromUrl('https://open.spotify.com/artist/0X380XXQSNBYuleKzav5UO'),
    ).toBe('0X380XXQSNBYuleKzav5UO');
  });

  it('tolerates query strings and locale prefixes', () => {
    expect(
      spotifyArtistIdFromUrl(
        'https://open.spotify.com/artist/6kBDZFXuLrZgHnvmPu9NsG?si=abc123',
      ),
    ).toBe('6kBDZFXuLrZgHnvmPu9NsG');
  });

  it('returns null for non-artist Spotify URLs and other hosts', () => {
    expect(spotifyArtistIdFromUrl('https://open.spotify.com/track/xyz')).toBeNull();
    expect(
      spotifyArtistIdFromUrl('https://soundcloud.com/aphex-twin-official'),
    ).toBeNull();
  });
});
