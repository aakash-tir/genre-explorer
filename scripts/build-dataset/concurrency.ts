/**
 * Bounded-concurrency map, so the pipeline can keep several upstreams busy at once.
 *
 * WHY THIS EXISTS, and why it is not a rate-limit violation. The pipeline talks to
 * three services with three independent limits: MusicBrainz (1 req/s, the strict one),
 * ListenBrainz (300 ms, self-imposed) and Deezer (110 ms, plus a 6-30 s backoff when it
 * answers over-quota). Until now every stage awaited one call at a time, so all three
 * queues idled in turn: MusicBrainz sat still through every Deezer backoff and vice
 * versa. Measured on the 2026-08-16 scheduled run, that turned a 4.3 h MusicBrainz floor
 * into ~12 h of wall clock, which no 6-hour Actions job can hold.
 *
 * The per-HOST queues in `http.ts` are what make overlapping safe: every request still
 * waits its turn behind the previous request to the SAME host, so MusicBrainz stays at
 * exactly 1 req/s no matter how many callers are in flight. Concurrency here only lets a
 * Deezer call proceed while a MusicBrainz call is waiting — it never widens either
 * limit. Raising this cap therefore cannot make us a worse citizen; the host queues, not
 * this number, are the contract.
 *
 * Order is preserved: results come back positionally, matching `items`, so the emitted
 * dataset is byte-identical whatever the completion order. That matters because the
 * dataset is a committed artifact and a refresh diff has to stay reviewable.
 */

/**
 * Run `worker` over `items` with at most `limit` in flight, returning results in the
 * ORIGINAL order. A rejection propagates once every in-flight worker has settled, so a
 * failure cannot leave stray requests running against a rate-limited host.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) throw new Error(`concurrency limit must be >= 1, got ${limit}`);
  const results = new Array<R>(items.length);
  let next = 0;
  let failure: unknown;
  let failed = false;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length || failed) return;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        // Record the first failure and stop handing out work, but let the other
        // runners finish what they already started rather than abandoning in-flight
        // requests mid-flight.
        if (!failed) {
          failed = true;
          failure = error;
        }
        return;
      }
    }
  });

  await Promise.all(runners);
  if (failed) throw failure;
  return results;
}
