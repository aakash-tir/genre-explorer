/**
 * Did today's shard do enough to be worth landing?
 *
 * The rolling refresh used to be all-or-nothing: `mapWithConcurrency` threw on the
 * first rejection, the run exited non-zero, and every genre that had already been
 * written was discarded with it. Measured over the first month of the rotation
 * (2026-08-19 to 2026-09-21), that lost 12 of ~34 days — and every one of them to a
 * SINGLE transient upstream error:
 *
 *   2026-09-10  MusicBrainz recording?tag="trova"          503 after 5 attempts
 *   2026-09-12  MusicBrainz artist?tag="tropical house"    503 after 5 attempts
 *   2026-09-16  ListenBrainz /1/popularity/artist          connect ETIMEDOUT
 *
 * One genre in 66 discarding the 65 that had succeeded is a bad trade, because those
 * 65 were already correct and already on disk. So a failed genre now fails only
 * ITSELF: it is simply not written, which leaves its old `refreshedAt` in place, which
 * keeps it at the head of the queue `selectShard` derives, which is what schedules the
 * retry. No retry bookkeeping exists because none is needed — see `rotation.ts`.
 *
 * What still has to fail loudly is the other shape of failure: the upstream is down,
 * not flaky. A run where most of the shard failed has not refreshed anything worth
 * committing, and opening a PR for it every morning would teach us to ignore the PR.
 * Hence a ceiling rather than unlimited tolerance.
 */

/**
 * Fraction of a shard allowed to fail before the run itself is treated as failed.
 *
 * At {@link SHARD_SIZE} 66 this tolerates 16 failures and fails on the 17th. The
 * number is set from the observed failure SHAPE, not from a sense of what sounds
 * acceptable: every real incident above killed exactly one genre, so anything above a
 * couple already means something systemic, and a quarter leaves generous headroom
 * before the run stops being honest about being broken.
 */
export const MAX_FAILED_FRACTION = 0.25;

/**
 * Failures tolerated regardless of shard size.
 *
 * A fraction alone reverts to all-or-nothing on a SMALL shard: at `--shard=4`, one
 * flaky genre is 25% and would abort the run — the very behaviour being removed, just
 * at a size where it bites a manual repair dispatch rather than the daily rotation.
 * Two failures are weather at any size, so the ceiling is whichever rule is kinder.
 */
export const MIN_TOLERATED_FAILURES = 2;

export interface ShardOutcome {
  /** Genres whose detail files were written this run. */
  succeeded: number;
  /** Genres that threw and were left alone, to be retried on the next run. */
  failed: number;
  /** False when so much failed that the run should exit non-zero. */
  acceptable: boolean;
  /** One line for the run log, whichever way it went. */
  summary: string;
}

/**
 * Judge a finished shard. Pure, so the tolerance rule is testable without a network.
 *
 * `failedIds` is carried into the summary rather than just counted — when a genre
 * fails every day it will be the same id every day, and that is the signal that it is
 * not transient at all but a genre the pipeline can no longer build.
 */
export function judgeShard(
  attempted: number,
  failedIds: readonly string[],
): ShardOutcome {
  const failed = failedIds.length;
  const succeeded = attempted - failed;
  const ceiling = Math.max(
    MIN_TOLERATED_FAILURES,
    Math.floor(attempted * MAX_FAILED_FRACTION),
  );
  // An empty shard is a no-op, not a failure: there was nothing to get wrong.
  const acceptable = attempted === 0 || failed <= ceiling;

  const listed = failedIds.slice(0, 10).join(', ');
  const more = failed > 10 ? ` (+${failed - 10} more)` : '';
  const detail =
    failed === 0 ? '' : ` · failed and left for the next run: ${listed}${more}`;

  return {
    succeeded,
    failed,
    acceptable,
    summary: acceptable
      ? `shard: ${succeeded}/${attempted} genres refreshed${detail}`
      : `shard: only ${succeeded}/${attempted} genres refreshed — more than ` +
        `${Math.round(MAX_FAILED_FRACTION * 100)}% failed, which is an upstream outage, ` +
        `not weather${detail}`,
  };
}
