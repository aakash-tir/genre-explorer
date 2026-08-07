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
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
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
      const body = await response.text();
      if (body.trim() === '') {
        // Seen in the wild (2026-08-07): a 200 with an empty body, which would
        // poison the cache and crash every JSON.parse downstream. Retryable.
        lastError = new Error(`${url} returned an empty body`);
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      return body;
    } catch (error) {
      // Network-level failure (DNS, reset, offline). Same treatment as throttling.
      lastError = error;
      await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw new Error(`Giving up on ${url} after ${RETRIES} attempts`, { cause: lastError });
}

/** Read a cache entry, treating empty/truncated-to-nothing files as absent. */
async function readCache(file: string): Promise<string | null> {
  try {
    const cached = await readFile(file, 'utf8');
    return cached.trim() === '' ? null : cached;
  } catch {
    return null;
  }
}

/**
 * Write-then-rename so a killed process can never leave a truncated entry — the
 * cache is shared across pipeline stages and genres, so one bad file would resurface
 * as a crash far from where it was written.
 *
 * The rename is retried: on Windows, antivirus/indexing briefly locks new files and
 * throws transient EPERM (killed a run at genre 784, 2026-08-07). If it still fails,
 * fall back to a direct write — losing atomicity for one entry beats losing the run,
 * and the empty-file guard in {@link readCache} contains the worst case.
 */
async function writeCache(file: string, body: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, body, 'utf8');
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rename(tmp, file);
      return;
    } catch {
      await sleep(100 * (attempt + 1));
    }
  }
  await writeFile(file, body, 'utf8');
}

async function postWithRetry(url: string, body: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' },
        body,
      });
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`${url} returned ${response.status}`);
        await sleep(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw new Error(`Giving up on ${url} after ${RETRIES} attempts`, { cause: lastError });
}

/**
 * POST with the same caching and per-host spacing as {@link cachedFetch}. The cache
 * key must encode the request body (e.g. a genre mbid) — the URL alone is not unique.
 */
export async function cachedPost(
  url: string,
  body: unknown,
  cachePath: string,
  delayMs: number,
): Promise<string> {
  const file = path.join(CACHE_DIR, cachePath);
  const cached = await readCache(file);
  if (cached !== null) return cached;
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
    const text = await postWithRetry(url, JSON.stringify(body));
    await writeCache(file, text);
    return text;
  } finally {
    void sleep(delayMs).then(release);
  }
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
  const cached = await readCache(file);
  if (cached !== null) return cached;

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
    await writeCache(file, body);
    return body;
  } finally {
    // Start the spacing clock only after the response, so retries can't stack up
    // faster than the limit.
    void sleep(delayMs).then(release);
  }
}
