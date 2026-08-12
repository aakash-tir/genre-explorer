/**
 * The public intake path. Pinned against the response shapes verified live on
 * 2026-08-10 and 2026-08-12 (research doc §3): payload.artists[] for stats, 204
 * for uncomputed stats, the year → all_time fallback, and the raw-listens
 * fallback for accounts the stats pipeline hasn't reached.
 */
import { describe, expect, it } from 'vitest';

import {
  ListenBrainzError,
  fetchListenBrainzTopArtists,
  topArtistsFromListens,
  type RawListen,
} from '../../src/personal/listenbrainz';

type Handler = (url: string) => Response;

function fakeFetch(handler: Handler): typeof fetch {
  return (input) => Promise.resolve(handler(String(input)));
}

const ok = (artists: unknown) =>
  new Response(JSON.stringify({ payload: { artists } }), { status: 200 });
const okListens = (listens: unknown) =>
  new Response(JSON.stringify({ payload: { listens } }), { status: 200 });
const noContent = () => new Response(null, { status: 204 });

/** A mapped listen, the way ListenBrainz returns Spotify-imported history. */
const mappedListen = (name: string, mbid: string, listenedAt = 1000): RawListen => ({
  listened_at: listenedAt,
  track_metadata: {
    artist_name: name,
    mbid_mapping: { artists: [{ artist_credit_name: name, artist_mbid: mbid }] },
  },
});

const unmappedListen = (name: string, spotifyUrl?: string): RawListen => ({
  listened_at: 1000,
  track_metadata: {
    artist_name: name,
    additional_info: {
      artist_names: [name],
      ...(spotifyUrl === undefined ? {} : { spotify_artist_ids: [spotifyUrl] }),
    },
  },
});

describe('fetchListenBrainzTopArtists', () => {
  it('maps the stats payload into ranked artists with mbids', async () => {
    const artists = await fetchListenBrainzTopArtists(
      'rob',
      fakeFetch(() =>
        ok([
          { artist_mbid: '8229a8f1-b315-4fae-af57-b3eb71efdaf4', artist_name: 'CBL' },
          { artist_name: 'No Mbid Act' },
        ]),
      ),
    );
    expect(artists).toEqual([
      { mbid: '8229a8f1-b315-4fae-af57-b3eb71efdaf4', name: 'CBL', rank: 0 },
      { name: 'No Mbid Act', rank: 1 },
    ]);
  });

  it('falls back from year to all_time when year stats are missing', async () => {
    const seen: string[] = [];
    const artists = await fetchListenBrainzTopArtists(
      'newuser',
      fakeFetch((url) => {
        seen.push(url);
        return url.includes('range=year') ? noContent() : ok([{ artist_name: 'A' }]);
      }),
    );
    expect(artists).toHaveLength(1);
    expect(seen[0]).toContain('range=year');
    expect(seen[1]).toContain('range=all_time');
  });

  it('reports stats-pending when every range is empty', async () => {
    const attempt = fetchListenBrainzTopArtists('brandnew', fakeFetch(noContent));
    await expect(attempt).rejects.toThrowError(ListenBrainzError);
    await attempt.catch((error: unknown) => {
      expect((error as ListenBrainzError).statsPending).toBe(true);
    });
  });

  it('names the user in the 404 error', async () => {
    await expect(
      fetchListenBrainzTopArtists(
        'nobody',
        fakeFetch(() => new Response(null, { status: 404 })),
      ),
    ).rejects.toThrowError(/nobody/);
  });

  it('URL-encodes the username', async () => {
    const seen: string[] = [];
    await fetchListenBrainzTopArtists(
      'name with spaces',
      fakeFetch((url) => {
        seen.push(url);
        return ok([{ artist_name: 'A' }]);
      }),
    );
    expect(seen[0]).toContain('/stats/user/name%20with%20spaces/artists');
  });

  it('falls back to counting raw listens when no stats range is computed', async () => {
    const seen: string[] = [];
    const artists = await fetchListenBrainzTopArtists(
      'aakash-tir',
      fakeFetch((url) => {
        seen.push(url);
        if (url.includes('/stats/')) return noContent();
        return okListens([
          mappedListen('Röyksopp', 'mbid-roy'),
          mappedListen('Röyksopp', 'mbid-roy'),
          mappedListen('Sister Sledge', 'mbid-sis'),
        ]);
      }),
    );
    expect(seen.filter((url) => url.includes('/stats/'))).toHaveLength(2);
    expect(seen[2]).toContain('/user/aakash-tir/listens?count=');
    expect(artists).toEqual([
      { mbid: 'mbid-roy', name: 'Röyksopp', rank: 0 },
      { mbid: 'mbid-sis', name: 'Sister Sledge', rank: 1 },
    ]);
  });

  it('pages the listens feed via max_ts until a short page', async () => {
    const seen: string[] = [];
    const fullPage = Array.from({ length: 1000 }, (_, position) =>
      mappedListen('Solo Act', 'mbid-solo', 5000 - position),
    );
    const artists = await fetchListenBrainzTopArtists(
      'busy',
      fakeFetch((url) => {
        seen.push(url);
        if (url.includes('/stats/')) return noContent();
        if (!url.includes('max_ts')) return okListens(fullPage);
        return okListens([mappedListen('Solo Act', 'mbid-solo', 100)]);
      }),
    );
    const listenUrls = seen.filter((url) => url.includes('/listens'));
    expect(listenUrls).toHaveLength(2);
    expect(listenUrls[1]).toContain('max_ts=4001');
    expect(artists).toEqual([{ mbid: 'mbid-solo', name: 'Solo Act', rank: 0 }]);
  });

  it('reports stats-pending when the listens feed is empty too', async () => {
    const attempt = fetchListenBrainzTopArtists(
      'silent',
      fakeFetch((url) => (url.includes('/stats/') ? noContent() : okListens([]))),
    );
    await expect(attempt).rejects.toThrowError(ListenBrainzError);
    await attempt.catch((error: unknown) => {
      expect((error as ListenBrainzError).statsPending).toBe(true);
    });
  });
});

describe('topArtistsFromListens', () => {
  it('ranks by play count and carries the mapped mbid', () => {
    const listens = [
      mappedListen('B Act', 'mbid-b'),
      mappedListen('A Act', 'mbid-a'),
      mappedListen('B Act', 'mbid-b'),
    ];
    expect(topArtistsFromListens(listens)).toEqual([
      { mbid: 'mbid-b', name: 'B Act', rank: 0 },
      { mbid: 'mbid-a', name: 'A Act', rank: 1 },
    ]);
  });

  it('merges mapped and unmapped listens of the same artist by normalized name', () => {
    const listens = [
      mappedListen('Röyksopp', 'mbid-roy'),
      unmappedListen('röyksopp'),
      mappedListen('Other', 'mbid-other'),
    ];
    const [top] = topArtistsFromListens(listens);
    expect(top).toEqual({ mbid: 'mbid-roy', name: 'Röyksopp', rank: 0 });
  });

  it('drops an id two different mbids claim rather than guessing', () => {
    const listens = [mappedListen('Bush', 'mbid-uk'), mappedListen('Bush', 'mbid-ca')];
    expect(topArtistsFromListens(listens)).toEqual([{ name: 'Bush', rank: 0 }]);
  });

  it('credits every artist of a multi-artist mapping', () => {
    const listens: RawListen[] = [
      {
        listened_at: 1,
        track_metadata: {
          artist_name: 'A & B',
          mbid_mapping: {
            artists: [
              { artist_credit_name: 'A', artist_mbid: 'mbid-a' },
              { artist_credit_name: 'B', artist_mbid: 'mbid-b' },
            ],
          },
        },
      },
    ];
    expect(topArtistsFromListens(listens)).toEqual([
      { mbid: 'mbid-a', name: 'A', rank: 0 },
      { mbid: 'mbid-b', name: 'B', rank: 1 },
    ]);
  });

  it('takes a Spotify id from unmapped single-artist listens only', () => {
    const solo = unmappedListen('Solo', 'https://open.spotify.com/artist/abc123');
    const duo: RawListen = {
      listened_at: 1,
      track_metadata: {
        artist_name: 'X & Y',
        additional_info: {
          artist_names: ['X', 'Y'],
          spotify_artist_ids: [
            'https://open.spotify.com/artist/xxx1',
            'https://open.spotify.com/artist/yyy2',
          ],
        },
      },
    };
    expect(topArtistsFromListens([solo, duo])).toEqual([
      { spotifyId: 'abc123', name: 'Solo', rank: 0 },
      { name: 'X', rank: 1 },
      { name: 'Y', rank: 2 },
    ]);
  });

  it('caps the list at the requested limit', () => {
    const listens = Array.from({ length: 5 }, (_, position) =>
      mappedListen(`Act ${String(position)}`, `mbid-${String(position)}`),
    );
    expect(topArtistsFromListens(listens, 2)).toHaveLength(2);
  });
});
