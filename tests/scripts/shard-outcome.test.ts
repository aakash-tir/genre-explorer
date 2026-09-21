/**
 * The tolerance rule for a partly-failed shard. This decides whether a day's work
 * lands or is thrown away, which is exactly the judgement that cost the rotation 12
 * of its first 34 days when the answer was always "throw it away".
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_FAILED_FRACTION,
  MIN_TOLERATED_FAILURES,
  judgeShard,
} from '../../scripts/build-dataset/shard-outcome';
import { SHARD_SIZE } from '../../scripts/build-dataset/rotation';

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `genre-${i}`);
}

describe('judgeShard', () => {
  it('accepts a clean shard', () => {
    const outcome = judgeShard(SHARD_SIZE, []);
    expect(outcome.acceptable).toBe(true);
    expect(outcome.succeeded).toBe(SHARD_SIZE);
    expect(outcome.failed).toBe(0);
    expect(outcome.summary).toContain(`${SHARD_SIZE}/${SHARD_SIZE}`);
  });

  // THE regression. Every real incident in the first month of the rotation was one
  // genre 503-ing, and every one of them discarded the whole day. If this ever goes
  // back to unacceptable, the rotation has lost a third of its days again.
  it('lands the day when a single genre fails, as in every observed incident', () => {
    const outcome = judgeShard(SHARD_SIZE, ['trova']);
    expect(outcome.acceptable).toBe(true);
    expect(outcome.succeeded).toBe(SHARD_SIZE - 1);
    expect(outcome.summary).toContain('trova');
  });

  it('names the failures so a genre that fails every day is visible as itself', () => {
    const outcome = judgeShard(SHARD_SIZE, ['trova', 'tropical-house']);
    expect(outcome.summary).toContain('trova');
    expect(outcome.summary).toContain('tropical-house');
  });

  it('caps the named list but still reports the true count', () => {
    const outcome = judgeShard(SHARD_SIZE, ids(14));
    expect(outcome.failed).toBe(14);
    expect(outcome.summary).toContain('+4 more');
  });

  it('fails the run when the upstream is down rather than flaky', () => {
    const tooMany = Math.floor(SHARD_SIZE * MAX_FAILED_FRACTION) + 1;
    expect(judgeShard(SHARD_SIZE, ids(tooMany)).acceptable).toBe(false);
  });

  it('holds the line exactly at the ceiling', () => {
    const atLimit = Math.floor(SHARD_SIZE * MAX_FAILED_FRACTION);
    expect(judgeShard(SHARD_SIZE, ids(atLimit)).acceptable).toBe(true);
    expect(judgeShard(SHARD_SIZE, ids(atLimit + 1)).acceptable).toBe(false);
  });

  // A percentage alone would abort a `--shard=4` repair dispatch on one flaky genre,
  // which is the all-or-nothing behaviour this change exists to remove.
  it('does not revert to all-or-nothing on a small manual shard', () => {
    expect(judgeShard(4, ['trova']).acceptable).toBe(true);
    expect(judgeShard(4, ids(MIN_TOLERATED_FAILURES)).acceptable).toBe(true);
    expect(judgeShard(4, ids(MIN_TOLERATED_FAILURES + 1)).acceptable).toBe(false);
  });

  it('fails a shard where everything failed', () => {
    expect(judgeShard(SHARD_SIZE, ids(SHARD_SIZE)).acceptable).toBe(false);
  });

  // A graph-only run passes no genres through here; nothing was attempted, so there
  // is nothing to have got wrong.
  it('treats an empty shard as a no-op, not a failure', () => {
    const outcome = judgeShard(0, []);
    expect(outcome.acceptable).toBe(true);
    expect(outcome.succeeded).toBe(0);
  });
});
