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
 * PROVISIONAL. `acholitronix` has 0 tagged release-groups and roughly 40% of the 2,184
 * genres are similarly empty — a node that opens to a blank panel breaks the core promise
 * of the app. The real value gets set in milestone 2 once the full distribution is
 * visible; 50 is a starting guess that should yield ~800–1,200 genres.
 */
export const MIN_RELEASE_GROUPS = 50;

/** How many of each list the detail panel shows. */
export const ENTITIES_PER_LIST = 5;

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
