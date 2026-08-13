/**
 * The retry rules that decide what is allowed to reach the disk cache.
 *
 * This is the pipeline's resume mechanism, so a bad body written here is not one bad
 * request — it is a permanent one. The 2026-08-09 refresh died exactly that way: a 200
 * carrying a MusicBrainz error page was cached at genre 1400 of 2184, aborting a
 * ~3-hour job, and because the workflow prunes the volatile cache only on scheduled
 * runs, a manual re-dispatch would have replayed the same failure from cache.
 *
 * Only `fetchUsable` is exercised: `cachedFetch` wraps it with real filesystem and
 * per-host queueing, which is verified by reading. The retry/validation decision — the
 * part that was actually wrong — is pure enough to pin here, with `sleepImpl` stubbed so
 * the suite doesn't sit through the real 5s backoff.
 */
import { describe, expect, it, vi } from 'vitest';

import { fetchUsable } from '../../scripts/build-dataset/http';

/** Minimal stand-in for the bits of Response that `fetchUsable` touches. */
function response(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as Response;
}

/** A stub `fetch` that returns each response in turn. */
function fetchReturning(...responses: Response[]) {
  let call = 0;
  const impl = vi.fn(async () => responses[Math.min(call++, responses.length - 1)]!);
  return impl as unknown as typeof fetch & { mock: { calls: unknown[] } };
}

const fast = { sleepImpl: async () => {}, backoffMs: 0, retries: 4 };

const GENRE_PAGE =
  '<html><title>nu disco - Genre information - MusicBrainz</title></html>';
const ERROR_PAGE = '<html><title>MusicBrainz — temporarily unavailable</title></html>';
const isGenrePage = (body: string) => body.includes('Genre information - MusicBrainz');

describe('fetchUsable', () => {
  it('returns the body and makes one request when it validates', async () => {
    const fetchImpl = fetchReturning(response(GENRE_PAGE));
    const body = await fetchUsable('https://mb.test/genre/x', isGenrePage, {
      ...fast,
      fetchImpl,
    });
    expect(body).toBe(GENRE_PAGE);
    expect(fetchImpl.mock.calls).toHaveLength(1);
  });

  it('retries a 200 that carries the wrong page, then succeeds', async () => {
    // The 2026-08-09 failure. Before the fix this body was returned and cached.
    const fetchImpl = fetchReturning(response(ERROR_PAGE), response(GENRE_PAGE));
    const body = await fetchUsable('https://mb.test/genre/x', isGenrePage, {
      ...fast,
      fetchImpl,
    });
    expect(body).toBe(GENRE_PAGE);
    expect(fetchImpl.mock.calls).toHaveLength(2);
  });

  it('gives up, naming the url, when every attempt fails validation', async () => {
    const fetchImpl = fetchReturning(response(ERROR_PAGE));
    await expect(
      fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl }),
    ).rejects.toThrow(/Giving up on https:\/\/mb\.test\/genre\/x after 4 attempts/);
    expect(fetchImpl.mock.calls).toHaveLength(4);
  });

  it('keeps the underlying reason as the error cause', async () => {
    const fetchImpl = fetchReturning(response(ERROR_PAGE));
    let caught: Error | undefined;
    try {
      await fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl });
    } catch (error) {
      caught = error as Error;
    }
    // Without the cause, the operator sees only "giving up" and not which of the
    // three retryable conditions actually kept firing.
    expect((caught?.cause as Error | undefined)?.message).toMatch(/failed validation/);
  });

  it('accepts any non-empty 200 when no validator is given', async () => {
    // Back-compat: every other caller passes nothing and must be unaffected.
    const fetchImpl = fetchReturning(response(ERROR_PAGE));
    await expect(
      fetchUsable('https://mb.test/anything', undefined, { ...fast, fetchImpl }),
    ).resolves.toBe(ERROR_PAGE);
    expect(fetchImpl.mock.calls).toHaveLength(1);
  });

  it('still retries throttling responses', async () => {
    const fetchImpl = fetchReturning(response('', 503), response(GENRE_PAGE));
    await expect(
      fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl }),
    ).resolves.toBe(GENRE_PAGE);
    expect(fetchImpl.mock.calls).toHaveLength(2);
  });

  it('still retries an empty 200 body', async () => {
    const fetchImpl = fetchReturning(response('   '), response(GENRE_PAGE));
    await expect(
      fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl }),
    ).resolves.toBe(GENRE_PAGE);
    expect(fetchImpl.mock.calls).toHaveLength(2);
  });

  it('retries a network-level failure', async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      if (call++ === 0) throw new Error('ECONNRESET');
      return response(GENRE_PAGE);
    }) as unknown as typeof fetch;
    await expect(
      fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl }),
    ).resolves.toBe(GENRE_PAGE);
  });

  it('does not retry a non-throttling error status', async () => {
    const fetchImpl = fetchReturning(response('nope', 404));
    await expect(
      fetchUsable('https://mb.test/genre/x', isGenrePage, { ...fast, fetchImpl }),
    ).rejects.toThrow(/Giving up/);
  });
});
