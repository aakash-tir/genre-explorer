/**
 * Stage 4 — candidate artists and recordings per genre, via MusicBrainz tag search.
 *
 * Over-fetches {@link SEARCH_LIMIT} of each: ranking happens later against
 * ListenBrainz, where many candidates turn out to have no listen data at all, and
 * recording results carry near-duplicates (the same song across releases) that are
 * deduped here by (title, artist) keeping search order.
 *
 * SEARCH RELEVANCE IS NOT TAG AGREEMENT. This is the single most important thing
 * about this stage. MusicBrainz scores `tag:"indie rock"` by Lucene relevance over
 * the whole document, so it returns artists who merely look related — The Beatles
 * came back FIRST for indie rock while carrying an `indie rock` tag count of -3,
 * i.e. one users had voted down. Because the next stage ranks survivors by listen
 * count, a loose match on a hugely popular artist beat every genuine member of the
 * genre. That is how The Beatles ended up filed under heavy metal and filk, and
 * Coldplay under ambient — a tag Coldplay does not carry at all.
 *
 * So the vote count is the gate, not the search rank: every candidate must carry the
 * genre's own tag with at least {@link MIN_TAG_VOTES}. The counts ride along in the
 * SAME search response (`tags[]`), so this costs no extra requests — confirmed
 * against the live API and the full 912-genre response cache on 2026-08-17.
 */
import { z } from 'zod';

import {
  MIN_TAG_VOTES,
  MUSICBRAINZ_DELAY_MS,
  SEARCH_LIMIT,
  SPECIAL_PURPOSE_ARTIST_MBIDS,
} from './config';
import { cachedFetch } from './http';

/**
 * `tags` is absent when an entity has none, and counts are signed — a net-negative
 * count means the community voted the tag down.
 */
const Tag = z.object({ name: z.string(), count: z.number().int() });

const ArtistSearch = z.object({
  artists: z.array(
    z.object({
      id: z.uuid(),
      name: z.string().min(1),
      tags: z.array(Tag).optional(),
    }),
  ),
});

const RecordingSearch = z.object({
  recordings: z.array(
    z.object({
      id: z.uuid(),
      title: z.string().min(1),
      'artist-credit': z
        .array(z.object({ name: z.string(), joinphrase: z.string().optional() }))
        .optional(),
      tags: z.array(Tag).optional(),
    }),
  ),
});

export interface CandidateArtist {
  mbid: string;
  name: string;
  /** Community votes for THIS genre's tag. Always >= {@link MIN_TAG_VOTES}. */
  tagVotes: number;
}

export interface CandidateRecording {
  mbid: string;
  title: string;
  artistName: string;
  /** Community votes for THIS genre's tag. Always >= {@link MIN_TAG_VOTES}. */
  tagVotes: number;
}

export interface GenreCandidates {
  artists: CandidateArtist[];
  recordings: CandidateRecording[];
}

/** Lucene special characters that would change the query's meaning inside quotes. */
function escapeLucene(name: string): string {
  return name.replace(/(["\\])/g, '\\$1');
}

/**
 * Tag names are compared case-insensitively and with unicode dashes folded to ASCII:
 * MusicBrainz genre names and user tags disagree on both (`Hip-Hop` vs `hip hop`,
 * `neo‐soul` with U+2010 vs `neo-soul`), and a mismatch here silently reads as
 * "untagged" and would drop a legitimate candidate.
 */
export function normalizeTagName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u2010-\u2015]/g, '-')
    .trim();
}

/**
 * Votes for `genreName` on an entity, or `null` when the entity does not carry the
 * tag at all. Null and 0 are deliberately distinct: absent means nobody ever applied
 * it, 0 means it was applied and then voted back to neutral. Both fail the gate, but
 * only the second is evidence anyone considered the question.
 */
export function tagVotesFor(
  tags: readonly { name: string; count: number }[] | undefined,
  genreName: string,
): number | null {
  const target = normalizeTagName(genreName);
  const match = tags?.find((tag) => normalizeTagName(tag.name) === target);
  return match ? match.count : null;
}

/** The gate: carries the genre's tag with real support, and is an actual artist. */
function qualifies(votes: number | null): votes is number {
  return votes !== null && votes >= MIN_TAG_VOTES;
}

export async function fetchEntities(genre: {
  mbid: string;
  name: string;
}): Promise<GenreCandidates> {
  const query = encodeURIComponent(`tag:"${escapeLucene(genre.name)}"`);

  const artistBody = await cachedFetch(
    `https://musicbrainz.org/ws/2/artist?query=${query}&limit=${SEARCH_LIMIT}&fmt=json`,
    `artist-search/${genre.mbid}.json`,
    MUSICBRAINZ_DELAY_MS,
  );
  const artists: CandidateArtist[] = [];
  for (const a of ArtistSearch.parse(JSON.parse(artistBody)).artists) {
    if (SPECIAL_PURPOSE_ARTIST_MBIDS.has(a.id)) continue;
    const votes = tagVotesFor(a.tags, genre.name);
    if (!qualifies(votes)) continue;
    artists.push({ mbid: a.id, name: a.name, tagVotes: votes });
  }

  const recordingBody = await cachedFetch(
    `https://musicbrainz.org/ws/2/recording?query=${query}&limit=${SEARCH_LIMIT}&fmt=json`,
    `recording-search/${genre.mbid}.json`,
    MUSICBRAINZ_DELAY_MS,
  );
  const seen = new Set<string>();
  const recordings: CandidateRecording[] = [];
  for (const r of RecordingSearch.parse(JSON.parse(recordingBody)).recordings) {
    const votes = tagVotesFor(r.tags, genre.name);
    if (!qualifies(votes)) continue;
    const artistName = (r['artist-credit'] ?? [])
      .map((credit) => credit.name + (credit.joinphrase ?? ''))
      .join('')
      .trim();
    if (!artistName) continue;
    const key = `${r.title.toLowerCase()} — ${artistName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recordings.push({ mbid: r.id, title: r.title, artistName, tagVotes: votes });
  }

  return { artists, recordings };
}
