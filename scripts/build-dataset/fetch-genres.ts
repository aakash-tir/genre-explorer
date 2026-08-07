/**
 * Stage 1 — the full genre list, with MBIDs.
 *
 * `?fmt=txt` returns names only; the HTML scrape in stage 2 needs MBIDs to build page
 * URLs, so this pages through the JSON form instead (~22 requests).
 */
import { z } from 'zod';

import { MUSICBRAINZ_DELAY_MS } from './config';
import { cachedFetch } from './http';

const PAGE_SIZE = 100;

const GenreListPage = z.object({
  'genre-count': z.number().int().positive(),
  genres: z.array(z.object({ id: z.uuid(), name: z.string().min(1) })),
});

export interface GenreRef {
  mbid: string;
  name: string;
}

export async function fetchGenres(): Promise<GenreRef[]> {
  const genres: GenreRef[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    const body = await cachedFetch(
      `https://musicbrainz.org/ws/2/genre/all?fmt=json&limit=${PAGE_SIZE}&offset=${offset}`,
      `genre-list/${offset}.json`,
      MUSICBRAINZ_DELAY_MS,
    );
    const page = GenreListPage.parse(JSON.parse(body));
    total = page['genre-count'];
    genres.push(...page.genres.map((g) => ({ mbid: g.id, name: g.name })));
  }
  return genres;
}
