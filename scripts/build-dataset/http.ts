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
 *      not failure. It also, less politely, answers 200 with an error or maintenance
 *      page, which callers can reject via `validate` (see {@link fetchUsable}).
 *
 * Rule the cache depends on: **a body that fails validation is never written.** A stored
 * bad page poisons that entry for every later run, and only a scheduled run prunes it.
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { CACHE_DIR, USER_AGENT } from './config';

const RETRIES = 5;
const RETRY_BASE_MS = 5000;

/** Serialises requests per host so the rate limit holds even with concurrent callers. */
const hostQueues = new Map<string, Promise<void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decides whether a 200 body is the thing we actually asked for. Returning `false`
 * makes the request retry and keeps the body out of the cache.
 */
export type ValidateBody = (body: string) => boolean;

/** Injection seams. Production passes nothing; tests pass a stub fetch and a no-op sleep. */
export interface FetchUsableDeps {
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  retries?: number;
  backoffMs?: number;
}

/**
 * Fetch until the response is usable, or give up.
 *
 * Three retryable conditions, all of which look like success at the transport layer
 * and would otherwise be cached as if they were real content:
 *
 *   - 503/429 — MusicBrainz throttling.
 *   - A 200 with an empty body (seen 2026-08-07).
 *   - A 200 whose body fails `validate` (seen 2026-08-09 — see the note below).
 */
export async function fetchUsable(
  url: string,
  validate: ValidateBody = () => true,
  deps: FetchUsableDeps = {},
): Promise<string> {
  const {
    fetchImpl = fetch,
    sleepImpl = sleep,
    retries = RETRIES,
    backoffMs = RETRY_BASE_MS,
  } = deps;
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT } });
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`${url} returned ${response.status}`);
        await sleepImpl(backoffMs * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      const body = await response.text();
      if (body.trim() === '') {
        // Seen in the wild (2026-08-07): a 200 with an empty body, which would
        // poison the cache and crash every JSON.parse downstream. Retryable.
        lastError = new Error(`${url} returned an empty body`);
        await sleepImpl(backoffMs * (attempt + 1));
        continue;
      }
      if (!validate(body)) {
        // A 200 carrying the wrong page — MusicBrainz serves error and maintenance
        // pages this way. This is what killed the 2026-08-09 refresh: one such page
        // at 1400/2184 was cached, tripped stage 2's guard, and aborted a ~3-hour
        // job. Transient, so retry; and never cache it, or every later run repeats
        // the failure without ever re-fetching.
        lastError = new Error(`${url} returned a body that failed validation`);
        await sleepImpl(backoffMs * (attempt + 1));
        continue;
      }
      return body;
    } catch (error) {
      // Network-level failure (DNS, reset, offline). Same treatment as throttling.
      lastError = error;
      await sleepImpl(backoffMs * (attempt + 1));
    }
  }
  throw new Error(`Giving up on ${url} after ${retries} attempts`, { cause: lastError });
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
 *
 * `validate` guards both directions: a fresh body that fails it is retried and never
 * cached, and a CACHED body that fails it is deleted and re-fetched. The second half
 * matters because `refresh-data.yml` prunes the volatile cache only on `schedule`
 * events — without it, a manual re-dispatch after a poisoned run reuses the bad entry
 * and fails identically, forever.
 */
export async function cachedFetch(
  url: string,
  cachePath: string,
  delayMs: number,
  validate?: ValidateBody,
): Promise<string> {
  const file = path.join(CACHE_DIR, cachePath);
  const cached = await readCache(file);
  if (cached !== null) {
    if (validate === undefined || validate(cached)) return cached;
    await unlink(file).catch(() => {
      // Already gone, or unlinkable. The re-fetch below still returns a good body;
      // the worst case is that the bad entry is overwritten rather than removed.
    });
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
    const body = await fetchUsable(url, validate);
    await writeCache(file, body);
    return body;
  } finally {
    // Start the spacing clock only after the response, so retries can't stack up
    // faster than the limit.
    void sleep(delayMs).then(release);
  }
}
