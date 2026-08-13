/**
 * Emit `public/data/genres/<id>.json` — the detail panel's lazy-loaded payload.
 *
 * Validated against the shared `GenreDetail` schema on the way out (and again by the
 * app on the way in).
 *
 * `Track.links` is emitted EMPTY and is expected to stay that way. Artist links come
 * from MusicBrainz URL relationships, but recordings carry none — four ranked tracks
 * probed live on 2026-08-12 returned zero relations each, so a per-recording pass would
 * add ~9,000 requests at 1 req/s for almost nothing. The panel derives song links at
 * render time instead (`src/lib/trackLinks.ts`): a Spotify search link plus the exact
 * Deezer page from the id stage 6 already resolved. The field stays in the schema
 * because a derived link yields to a real one the moment a source can supply it.
 * Evidence: docs/research/music-data-sources.md §4.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { GenreDetail } from '../../src/types';

export const DETAILS_DIR = 'public/data/genres';

export async function emitDetail(detail: GenreDetail): Promise<void> {
  const parsed = GenreDetail.parse(detail);
  await mkdir(DETAILS_DIR, { recursive: true });
  const file = path.join(DETAILS_DIR, `${parsed.id}.json`);
  await writeFile(file, JSON.stringify(parsed) + '\n', 'utf8');
}
