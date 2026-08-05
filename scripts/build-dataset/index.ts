/**
 * The dataset build pipeline — MILESTONE 2 ONWARDS. Currently a stub.
 *
 * Everything that touches an external service happens here, at build time, never in the
 * browser. Run with `npm run build:dataset`; in CI it runs weekly and opens a PR with the
 * refreshed `public/data/`.
 *
 * Stages, in order (see `.claude/project-context.md` for the full detail):
 *
 *   1. fetch-genres      GET musicbrainz.org/ws/2/genre/all?fmt=txt        → 2,184 names
 *   2. fetch-hierarchy   SCRAPE the genre HTML pages, 1 req/s              → the tree
 *   3. fetch-popularity  MusicBrainz release-group tag counts              → size + FILTER
 *   4. fetch-entities    MusicBrainz artist/recording tag search + url-rels
 *   5. rank              POST listenbrainz.org/1/popularity/{artist,recording}
 *   6. previews          Deezer search                                     → 30s MP3s
 *   7. layout            d3-force, fixed seed and tick count               → baked x/y
 *   8. emit              Zod validate + sharp-drop guard                   → public/data/
 *
 * Stage 2 is the hard one and the reason this project needed research before code:
 * MusicBrainz genre relationships are NOT available from the JSON API. `inc=genre-rels`
 * returns 200 with no relations, and `/ws/2/genre?query=` answers "This hasn't been
 * implemented yet." A pipeline that trusts the API produces 2,184 orphan nodes, no tree,
 * and no error — which is why stage 8 has a guard rather than just a validator.
 */
import { USER_AGENT } from './config';

export async function buildDataset(): Promise<never> {
  throw new Error(
    'The dataset pipeline is milestone 2. See plan.md and .claude/project-context.md. ' +
      `Requests must send User-Agent: ${USER_AGENT}`,
  );
}

// `import.meta.url` guard so importing this module in a test does not run it.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  await buildDataset();
}
