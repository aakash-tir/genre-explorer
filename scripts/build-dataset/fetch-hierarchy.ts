/**
 * Stage 2 — scrape the genre tree out of the HTML pages.
 *
 * ~2,184 pages at 1 req/s is about 40 minutes on a cold cache and seconds on a warm one.
 * Every relation is declared on both pages it touches ("subgenre of" on the child,
 * "subgenres" on the parent), so one malformed page cannot lose an edge — the
 * counterpart supplies it and `dedupe` collapses the pair.
 */
import type { RelationKind } from '../../src/types';

import { MUSICBRAINZ_DELAY_MS } from './config';
import type { GenreRef } from './fetch-genres';
import { cachedFetch } from './http';
import { looksLikeGenrePage, parseGenrePage } from './parse-genre-page';

/** An edge at the mbid level, before slugs exist. Source is the parent / more general. */
export interface MbidEdge {
  source: string;
  target: string;
  kind: RelationKind;
}

function dedupe(edges: MbidEdge[]): MbidEdge[] {
  const seen = new Set<string>();
  return edges.filter((e) => {
    const key = `${e.kind} ${e.source} ${e.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchHierarchy(
  genres: readonly GenreRef[],
  log: (message: string) => void = console.log,
): Promise<MbidEdge[]> {
  const known = new Set(genres.map((g) => g.mbid));
  const edges: MbidEdge[] = [];
  let done = 0;

  for (const genre of genres) {
    const html = await cachedFetch(
      `https://musicbrainz.org/genre/${genre.mbid}`,
      `genre-pages/${genre.mbid}.html`,
      MUSICBRAINZ_DELAY_MS,
    );
    if (!looksLikeGenrePage(html)) {
      throw new Error(
        `Page for ${genre.name} (${genre.mbid}) does not look like a genre page — ` +
          'MusicBrainz layout change or error page. Delete it from the cache and rerun; ' +
          'if it persists, the parser fixtures need re-saving.',
      );
    }
    const rels = parseGenrePage(html);

    const add = (source: string, target: string, kind: RelationKind) => {
      // A relation can point at a genre missing from /genre/all (deleted or merged
      // upstream between stages). An edge to a node that will never exist is noise.
      if (known.has(source) && known.has(target)) edges.push({ source, target, kind });
    };
    for (const r of rels.parents) add(r.mbid, genre.mbid, 'subgenre');
    for (const r of rels.children) add(genre.mbid, r.mbid, 'subgenre');
    for (const r of rels.fusionOf) add(r.mbid, genre.mbid, 'fusion');
    for (const r of rels.fusionGenres) add(genre.mbid, r.mbid, 'fusion');
    for (const r of rels.influencedBy) add(r.mbid, genre.mbid, 'influence');
    for (const r of rels.influencedGenres) add(genre.mbid, r.mbid, 'influence');

    done++;
    if (done % 100 === 0) log(`  hierarchy: ${done}/${genres.length} pages`);
  }

  return dedupe(edges);
}
