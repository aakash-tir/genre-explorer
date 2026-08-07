/**
 * Stage 3b — turn raw genres + mbid edges + counts into the map's node and edge lists.
 *
 * Pure and unit-tested (`tests/scripts/build-graph.test.ts`); everything here decides
 * WHAT is on the map, which is exactly the logic the project rules say must stay out of
 * fetch code and render code.
 *
 * The decisions made here, in order:
 *
 *   1. THRESHOLD — genres under `minReleaseGroups` tagged release-groups are dropped.
 *      ~40% of MusicBrainz genres cannot fill a detail panel; a node that opens to
 *      nothing breaks the core promise, so it never gets drawn.
 *   2. ONE DRAWN PARENT — the renderer draws a tree. A genre with several `subgenre of`
 *      parents keeps the most popular one as its drawn edge; the other parent relations
 *      are DEMOTED to `influence` so focusing those parents still reveals the child
 *      (associative reveal), but no second line is ever drawn.
 *   3. CYCLES — MusicBrainz is user-edited; a relation loop must not hang the BFS. The
 *      most popular node of any cycle has its parent edge cut and becomes a root.
 *   4. DEPTH + FAMILY — BFS over the chosen tree. Roots are their own family. Orphans
 *      (no parent, post-threshold) simply stay roots of size-one families — no
 *      synthetic "music" node gluing the map together.
 */
import type { GenreEdge, GenreNode } from '../../src/types';

import type { GenreRef } from './fetch-genres';
import type { MbidEdge } from './fetch-hierarchy';

/** GenreNode minus the baked coordinates, which the layout stage adds last. */
export type UnplacedNode = Omit<GenreNode, 'x' | 'y'>;

export interface BuiltGraph {
  nodes: UnplacedNode[];
  edges: GenreEdge[];
  report: {
    /** Genres dropped by the threshold. */
    dropped: number;
    /** Children that had >1 subgenre parent; extra parent edges demoted to influence. */
    multiParent: number;
    /** Parent edges cut to break relation cycles. */
    cyclesBroken: number;
    /** Surviving nodes with no structural parent (each is its own family root). */
    roots: number;
  };
}

/** `melodic techno` → `melodic-techno`; strips diacritics so ids stay URL-safe ASCII. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildGraph(
  genres: readonly GenreRef[],
  mbidEdges: readonly MbidEdge[],
  counts: ReadonlyMap<string, number>,
  minReleaseGroups: number,
): BuiltGraph {
  // 1. Threshold.
  const surviving = genres.filter((g) => (counts.get(g.mbid) ?? 0) >= minReleaseGroups);
  const dropped = genres.length - surviving.length;
  const alive = new Set(surviving.map((g) => g.mbid));

  // Slugs. Collisions and unsluggable names fall back to the mbid, which is unique.
  const slugByMbid = new Map<string, string>();
  const taken = new Set<string>();
  for (const genre of [...surviving].sort((a, b) => a.name.localeCompare(b.name))) {
    let slug = slugify(genre.name);
    if (!slug || taken.has(slug)) slug = genre.mbid;
    taken.add(slug);
    slugByMbid.set(genre.mbid, slug);
  }

  const popularity = (mbid: string) => counts.get(mbid) ?? 0;

  // 2. One drawn parent per child. Deterministic: most popular parent wins, ties by
  // name so a rerun on identical data emits an identical file.
  const liveEdges = mbidEdges.filter((e) => alive.has(e.source) && alive.has(e.target));
  const parentsByChild = new Map<string, string[]>();
  for (const e of liveEdges) {
    if (e.kind !== 'subgenre') continue;
    const list = parentsByChild.get(e.target) ?? [];
    if (!list.includes(e.source)) list.push(e.source);
    parentsByChild.set(e.target, list);
  }

  let multiParent = 0;
  const chosenParent = new Map<string, string>();
  const demoted: MbidEdge[] = [];
  for (const [child, parents] of parentsByChild) {
    const ranked = [...parents].sort(
      (a, b) => popularity(b) - popularity(a) || a.localeCompare(b),
    );
    chosenParent.set(child, ranked[0]);
    if (ranked.length > 1) {
      multiParent++;
      for (const extra of ranked.slice(1)) {
        demoted.push({ source: extra, target: child, kind: 'influence' });
      }
    }
  }

  // 3. Break cycles. BFS from the roots; anything unreached is inside a loop. Cut the
  // parent edge of the loop's most popular node so it becomes a root itself.
  let cyclesBroken = 0;
  for (;;) {
    const reached = new Set<string>();
    const queue = surviving.map((g) => g.mbid).filter((mbid) => !chosenParent.has(mbid));
    queue.forEach((mbid) => reached.add(mbid));
    const childrenOf = new Map<string, string[]>();
    for (const [child, parent] of chosenParent) {
      const list = childrenOf.get(parent) ?? [];
      list.push(child);
      childrenOf.set(parent, list);
    }
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const child of childrenOf.get(current) ?? []) {
        if (reached.has(child)) continue;
        reached.add(child);
        queue.push(child);
      }
    }
    const trapped = surviving.filter((g) => !reached.has(g.mbid));
    if (trapped.length === 0) break;
    const cut = trapped.sort(
      (a, b) => popularity(b.mbid) - popularity(a.mbid) || a.mbid.localeCompare(b.mbid),
    )[0];
    chosenParent.delete(cut.mbid);
    cyclesBroken++;
  }

  // 4. Depth and family over the final tree.
  const depth = new Map<string, number>();
  const family = new Map<string, string>();
  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of chosenParent) {
    const list = childrenOf.get(parent) ?? [];
    list.push(child);
    childrenOf.set(parent, list);
  }
  const queue: string[] = [];
  let roots = 0;
  for (const genre of surviving) {
    if (chosenParent.has(genre.mbid)) continue;
    roots++;
    depth.set(genre.mbid, 0);
    family.set(genre.mbid, slugByMbid.get(genre.mbid) as string);
    queue.push(genre.mbid);
  }
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const child of childrenOf.get(current) ?? []) {
      depth.set(child, (depth.get(current) as number) + 1);
      family.set(child, family.get(current) as string);
      queue.push(child);
    }
  }

  const nodes: UnplacedNode[] = surviving.map((genre) => ({
    id: slugByMbid.get(genre.mbid) as string,
    mbid: genre.mbid,
    name: genre.name,
    popularity: popularity(genre.mbid),
    depth: depth.get(genre.mbid) as number,
    family: family.get(genre.mbid) as string,
  }));

  // Final edge list: the chosen tree as `subgenre`, everything associative as-is,
  // demotions included. Deduplicated per (kind, source, target).
  const bySlug = (mbid: string) => slugByMbid.get(mbid) as string;
  const seen = new Set<string>();
  const edges: GenreEdge[] = [];
  const push = (source: string, target: string, kind: GenreEdge['kind']) => {
    const key = `${kind} ${source} ${target}`;
    if (seen.has(key) || source === target) return;
    seen.add(key);
    edges.push({ source, target, kind });
  };
  for (const [child, parent] of chosenParent)
    push(bySlug(parent), bySlug(child), 'subgenre');
  for (const e of [...liveEdges.filter((e) => e.kind !== 'subgenre'), ...demoted]) {
    push(bySlug(e.source), bySlug(e.target), e.kind);
  }

  return { nodes, edges, report: { dropped, multiParent, cyclesBroken, roots } };
}
