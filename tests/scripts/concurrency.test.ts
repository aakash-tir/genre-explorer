/**
 * Bounded-concurrency map. Two properties matter and both are load-bearing:
 * results stay in input order (the dataset is a committed artifact, so a refresh diff
 * must not churn on completion order), and the cap is actually respected.
 */
import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '../../scripts/build-dataset/concurrency';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapWithConcurrency', () => {
  it('returns results in INPUT order, not completion order', async () => {
    // Deliberately inverted delays: the last item finishes first.
    const out = await mapWithConcurrency([30, 20, 10, 0], 4, async (ms, i) => {
      await tick(ms);
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3]);
  });

  it('never exceeds the concurrency cap', async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await tick(1);
        inFlight--;
      },
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // it really is running concurrently
  });

  it('actually overlaps — 4 slow items at limit 4 take ~1 item of time', async () => {
    const started = Date.now();
    await mapWithConcurrency([40, 40, 40, 40], 4, async (ms) => tick(ms));
    expect(Date.now() - started).toBeLessThan(140); // serial would be ~160ms
  });

  it('processes every item when there are more items than slots', async () => {
    const out = await mapWithConcurrency(
      Array.from({ length: 50 }, (_, i) => i),
      3,
      async (n) => n * 2,
    );
    expect(out).toHaveLength(50);
    expect(out[49]).toBe(98);
  });

  it('handles an empty list without hanging', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it('propagates the first failure', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });

  it('lets in-flight work settle before rejecting, so no request is abandoned', async () => {
    // A stray in-flight request against a rate-limited host would keep consuming the
    // budget after the run has given up.
    let settled = 0;
    await expect(
      mapWithConcurrency([1, 2, 3, 4], 4, async (n) => {
        if (n === 1) throw new Error('boom');
        await tick(20);
        settled++;
        return n;
      }),
    ).rejects.toThrow('boom');
    expect(settled).toBe(3);
  });

  it('rejects a nonsensical limit rather than silently serialising', async () => {
    await expect(mapWithConcurrency([1], 0, async (n) => n)).rejects.toThrow(
      /limit must be >= 1/,
    );
  });
});
