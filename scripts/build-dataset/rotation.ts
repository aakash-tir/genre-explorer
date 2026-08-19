/**
 * The rolling refresh queue — which genres are due for a rebuild today.
 *
 * The refresh used to be one weekly job that rebuilt all 912 genres at once. It never
 * once succeeded: a cold build is ~14,010 MusicBrainz requests, and at the 1 req/s the
 * project is bound to that is 4.3 h of pure waiting before Deezer's backoffs are
 * counted. The 2026-08-16 run reached 325/913 genres in 5 h 50 m and was cancelled at
 * the job ceiling — which also killed the cache-save step, so it saved nothing and the
 * next week started cold again. An unbreakable loop, and the reason `public/data` had
 * never once been refreshed automatically.
 *
 * So the unit of work is now a DAY, not a dataset. Each run rebuilds the
 * {@link SHARD_SIZE} least-recently-refreshed genres and lands them the same day, which
 * keeps `public/data` complete and valid at every moment — only the AGE of a given
 * genre varies, never whether it is there. A branch accumulating a fortnight of work
 * would have meant the live site serving stale data for the whole fortnight.
 *
 * There is deliberately NO cursor file. "Due next" is `refreshedAt` ascending, derived
 * from the data itself, so the queue cannot drift out of step with what was actually
 * written: a new genre has no file and sorts first, a deleted genre leaves the queue by
 * vanishing, and a day that fails corrupts no pointer — those genres stay oldest and go
 * again tomorrow.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { GenreDetail, type GenreNode } from '../../src/types';
import { DETAILS_DIR } from './emit-details';

/**
 * Genres rebuilt per daily run. 912 genres / 66 = 13.8, so the whole map turns over in
 * 14 days and no genre is ever more than a fortnight stale. (65 would be 15 days — the
 * unit test pins the fortnight, so this constant cannot drift past it unnoticed.)
 *
 * Sized against the steady-state cost, not the cold one: once an artist's streaming
 * links and Deezer ids are cached (they change essentially never), a genre costs ~2
 * MusicBrainz requests, so 66 genres is ~5 minutes of actual waiting. The expensive
 * first pass — 7,796 artist links and 8,132 Deezer lookups — spreads itself across the
 * first rotation instead of having to fit in one job.
 */
export const SHARD_SIZE = 66;

/** A genre and when its panel was last rebuilt; `null` means never. */
export interface RefreshCandidate {
  node: GenreNode;
  refreshedAt: string | null;
}

/**
 * Choose today's shard: the `size` least-recently-refreshed genres.
 *
 * Pure, so the ordering rule is testable without touching disk. Never-refreshed genres
 * sort before every dated one; ties break on genre id so two runs over identical input
 * pick the identical shard and the emitted diff stays reviewable.
 */
export function selectShard(
  candidates: readonly RefreshCandidate[],
  size: number,
): GenreNode[] {
  return [...candidates]
    .sort((a, b) => {
      if (a.refreshedAt === b.refreshedAt) return a.node.id.localeCompare(b.node.id);
      if (a.refreshedAt === null) return -1;
      if (b.refreshedAt === null) return 1;
      return (
        a.refreshedAt.localeCompare(b.refreshedAt) || a.node.id.localeCompare(b.node.id)
      );
    })
    .slice(0, Math.max(0, size))
    .map((candidate) => candidate.node);
}

/**
 * Read each node's current `refreshedAt` off disk. A file that is missing, unreadable
 * or fails validation counts as never refreshed — the genre is then rebuilt today,
 * which is also how a corrupt detail file repairs itself.
 */
export async function readRefreshTimes(
  nodes: readonly GenreNode[],
): Promise<RefreshCandidate[]> {
  return Promise.all(
    nodes.map(async (node) => {
      try {
        const raw: unknown = JSON.parse(
          await readFile(path.join(DETAILS_DIR, `${node.id}.json`), 'utf8'),
        );
        const parsed = GenreDetail.safeParse(raw);
        return {
          node,
          refreshedAt: parsed.success ? (parsed.data.refreshedAt ?? null) : null,
        };
      } catch {
        return { node, refreshedAt: null };
      }
    }),
  );
}
