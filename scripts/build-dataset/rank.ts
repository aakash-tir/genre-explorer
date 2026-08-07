/**
 * Stage 5 — the popular/obscure split, via ListenBrainz listen counts.
 *
 * Uses the POST bulk endpoints; the documented per-artist GET endpoints returned 500
 * on 2026-08-04 (see docs/future.md, "Upstream watch"). Null listen counts are real
 * and common — a candidate with no ListenBrainz data ranks as 0 and can never make
 * either list, because "obscure" still requires {@link OBSCURE_MIN_LISTENS} genuine
 * listens: the bottom of the distribution is data artifacts, not hidden gems.
 *
 * `selectEntities` is pure and unit-tested; the fetch wrappers around it are not.
 */
import { z } from 'zod';

import { ENTITIES_PER_LIST, LISTENBRAINZ_DELAY_MS, OBSCURE_MIN_LISTENS } from './config';
import { cachedPost } from './http';

const ArtistPopularity = z.array(
  z.object({
    artist_mbid: z.uuid(),
    total_listen_count: z.number().int().nonnegative().nullable(),
  }),
);

const RecordingPopularity = z.array(
  z.object({
    recording_mbid: z.uuid(),
    total_listen_count: z.number().int().nonnegative().nullable(),
  }),
);

export async function fetchArtistListens(
  genreMbid: string,
  artistMbids: readonly string[],
): Promise<Map<string, number>> {
  if (artistMbids.length === 0) return new Map();
  const body = await cachedPost(
    'https://api.listenbrainz.org/1/popularity/artist',
    { artist_mbids: artistMbids },
    `lb-artists/${genreMbid}.json`,
    LISTENBRAINZ_DELAY_MS,
  );
  const parsed = ArtistPopularity.parse(JSON.parse(body));
  return new Map(parsed.map((row) => [row.artist_mbid, row.total_listen_count ?? 0]));
}

export async function fetchRecordingListens(
  genreMbid: string,
  recordingMbids: readonly string[],
): Promise<Map<string, number>> {
  if (recordingMbids.length === 0) return new Map();
  const body = await cachedPost(
    'https://api.listenbrainz.org/1/popularity/recording',
    { recording_mbids: recordingMbids },
    `lb-recordings/${genreMbid}.json`,
    LISTENBRAINZ_DELAY_MS,
  );
  const parsed = RecordingPopularity.parse(JSON.parse(body));
  return new Map(parsed.map((row) => [row.recording_mbid, row.total_listen_count ?? 0]));
}

export interface Ranked<T> {
  entity: T;
  listens: number;
}

export interface Selection<T> {
  popular: Ranked<T>[];
  obscure: Ranked<T>[];
}

/**
 * Split ranked candidates into the panel's two bands.
 *
 *   popular — top {@link ENTITIES_PER_LIST} by listens, most-listened first.
 *   obscure — of the REST with at least {@link OBSCURE_MIN_LISTENS} listens, the
 *             least-listened {@link ENTITIES_PER_LIST}, least-listened first.
 *
 * Deterministic: ties break on mbid so a rerun emits identical files. Either list may
 * come back short — a thin genre is shown thin, not padded with junk.
 */
export function selectEntities<T extends { mbid: string }>(
  candidates: readonly T[],
  listensByMbid: ReadonlyMap<string, number>,
): Selection<T> {
  const ranked = candidates
    .map((entity) => ({ entity, listens: listensByMbid.get(entity.mbid) ?? 0 }))
    .filter((r) => r.listens > 0)
    .sort((a, b) => b.listens - a.listens || a.entity.mbid.localeCompare(b.entity.mbid));

  const popular = ranked.slice(0, ENTITIES_PER_LIST);
  const obscure = ranked
    .slice(ENTITIES_PER_LIST)
    .filter((r) => r.listens >= OBSCURE_MIN_LISTENS)
    .reverse()
    .slice(0, ENTITIES_PER_LIST);

  return { popular, obscure };
}
