/**
 * Hostname → link kind mapping. MusicBrainz's relation *types* cannot distinguish
 * Spotify from Deezer (both are "free streaming"), so the hostname is the source of
 * truth — and it has to be the parsed hostname, not a substring match, or
 * `evil.com/open.spotify.com` walks through.
 */
import { describe, expect, it } from 'vitest';

import { linkFromUrl, pickLinks } from '../../scripts/build-dataset/fetch-links';

describe('linkFromUrl', () => {
  it('maps the platforms the panel shows', () => {
    expect(linkFromUrl('https://open.spotify.com/artist/1w5K')?.kind).toBe('spotify');
    expect(linkFromUrl('https://soundcloud.com/someband')?.kind).toBe('soundcloud');
    expect(linkFromUrl('https://someband.bandcamp.com/')?.kind).toBe('bandcamp');
    expect(linkFromUrl('https://www.youtube.com/@someband')?.kind).toBe('youtube');
    expect(linkFromUrl('https://youtu.be/abc')?.kind).toBe('youtube');
    expect(linkFromUrl('https://www.discogs.com/artist/175395')?.kind).toBe('discogs');
  });

  it('rejects everything else, including lookalike paths and bad URLs', () => {
    expect(linkFromUrl('https://www.deezer.com/artist/1319')).toBeNull();
    expect(linkFromUrl('https://pearljam.tumblr.com/')).toBeNull();
    expect(linkFromUrl('https://evil.example/open.spotify.com/artist/x')).toBeNull();
    expect(linkFromUrl('not a url')).toBeNull();
  });
});

describe('pickLinks', () => {
  it('keeps one link per kind in panel order', () => {
    const links = pickLinks([
      'https://www.discogs.com/artist/1',
      'https://open.spotify.com/artist/a',
      'https://open.spotify.com/artist/b', // duplicate kind — first wins
      'https://someband.bandcamp.com/',
    ]);
    expect(links.map((l) => l.kind)).toEqual(['spotify', 'bandcamp', 'discogs']);
    expect(links[0].url).toBe('https://open.spotify.com/artist/a');
  });
});
