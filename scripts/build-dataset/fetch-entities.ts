/**
 * Stage 4 — candidate artists and recordings per genre, via MusicBrainz tag search.
 *
 * Over-fetches {@link SEARCH_LIMIT} of each: ranking happens later against
 * ListenBrainz, where many candidates turn out to have no listen data at all, and
 * recording results carry near-duplicates (the same song across releases) that are
 * deduped here by (title, artist) keeping search order.
 */
import { z } from 'zod';

import { MUSICBRAINZ_DELAY_MS, SEARCH_LIMIT } from './config';
import { cachedFetch } from './http';

const ArtistSearch = z.object({
  artists: z.array(z.object({ id: z.uuid(), name: z.string().min(1) })),
});

const RecordingSearch = z.object({
  recordings: z.array(
    z.object({
      id: z.uuid(),
      title: z.string().min(1),
      'artist-credit': z
        .array(z.object({ name: z.string(), joinphrase: z.string().optional() }))
        .optional(),
    }),
  ),
});

export interface CandidateArtist {
  mbid: string;
  name: string;
}

export interface CandidateRecording {
  mbid: string;
  title: string;
  artistName: string;
}

export interface GenreCandidates {
  artists: CandidateArtist[];
  recordings: CandidateRecording[];
}

/** Lucene special characters that would change the query's meaning inside quotes. */
function escapeLucene(name: string): string {
  return name.replace(/(["\\])/g, '\\$1');
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
  const artists = ArtistSearch.parse(JSON.parse(artistBody)).artists.map((a) => ({
    mbid: a.id,
    name: a.name,
  }));

  const recordingBody = await cachedFetch(
    `https://musicbrainz.org/ws/2/recording?query=${query}&limit=${SEARCH_LIMIT}&fmt=json`,
    `recording-search/${genre.mbid}.json`,
    MUSICBRAINZ_DELAY_MS,
  );
  const seen = new Set<string>();
  const recordings: CandidateRecording[] = [];
  for (const r of RecordingSearch.parse(JSON.parse(recordingBody)).recordings) {
    const artistName = (r['artist-credit'] ?? [])
      .map((credit) => credit.name + (credit.joinphrase ?? ''))
      .join('')
      .trim();
    if (!artistName) continue;
    const key = `${r.title.toLowerCase()} — ${artistName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recordings.push({ mbid: r.id, title: r.title, artistName });
  }

  return { artists, recordings };
}
