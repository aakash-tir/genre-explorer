/**
 * Stage 2 — scrape the genre tree out of the HTML pages.
 *
 * ~2,184 pages at 1 req/s is about 40 minutes on a cold cache and seconds on a warm one.
 * Every relation is declared on both pages it touches ("subgenre of" on the child,
 * "subgenres" on the parent), so one malformed page cannot lose an edge — the
 * counterpart supplies it and `dedupe` collapses the pair.
 *
 * `looksLikeGenrePage` is handed to `cachedFetch` rather than checked afterwards. That
 * ordering is the whole point: MusicBrainz occasionally answers 200 with an error page,
 * and validating after the write meant the bad page was already cached — so the run
 * aborted AND every later run replayed the same failure from cache. Validating inside
 * the fetch retries it instead, and keeps it out of the cache entirely.
 *
 * A page that stays unreadable across all retries still fails the run, deliberately: a
 * real MusicBrainz redesign must be loud. Stage 8's sharp-drop guard is a backstop for
 * the silent version of that, not a substitute for this.
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
    let html: string;
    try {
      html = await cachedFetch(
        `https://musicbrainz.org/genre/${genre.mbid}`,
        `genre-pages/${genre.mbid}.html`,
        MUSICBRAINZ_DELAY_MS,
        looksLikeGenrePage,
      );
    } catch (cause) {
      // Re-thrown with the genre name: the underlying error only knows the URL, and
      // "which genre" is the first thing you want when this fires.
      throw new Error(
        `Never got a usable genre page for ${genre.name} (${genre.mbid}). ` +
          'Transient error pages are already retried and never cached, so this is a real ' +
          'outage or a MusicBrainz layout change — if the page loads fine in a browser, ' +
          'the parser fixtures need re-saving.',
        { cause },
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
