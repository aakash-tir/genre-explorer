/**
 * The public intake path. Pinned against the response shape verified live on
 * 2026-08-10 (research doc §3): payload.artists[].artist_mbid/artist_name, 204
 * for uncomputed stats, and the year → all_time fallback.
 */
import { describe, expect, it } from 'vitest';

import {
  ListenBrainzError,
  fetchListenBrainzTopArtists,
} from '../../src/personal/listenbrainz';

type Handler = (url: string) => Response;

function fakeFetch(handler: Handler): typeof fetch {
  return (input) => Promise.resolve(handler(String(input)));
}

const ok = (artists: unknown) =>
  new Response(JSON.stringify({ payload: { artists } }), { status: 200 });
const noContent = () => new Response(null, { status: 204 });

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
});
