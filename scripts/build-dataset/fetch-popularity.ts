/**
 * Stage 3a — how much music exists in each genre.
 *
 * One search per genre: `GET /ws/2/release-group?query=tag:"<name>"&limit=1` and read
 * the `count` field. The releases themselves are discarded — only the count matters.
 * This is the number that sizes the node AND decides whether the genre makes the map
 * at all (see the threshold filter in `build-graph.ts`).
 */
import { z } from 'zod';

import { MUSICBRAINZ_DELAY_MS } from './config';
import type { GenreRef } from './fetch-genres';
import { cachedFetch } from './http';

const CountResponse = z.object({ count: z.number().int().nonnegative() });

/** Lucene special characters that would change the query's meaning inside quotes. */
function escapeLucene(name: string): string {
  return name.replace(/(["\\])/g, '\\$1');
}

export async function fetchPopularity(
  genres: readonly GenreRef[],
  log: (message: string) => void = console.log,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  let done = 0;

  for (const genre of genres) {
    const query = encodeURIComponent(`tag:"${escapeLucene(genre.name)}"`);
    const body = await cachedFetch(
      `https://musicbrainz.org/ws/2/release-group?query=${query}&limit=1&fmt=json`,
      `rg-counts/${genre.mbid}.json`,
      MUSICBRAINZ_DELAY_MS,
    );
    counts.set(genre.mbid, CountResponse.parse(JSON.parse(body)).count);

    done++;
    if (done % 100 === 0) log(`  popularity: ${done}/${genres.length} genres`);
  }

  return counts;
}
