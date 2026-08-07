/**
 * The dataset build pipeline. Run with `npm run build:dataset`.
 *
 * Everything that touches an external service happens here, at build time, never in the
 * browser. Responses are disk-cached under `.cache/build-dataset/` — a cold run is ~80
 * minutes (MusicBrainz is 1 req/s, not negotiable), a warm rerun is seconds, and an
 * interrupted run resumes where it stopped.
 *
 * Implemented (milestone 2):
 *
 *   1. fetch-genres      GET /ws/2/genre/all (JSON, paged)      → 2,184 {mbid, name}
 *   2. fetch-hierarchy   SCRAPE the genre HTML pages            → subgenre/fusion/influence
 *   3. fetch-popularity  release-group tag counts               → size + threshold filter
 *      build-graph       one drawn parent, depth, family, slugs → nodes + edges
 *   7. layout            d3-force, seeded, fixed ticks          → baked x/y
 *   8. emit              Zod + sharp-drop guard                 → public/data/graph.json
 *
 * Still stubs (milestone 4+): stage 4 fetch-entities, stage 5 rank (ListenBrainz),
 * stage 6 previews (Deezer) — the per-genre detail files in `public/data/genres/`.
 *
 * Stage 2 scrapes because MusicBrainz's genre relationships are NOT in the JSON API:
 * `inc=genre-rels` returns 200 with no relations (verified 2026-08-04). A pipeline that
 * trusted it would emit 2,184 orphan nodes and no error — hence the fixture-tested
 * parser and the sharp-drop guard in stage 8.
 */
import { MIN_RELEASE_GROUPS } from './config';
import { buildGraph } from './build-graph';
import { fetchGenres } from './fetch-genres';
import { fetchHierarchy } from './fetch-hierarchy';
import { fetchPopularity } from './fetch-popularity';
import { emitGraph } from './emit';
import { layoutGraph } from './layout';

export async function buildDataset(): Promise<void> {
  console.log('stage 1: genre list');
  const genres = await fetchGenres();
  console.log(`  ${genres.length} genres`);

  console.log('stage 2: hierarchy (cold cache ≈ 40 min at 1 req/s)');
  const mbidEdges = await fetchHierarchy(genres);
  console.log(`  ${mbidEdges.length} raw relations`);

  console.log('stage 3: popularity (cold cache ≈ 40 min at 1 req/s)');
  const counts = await fetchPopularity(genres);

  const { nodes, edges, report } = buildGraph(
    genres,
    mbidEdges,
    counts,
    MIN_RELEASE_GROUPS,
  );
  console.log(
    `  threshold ${MIN_RELEASE_GROUPS}: kept ${nodes.length}, dropped ${report.dropped} · ` +
      `${report.roots} roots · ${report.multiParent} multi-parent children demoted · ` +
      `${report.cyclesBroken} cycles broken`,
  );

  console.log('stage 7: layout');
  const placed = layoutGraph(nodes, edges);

  console.log('stage 8: emit');
  await emitGraph({ builtAt: new Date().toISOString(), nodes: placed, edges });
}

// `import.meta.url` guard so importing this module in a test does not run it.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  await buildDataset();
}
