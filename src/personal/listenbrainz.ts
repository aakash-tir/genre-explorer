/**
 * ListenBrainz intake — the personal lens's PUBLIC path. Any visitor with a
 * ListenBrainz account (free; auto-imports Spotify/Last.fm listens once linked
 * there) types their username and the lens works. No cap, no key, no OAuth:
 * user statistics are public by design and the API sends
 * `Access-Control-Allow-Origin: *` (verified live 2026-08-10, research doc §3).
 *
 * Responses carry `artist_mbid` — the dataset's own primary key — so matching
 * on this path is exact, better than the Spotify path's id/name matching.
 *
 * Part of the app's scoped runtime-network exception (user-initiated only; the
 * map never depends on it). Network calls take a `fetchImpl` per convention.
 */
import type { ListenedArtist } from './match';

export const LISTENBRAINZ_API = 'https://api.listenbrainz.org/1';
const COUNT = 100;

/**
 * `year` reflects current taste; brand-new accounts sometimes only have
 * `all_time` computed, so it is the fallback before giving up.
 */
const RANGES = ['year', 'all_time'] as const;

export class ListenBrainzError extends Error {
  constructor(
    message: string,
    /** True for "stats not computed yet" — worth retrying tomorrow, not a dead end. */
    readonly statsPending = false,
  ) {
    super(message);
    this.name = 'ListenBrainzError';
  }
}

interface StatsResponse {
  payload?: {
    artists?: { artist_mbid?: unknown; artist_name?: unknown }[];
  };
}

async function fetchRange(
  username: string,
  range: (typeof RANGES)[number],
  fetchImpl: typeof fetch,
): Promise<ListenedArtist[] | null> {
  const url = `${LISTENBRAINZ_API}/stats/user/${encodeURIComponent(username)}/artists?count=${COUNT}&range=${range}`;
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new ListenBrainzError(
      `Could not reach ListenBrainz: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
  if (response.status === 204) return null; // stats for this range not computed
  if (response.status === 404) {
    throw new ListenBrainzError(`No ListenBrainz user called “${username}”.`);
  }
  if (!response.ok) {
    throw new ListenBrainzError(`ListenBrainz returned ${response.status}`);
  }
  const raw = (await response.json().catch(() => ({}))) as StatsResponse;
  const items = raw.payload?.artists;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, position) =>
    typeof item.artist_name === 'string'
      ? [
          {
            ...(typeof item.artist_mbid === 'string' ? { mbid: item.artist_mbid } : {}),
            name: item.artist_name,
            rank: position,
          },
        ]
      : [],
  );
}

/**
 * Top artists for a username, ranked. Throws {@link ListenBrainzError} with
 * `statsPending` when the account exists but has no computed stats yet (new
 * accounts take up to a day after their first listens arrive).
 */
export async function fetchListenBrainzTopArtists(
  username: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListenedArtist[]> {
  for (const range of RANGES) {
    const artists = await fetchRange(username, range, fetchImpl);
    if (artists !== null && artists.length > 0) return artists;
  }
  throw new ListenBrainzError(
    'ListenBrainz has no listening stats for this account yet — new accounts take ' +
      'up to a day after listens start arriving. Check back tomorrow.',
    true,
  );
}
