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
import { readFile } from 'node:fs/promises';

import { GraphDataset, type GenreNode } from '../../src/types';
import { GENRE_CONCURRENCY, MIN_RELEASE_GROUPS } from './config';
import { mapWithConcurrency } from './concurrency';
import { SHARD_SIZE, readRefreshTimes, selectShard } from './rotation';
import { buildGraph } from './build-graph';
import { emitArtistIndex } from './emit-artist-index';
import { emitDetail } from './emit-details';
import {
  fetchEntities,
  type CandidateArtist,
  type CandidateRecording,
} from './fetch-entities';
import { fetchGenres } from './fetch-genres';
import { fetchHierarchy } from './fetch-hierarchy';
import { fetchArtistLinks } from './fetch-links';
import { fetchDeezerId } from './fetch-previews';
import { fetchPopularity } from './fetch-popularity';
import {
  fetchArtistListens,
  fetchRecordingListens,
  selectEntities,
  type Ranked,
} from './rank';
import { GRAPH_PATH, emitGraph } from './emit';
import { layoutGraph } from './layout';

/**
 * Stages 1-3, 7 and 8 — the map itself.
 *
 * NOT shardable, which is why it is a separate entry point: these stages decide WHICH
 * genres exist and how big each node is. Refreshing a slice of them per day would make
 * the graph gain and lose nodes mid-rotation. ~4,368 MusicBrainz requests, so ~80
 * minutes, run weekly.
 */
export async function buildGraphOnly(): Promise<GenreNode[]> {
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
  return placed;
}

/** Load the committed graph, for a details run that is not rebuilding the map. */
async function readGraphNodes(): Promise<GenreNode[]> {
  const raw: unknown = JSON.parse(await readFile(GRAPH_PATH, 'utf8'));
  return GraphDataset.parse(raw).nodes;
}

/**
 * Stages 4-6 and 9 — the per-genre panels, for `nodes` only.
 *
 * Genres outside `nodes` keep the detail files they already have, so `public/data`
 * stays complete after every run rather than only at the end of a rotation.
 */
export async function buildDetails(nodes: readonly GenreNode[]): Promise<void> {
  console.log(
    `stages 4-6: entities + ranking + links for ${nodes.length} genres ` +
      `(${GENRE_CONCURRENCY} at a time; per-host queues keep every rate limit intact)`,
  );
  let done = 0;
  let emptyPanels = 0;
  const refreshedAt = new Date().toISOString();

  await mapWithConcurrency(nodes, GENRE_CONCURRENCY, async (node) => {
    const candidates = await fetchEntities(node);
    const artistListens = await fetchArtistListens(
      node.mbid,
      candidates.artists.map((a) => a.mbid),
    );
    const recordingListens = await fetchRecordingListens(
      node.mbid,
      candidates.recordings.map((r) => r.mbid),
    );
    const artists = selectEntities(candidates.artists, artistListens);
    const tracks = selectEntities(candidates.recordings, recordingListens);

    const toArtist = async (r: Ranked<CandidateArtist>) => ({
      mbid: r.entity.mbid,
      name: r.entity.name,
      listens: r.listens,
      tagVotes: r.entity.tagVotes,
      links: await fetchArtistLinks(r.entity.mbid),
    });
    const toTrack = async (r: Ranked<CandidateRecording>) => ({
      mbid: r.entity.mbid,
      title: r.entity.title,
      artistName: r.entity.artistName,
      listens: r.listens,
      links: [],
      deezerId: await fetchDeezerId(r.entity),
    });

    // Artists resolve against MusicBrainz and tracks against Deezer, so these two
    // groups are issued TOGETHER rather than one after the other. Awaiting them in
    // sequence left MusicBrainz idle through every Deezer over-quota backoff (6-30 s)
    // and Deezer idle through every 1 req/s MusicBrainz wait — the gap that turned a
    // 4.3 h floor into ~12 h. `Promise.all` preserves order, and the per-host queues
    // in `http.ts` still space each host's own requests, so no limit is widened.
    const [popularArtists, smallArtists, popularTracks, obscureTracks] =
      await Promise.all([
        Promise.all(artists.popular.map(toArtist)),
        Promise.all(artists.obscure.map(toArtist)),
        Promise.all(tracks.popular.map(toTrack)),
        Promise.all(tracks.obscure.map(toTrack)),
      ]);

    await emitDetail({
      id: node.id,
      refreshedAt,
      popularArtists,
      smallArtists,
      popularTracks,
      obscureTracks,
    });

    if (popularArtists.length === 0 && tracks.popular.length === 0) emptyPanels++;
    done++;
    if (done % 25 === 0) console.log(`  details: ${done}/${nodes.length} genres`);
  });

  console.log(
    `  details done: ${nodes.length} files, ${emptyPanels} with no ranked entities at all`,
  );

  // Stage 9 — invert the detail files just written into the artist → genre index
  // the personal lens matches against. Pure re-read of our own output, no network.
  await emitArtistIndex();
}

/**
 * Entry point. Three modes, because the work splits along what can be sharded:
 *
 *   --graph      stages 1-3/7/8 only. Weekly; decides which genres exist.
 *   --shard[=N]  today's N least-recently-refreshed genres. Daily.
 *   (no flag)    everything, as before — a full local rebuild.
 */
export async function main(argv: readonly string[]): Promise<void> {
  if (argv.includes('--graph')) {
    await buildGraphOnly();
    return;
  }

  const shardArg = argv.find((a) => a === '--shard' || a.startsWith('--shard='));
  if (shardArg !== undefined) {
    const size = shardArg.includes('=') ? Number(shardArg.split('=')[1]) : SHARD_SIZE;
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`--shard needs a positive integer, got "${shardArg}"`);
    }
    const nodes = await readGraphNodes();
    const shard = selectShard(await readRefreshTimes(nodes), size);
    console.log(
      `rolling refresh: ${shard.length} of ${nodes.length} genres due for a rebuild`,
    );
    await buildDetails(shard);
    return;
  }

  const placed = await buildGraphOnly();
  await buildDetails(placed);
}

/** Full rebuild — every genre, graph included. Kept for callers and local runs. */
export async function buildDataset(): Promise<void> {
  await main([]);
}

// `import.meta.url` guard so importing this module in a test does not run it.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  await main(process.argv.slice(2));
}
