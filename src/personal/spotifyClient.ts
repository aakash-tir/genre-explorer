/**
 * The one Spotify Web API read the personal lens needs: the user's top artists.
 *
 * `GET /me/top/artists` survived the February 2026 purge (verified in
 * `docs/research/listening-history-personalization.md` §2). Two time ranges are
 * fetched and merged — `long_term` says who you are, `medium_term` says who you
 * are lately — so a recent obsession and an all-time staple both light up.
 */
import { SpotifyAuthError } from './spotifyAuth';

export const SPOTIFY_API = 'https://api.spotify.com/v1';
const PAGE_LIMIT = 50;
const TIME_RANGES = ['long_term', 'medium_term'] as const;

export interface TopArtist {
  spotifyId: string;
  name: string;
  /** 0-based; the best (lowest) position the artist holds across the time ranges. */
  rank: number;
}

interface TopArtistsResponse {
  items?: { id?: unknown; name?: unknown }[];
}

async function fetchRange(
  accessToken: string,
  timeRange: (typeof TIME_RANGES)[number],
  fetchImpl: typeof fetch,
): Promise<{ id: string; name: string }[]> {
  let response: Response;
  try {
    response = await fetchImpl(
      `${SPOTIFY_API}/me/top/artists?limit=${PAGE_LIMIT}&time_range=${timeRange}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch (cause) {
    throw new SpotifyAuthError(
      `Could not reach Spotify: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  if (response.status === 401) {
    throw new SpotifyAuthError('Spotify session expired', true);
  }
  if (response.status === 403) {
    // The dev-mode allowlist. This is the error a sixth user sees.
    throw new SpotifyAuthError(
      'Spotify refused access (403). In development mode only users added to the ' +
        "app's User Management allowlist can connect — see the runbook.",
    );
  }
  if (!response.ok) {
    throw new SpotifyAuthError(`Spotify returned ${response.status} for top artists`);
  }
  const raw = (await response.json().catch(() => ({}))) as TopArtistsResponse;
  const items = Array.isArray(raw.items) ? raw.items : [];
  return items.flatMap((item) =>
    typeof item.id === 'string' && typeof item.name === 'string'
      ? [{ id: item.id, name: item.name }]
      : [],
  );
}

/** Merge both time ranges, deduped by artist id, keeping each artist's best rank. */
export async function fetchTopArtists(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TopArtist[]> {
  const merged = new Map<string, TopArtist>();
  for (const timeRange of TIME_RANGES) {
    const items = await fetchRange(accessToken, timeRange, fetchImpl);
    items.forEach((item, position) => {
      const existing = merged.get(item.id);
      if (!existing || position < existing.rank) {
        merged.set(item.id, { spotifyId: item.id, name: item.name, rank: position });
      }
    });
  }
  return [...merged.values()].sort(
    (a, b) => a.rank - b.rank || a.name.localeCompare(b.name),
  );
}
