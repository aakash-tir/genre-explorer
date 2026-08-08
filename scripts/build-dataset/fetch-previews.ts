/**
 * Stage 6 — resolve each ranked track to a Deezer track id.
 *
 * The id, not the preview URL: Deezer's preview MP3 links carry an `hdnea` token
 * that expires in ~12 minutes (verified live, 2026-08-08 — a HEAD on the bare URL
 * returns 403). A static dataset can only hold something stable, so the panel
 * embeds Deezer's widget player by id instead of an <audio> element.
 *
 * Deezer failure modes handled here:
 *   - Rate limiting is HTTP 200 with `{"error":{"code":4}}` — must not be cached,
 *     or the slot is poisoned forever. Detected, cache entry deleted, retried.
 *   - No match is `{"data":[]}` — cached happily; that track just has no preview.
 */
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { CACHE_DIR, DEEZER_DELAY_MS } from './config';
import { cachedFetch } from './http';

const DeezerSearch = z.object({
  data: z.array(z.object({ id: z.number().int().positive() })).optional(),
  error: z.object({ code: z.number() }).optional(),
});

const QUOTA_RETRIES = 5;
const QUOTA_BACKOFF_MS = 6000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchDeezerId(track: {
  mbid: string;
  title: string;
  artistName: string;
}): Promise<number | undefined> {
  const query = encodeURIComponent(
    `artist:"${track.artistName.replace(/"/g, '')}" track:"${track.title.replace(/"/g, '')}"`,
  );
  const cachePath = `deezer/${track.mbid}.json`;

  for (let attempt = 0; attempt < QUOTA_RETRIES; attempt++) {
    const body = await cachedFetch(
      `https://api.deezer.com/search?q=${query}&limit=1`,
      cachePath,
      DEEZER_DELAY_MS,
    );
    const parsed = DeezerSearch.safeParse(JSON.parse(body));
    if (!parsed.success) return undefined;
    if (parsed.data.error) {
      // Quota answers 200 — purge the poisoned cache entry and back off.
      await unlink(path.join(CACHE_DIR, cachePath)).catch(() => {});
      await sleep(QUOTA_BACKOFF_MS * (attempt + 1));
      continue;
    }
    return parsed.data.data?.[0]?.id;
  }
  return undefined;
}
