/**
 * Pipeline configuration.
 *
 * These are the numbers that keep the build a good citizen of the free services it
 * depends on. Changing them is a decision, not a tweak — MusicBrainz will block a client
 * that ignores its rate limit, and there is no paid tier to fall back to.
 */

/**
 * MusicBrainz requires a User-Agent identifying the application with contact info.
 * Requests without one are throttled or refused.
 * https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
 */
export const USER_AGENT =
  'genre-explorer/0.1 ( https://github.com/aakash-tir/genre-explorer )';

/** MusicBrainz: 1 request per second, averaged. Not negotiable. */
export const MUSICBRAINZ_DELAY_MS = 1100;

/** Deezer: 50 requests per 5 seconds. */
export const DEEZER_DELAY_MS = 110;

/**
 * Stage 3's threshold: the minimum MusicBrainz release-group count for a genre to make
 * it onto the map.
 *
 * `acholitronix` has 0 tagged release-groups and roughly 40% of the 2,184 genres are
 * similarly empty — a node that opens to a blank panel breaks the core promise of the
 * app.
 *
 * CONFIRMED against the real distribution: 50 keeps 912 genres of 2,184, inside the
 * ~800–1,200 the plan predicted. Changing it reshapes the whole map, so treat it as a
 * product decision, not a tuning knob — and expect stage 8's sharp-drop guard to fail
 * the build if a change shrinks the graph steeply.
 */
export const MIN_RELEASE_GROUPS = 50;

/** How many of each list the detail panel shows. */
export const ENTITIES_PER_LIST = 5;

/** ListenBrainz publishes no hard cap; this is self-imposed politeness. */
export const LISTENBRAINZ_DELAY_MS = 300;

/**
 * Candidates fetched per genre per entity type before ranking. Over-fetched on
 * purpose: many recordings have NO ListenBrainz data (verified 2026-08-07 — a Pearl
 * Jam single returned `total_listen_count: null`), and search results carry
 * near-duplicate recordings that need deduping before five of each band survive.
 */
export const SEARCH_LIMIT = 50;

/**
 * Minimum listen count for the "obscure" lists. The bottom of the distribution is
 * data artifacts (1 listen, 1 user), not hidden gems. PROVISIONAL — the open
 * decision in docs/future.md; tune against the real distribution.
 */
export const OBSCURE_MIN_LISTENS = 100;

/**
 * Stage 8's sharp-drop guard: fail the build if node or edge count falls by more than
 * this fraction against the committed dataset.
 *
 * The failure this exists for is silent, not loud — a MusicBrainz HTML change empties the
 * scraper and the pipeline cheerfully emits a valid, nearly-treeless dataset. Validation
 * alone would pass it.
 */
export const MAX_SHRINK_RATIO = 0.2;

/** Disk cache for upstream responses so a rerun doesn't re-fetch 2,184 pages. */
export const CACHE_DIR = '.cache/build-dataset';

/**
 * Minimum MusicBrainz tag votes for a candidate to count as belonging to a genre.
 *
 * MusicBrainz's search relevance is NOT tag agreement. Querying `tag:"indie rock"`
 * returns The Beatles at score 100 with an `indie rock` tag count of **-3** — a tag
 * users actively voted DOWN — and Nirvana at 92 with a count of 0. Keeping the raw
 * top 50 therefore filed The Beatles under indie rock, heavy metal and filk, and
 * Coldplay under ambient (a tag Coldplay does not carry at all).
 *
 * 1 means "at least one person voted for this tag and nobody outvoted them", which
 * is the weakest defensible claim of membership. Measured over the full cached
 * corpus (37,304 candidates across 912 genres, 2026-08-17):
 *
 *   >= 1  keeps 90.8% of candidates ·   3 genres left empty · 889/912 keep a full panel
 *   >= 2  keeps 22.3% of candidates · 106 genres left empty
 *
 * So 2 is far too blunt. The 9.2% dropped at 1 is 1,717 candidates carrying no such
 * tag at all, 1,377 at exactly 0 and 322 net-negative — all of them noise.
 *
 * The three genres that empty out (`wave`, `asian rock`, and one more) empty because
 * nobody uses those words as tags, which the panel should show honestly rather than
 * fill with the most famous loosely-related artist.
 */
export const MIN_TAG_VOTES = 1;

/**
 * MusicBrainz placeholder artists, which are not artists. All verified against the
 * live API on 2026-08-17.
 *
 * These rank near the top of tag searches because their release counts are enormous —
 * `Various Artists` came back FIRST for `tag:"ambient"` (with an `ambient` tag count of
 * -4) and sat in 30 genre panels in the shipped dataset. `MIN_TAG_VOTES` already
 * excludes them wherever their tag vote is <= 0, but that is incidental; a placeholder
 * should never reach a panel even if someone upvotes a tag on it.
 */
export const SPECIAL_PURPOSE_ARTIST_MBIDS: ReadonlySet<string> = new Set([
  '89ad4ac3-39f7-470e-963a-56509c546377', // Various Artists
  '125ec42a-7229-4250-afc5-e057484327fe', // [unknown]
  'eec63d3c-3b81-4ad4-b1e4-7c147d4d2b61', // [no artist]
  'f731ccc4-e22a-43af-a747-64213329e088', // [anonymous]
  '9be7f096-97ec-4615-8957-8d40b5dcbc41', // [traditional]
  '33cf029c-63b0-41a0-9855-be2a3665fb3b', // [data]
  '314e1c25-dde7-4e4d-b2f4-0a7b9f7c56dc', // [dialogue]
]);

/**
 * Genres processed at once by the details stage.
 *
 * This is NOT a rate-limit dial. The per-host queues in `http.ts` space every request
 * to a given host regardless of how many callers are in flight, so MusicBrainz stays at
 * exactly 1 req/s whatever this is set to. What concurrency buys is that Deezer and
 * ListenBrainz work proceeds WHILE a MusicBrainz call is waiting its turn, instead of
 * every queue taking turns being idle.
 *
 * 4 is enough to keep the MusicBrainz queue saturated — the binding constraint — while
 * leaving Deezer's over-quota backoffs room to overlap each other rather than stacking.
 */
export const GENRE_CONCURRENCY = 4;
