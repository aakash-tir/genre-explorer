/**
 * The only place in the pipeline that talks to the network.
 *
 * Three jobs, all about being a good citizen of free services:
 *
 *   1. Rate limiting — one in-flight request per host, spaced by a per-host delay.
 *      MusicBrainz is 1 req/s and will block clients that ignore it; there is no paid
 *      tier to fall back to.
 *   2. Disk caching — every response is written under `CACHE_DIR` before being returned,
 *      so an interrupted 40-minute run resumes where it stopped instead of re-fetching
 *      2,184 pages. The cache is the resume mechanism, not an optimisation.
 *   3. Retrying — MusicBrainz answers 503 when it throttles; that is back-off-and-retry,
 *      not failure.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CACHE_DIR, USER_AGENT } from './config';

const RETRIES = 5;
const RETRY_BASE_MS = 5000;

/** Serialises requests per host so the rate limit holds even with concurrent callers. */
const hostQueues = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`${url} returned ${response.status}`);
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return await response.text();
    } catch (error) {
      // Network-level failure (DNS, reset, offline). Same treatment as throttling.
      lastError = error;
      await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw new Error(`Giving up on ${url} after ${RETRIES} attempts`, { cause: lastError });
}

/**
 * Fetch `url`, honouring the per-host `delayMs`, caching the body at
 * `CACHE_DIR/<cachePath>`. A cache hit makes no request and waits for nothing.
 */
export async function cachedFetch(
  url: string,
  cachePath: string,
  delayMs: number,
): Promise<string> {
  const file = path.join(CACHE_DIR, cachePath);
  try {
    return await readFile(file, 'utf8');
  } catch {
    // Not cached yet — fall through to the network.
  }

  const host = new URL(url).host;
  const previous = hostQueues.get(host) ?? Promise.resolve();
  let release!: () => void;
  hostQueues.set(
    host,
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  await previous;
  try {
    const body = await fetchWithRetry(url);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, 'utf8');
    return body;
  } finally {
    // Start the spacing clock only after the response, so retries can't stack up
    // faster than the limit.
    void sleep(delayMs).then(release);
  }
}
