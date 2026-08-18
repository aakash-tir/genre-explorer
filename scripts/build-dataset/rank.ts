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
 * How strongly a candidate represents its genre: tag agreement × reach.
 *
 * Listens ALONE was the original rule, and it made the panel a popularity chart
 * filtered by a genre word rather than a picture of the genre. Even after the intake
 * gate (`fetch-entities.ts`) removed the outright false members, britpop still led
 * with The Beatles on a single tag vote while Oasis — 14 votes — sat fifth, because
 * 144M listens beats 38M no matter what the tag says.
 *
 * Both terms are compressed, for opposite reasons:
 *   - `sqrt(votes)` — a 47-vote artist is a surer member than a 1-vote artist, but
 *     not 47 times surer, and vote counts track how long an artist has been on
 *     MusicBrainz as much as consensus.
 *   - `log10(listens)` — listens span five orders of magnitude, so untransformed they
 *     drown the vote term completely. This is the same reasoning that makes node
 *     radius logarithmic.
 *
 * Checked against genres with an unambiguous right answer: britpop now leads Blur,
 * Oasis, Pulp (was The Beatles, Radiohead, Coldplay); ambient leads Brian Eno,
 * Tangerine Dream, Moby (was Radiohead, Coldplay); and rock is unchanged at The
 * Beatles, Queen, The Rolling Stones — the megastars keep the genres they really
 * do define.
 *
 * NO SMOOTHING ON THE VOTE TERM, and this is deliberate — `sqrt(votes + k)` was tried
 * and rejected. About a third of panels are thin enough that every member sits at 1-2
 * votes, and there a single extra vote outweighs an order of magnitude of listens,
 * which looks arbitrary: `boogie` ranks Dua Lipa (2 votes, 1.7M) above Michael Jackson
 * (1 vote, 29M). Smoothing fixes that case and breaks a worse one. In `bolero`,
 * `sqrt(votes + 2)` promotes Gloria Estefan (1 vote, 871k listens) over Gilberto Santa
 * Rosa (2 votes, 116k) and Julio Jaramillo (2 votes, 36k) — a famous outsider
 * displacing two canonical members, which is the megastar bug in miniature and lands
 * hardest on exactly the non-Western genres the backlog already worries about.
 *
 * So the thin-tag jitter is the accepted cost. Protecting regional genres from
 * Anglo-American megastars is worth more than ordering two marginal boogie tags
 * correctly.
 */
export function panelScore(tagVotes: number, listens: number): number {
  return Math.sqrt(Math.max(tagVotes, 0)) * Math.log10(listens + 1);
}

/**
 * Split ranked candidates into the panel's two bands.
 *
 *   popular — top {@link ENTITIES_PER_LIST} by {@link panelScore}, strongest first.
 *   obscure — of the REST with at least {@link OBSCURE_MIN_LISTENS} listens, the
 *             least-listened {@link ENTITIES_PER_LIST}, least-listened first.
 *
 * The two bands rank on deliberately different keys. "Popular" asks which artists
 * best represent the genre, so it weighs tag agreement; "obscure" asks who is barely
 * heard, which is a pure listen-count question — scoring it would just surface
 * well-tagged artists rather than quiet ones. Both draw from the same tag-gated pool,
 * so neither can contain a non-member.
 *
 * Deterministic: ties break on mbid so a rerun emits identical files. Either list may
 * come back short — a thin genre is shown thin, not padded with junk.
 */
export function selectEntities<T extends { mbid: string; tagVotes: number }>(
  candidates: readonly T[],
  listensByMbid: ReadonlyMap<string, number>,
): Selection<T> {
  const ranked = candidates
    .map((entity) => ({ entity, listens: listensByMbid.get(entity.mbid) ?? 0 }))
    .filter((r) => r.listens > 0);

  const byScore = [...ranked].sort(
    (a, b) =>
      panelScore(b.entity.tagVotes, b.listens) -
        panelScore(a.entity.tagVotes, a.listens) ||
      a.entity.mbid.localeCompare(b.entity.mbid),
  );

  const popular = byScore.slice(0, ENTITIES_PER_LIST);
  const promoted = new Set(popular.map((r) => r.entity.mbid));
  const obscure = ranked
    .filter((r) => !promoted.has(r.entity.mbid) && r.listens >= OBSCURE_MIN_LISTENS)
    .sort((a, b) => a.listens - b.listens || a.entity.mbid.localeCompare(b.entity.mbid))
    .slice(0, ENTITIES_PER_LIST);

  return { popular, obscure };
}
