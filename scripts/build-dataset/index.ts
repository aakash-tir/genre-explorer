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

  console.log('stages 4-5: entities + ranking + links (cold cache ≈ 3 h)');
  let done = 0;
  let emptyPanels = 0;
  for (const node of placed) {
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

    const popularArtists = [];
    for (const r of artists.popular) popularArtists.push(await toArtist(r));
    const smallArtists = [];
    for (const r of artists.obscure) smallArtists.push(await toArtist(r));
    const popularTracks = [];
    for (const r of tracks.popular) popularTracks.push(await toTrack(r));
    const obscureTracks = [];
    for (const r of tracks.obscure) obscureTracks.push(await toTrack(r));

    await emitDetail({
      id: node.id,
      popularArtists,
      smallArtists,
      popularTracks,
      obscureTracks,
    });

    if (popularArtists.length === 0 && tracks.popular.length === 0) emptyPanels++;
    done++;
    if (done % 25 === 0) console.log(`  details: ${done}/${placed.length} genres`);
  }
  console.log(
    `  details done: ${placed.length} files, ${emptyPanels} with no ranked entities at all`,
  );

  // Stage 9 — invert the detail files just written into the artist → genre index
  // the personal lens matches against. Pure re-read of our own output, no network.
  await emitArtistIndex();
}

// `import.meta.url` guard so importing this module in a test does not run it.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  await buildDataset();
}
