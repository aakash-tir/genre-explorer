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
 * Stats are computed by a batch pipeline that can lag WEEKS behind the listen
 * store (observed 2026-08-12: accounts with 70k+ listens and every stats range
 * returning 204). When no range has stats, {@link fetchListenBrainzTopArtists}
 * falls back to paging the raw listens feed and counting artists client-side —
 * listens carry `mbid_mapping.artists[].artist_mbid`, so matching stays exact
 * for everything ListenBrainz has mapped.
 *
 * Part of the app's scoped runtime-network exception (user-initiated only; the
 * map never depends on it). Network calls take a `fetchImpl` per convention.
 */
import { normalizeArtistName, spotifyArtistIdFromUrl } from '../lib/artistNames';
import type { ListenedArtist } from './match';

export const LISTENBRAINZ_API = 'https://api.listenbrainz.org/1';
const COUNT = 100;
/** Listens-feed fallback: the API's page maximum, and how many pages to read. */
const LISTENS_PAGE_SIZE = 1000;
const LISTENS_MAX_PAGES = 3;

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

/** One listen from the raw feed — only the fields the fallback reads. */
export interface RawListen {
  listened_at?: unknown;
  track_metadata?: {
    artist_name?: unknown;
    additional_info?: {
      artist_names?: unknown;
      spotify_artist_ids?: unknown;
    };
    mbid_mapping?: {
      artists?: { artist_credit_name?: unknown; artist_mbid?: unknown }[] | null;
    } | null;
  };
}

interface ListensResponse {
  payload?: { listens?: RawListen[] };
}

interface ArtistTally {
  name: string;
  count: number;
  mbids: Set<string>;
  spotifyIds: Set<string>;
}

/** The artists a single listen credits, with whatever ids it carries. */
function creditsOf(
  listen: RawListen,
): { name: string; mbid?: string; spotifyId?: string }[] {
  const metadata = listen.track_metadata;
  if (metadata === undefined) return [];

  // Best case: ListenBrainz mapped the listen — per-artist names AND mbids.
  const mapped = metadata.mbid_mapping?.artists;
  if (Array.isArray(mapped) && mapped.length > 0) {
    return mapped.flatMap((artist) =>
      typeof artist.artist_credit_name === 'string'
        ? [
            {
              name: artist.artist_credit_name,
              ...(typeof artist.artist_mbid === 'string'
                ? { mbid: artist.artist_mbid }
                : {}),
            },
          ]
        : [],
    );
  }

  // Unmapped: fall back to the submitted names. Spotify ids are only trusted
  // when the credit is a single artist with a single id — the two arrays have
  // no guaranteed alignment beyond that.
  const info = metadata.additional_info;
  const names = Array.isArray(info?.artist_names)
    ? info.artist_names.filter((name): name is string => typeof name === 'string')
    : typeof metadata.artist_name === 'string'
      ? [metadata.artist_name]
      : [];
  const spotifyUrls = Array.isArray(info?.spotify_artist_ids)
    ? info.spotify_artist_ids.filter((url): url is string => typeof url === 'string')
    : [];
  const soleSpotifyId =
    names.length === 1 && spotifyUrls.length === 1
      ? spotifyArtistIdFromUrl(spotifyUrls[0])
      : null;
  return names.map((name) => ({
    name,
    ...(soleSpotifyId !== null ? { spotifyId: soleSpotifyId } : {}),
  }));
}

/**
 * Play-count ranking over raw listens; pure, exported for tests. Tallies are
 * keyed by normalized name so mapped and unmapped listens of the same artist
 * merge; an id (mbid/Spotify) is kept only when every listen agrees on it, so
 * a name collision degrades to name matching instead of crediting the wrong
 * artist.
 */
export function topArtistsFromListens(
  listens: readonly RawListen[],
  limit = COUNT,
): ListenedArtist[] {
  const tallies = new Map<string, ArtistTally>();
  for (const listen of listens) {
    for (const credit of creditsOf(listen)) {
      const key = normalizeArtistName(credit.name);
      if (key === '') continue;
      const tally = tallies.get(key) ?? {
        name: credit.name,
        count: 0,
        mbids: new Set<string>(),
        spotifyIds: new Set<string>(),
      };
      tally.count += 1;
      if (credit.mbid !== undefined) tally.mbids.add(credit.mbid);
      if (credit.spotifyId !== undefined) tally.spotifyIds.add(credit.spotifyId);
      tallies.set(key, tally);
    }
  }
  return [...tallies.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((tally, position) => ({
      ...(tally.mbids.size === 1 ? { mbid: [...tally.mbids][0] } : {}),
      ...(tally.spotifyIds.size === 1 ? { spotifyId: [...tally.spotifyIds][0] } : {}),
      name: tally.name,
      rank: position,
    }));
}

/**
 * Recent listens, newest first, paged via `max_ts` up to
 * {@link LISTENS_MAX_PAGES} pages. Exported for the fallback path's tests.
 */
export async function fetchRecentListens(
  username: string,
  fetchImpl: typeof fetch,
): Promise<RawListen[]> {
  const collected: RawListen[] = [];
  let maxTs: number | null = null;
  for (let page = 0; page < LISTENS_MAX_PAGES; page += 1) {
    const url =
      `${LISTENBRAINZ_API}/user/${encodeURIComponent(username)}/listens` +
      `?count=${LISTENS_PAGE_SIZE}${maxTs === null ? '' : `&max_ts=${maxTs}`}`;
    let response: Response;
    try {
      response = await fetchImpl(url);
    } catch (cause) {
      throw new ListenBrainzError(
        `Could not reach ListenBrainz: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    if (response.status === 204) break;
    if (response.status === 404) {
      throw new ListenBrainzError(`No ListenBrainz user called “${username}”.`);
    }
    if (!response.ok) {
      throw new ListenBrainzError(`ListenBrainz returned ${response.status}`);
    }
    const raw = (await response.json().catch(() => ({}))) as ListensResponse;
    const listens = raw.payload?.listens;
    if (!Array.isArray(listens) || listens.length === 0) break;
    collected.push(...listens);
    const oldest = listens.reduce<number | null>(
      (acc, listen) =>
        typeof listen.listened_at === 'number' &&
        (acc === null || listen.listened_at < acc)
          ? listen.listened_at
          : acc,
      null,
    );
    if (oldest === null || listens.length < LISTENS_PAGE_SIZE) break;
    maxTs = oldest;
  }
  return collected;
}

/**
 * Top artists for a username, ranked. Prefers the computed stats endpoints
 * (year, then all_time); when the stats pipeline has nothing for the account,
 * falls back to counting the raw listens feed. Throws {@link ListenBrainzError}
 * with `statsPending` only when the account has no usable listens either.
 */
export async function fetchListenBrainzTopArtists(
  username: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ListenedArtist[]> {
  for (const range of RANGES) {
    const artists = await fetchRange(username, range, fetchImpl);
    if (artists !== null && artists.length > 0) return artists;
  }
  const fromListens = topArtistsFromListens(
    await fetchRecentListens(username, fetchImpl),
  );
  if (fromListens.length > 0) return fromListens;
  throw new ListenBrainzError(
    'ListenBrainz has no listens for this account yet — link a streaming ' +
      'service at listenbrainz.org, then try again once listens appear.',
    true,
  );
}
