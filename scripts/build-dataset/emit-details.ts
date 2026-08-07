/**
 * Emit `public/data/genres/<id>.json` — the detail panel's lazy-loaded payload.
 *
 * Validated against the shared `GenreDetail` schema on the way out (and again by the
 * app on the way in). Track links stay empty in milestone 4: artist links come from
 * URL relationships, but per-recording lookups would double the pipeline's runtime —
 * milestone 6 adds Deezer previews and track links together (see docs/future.md).
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
