/**
 * The dataset contract.
 *
 * These schemas are imported by BOTH the browser app and the build-time pipeline in
 * `scripts/build-dataset/`. That is deliberate: a shape change must fail `tsc` on both
 * sides at once. Never redeclare the dataset shape inside `scripts/`.
 *
 * Validation runs twice — once when the pipeline emits the files, and again when the app
 * loads them — so a bad weekly refresh fails loudly rather than rendering a broken map.
 */
import { z } from 'zod';

/**
 * How one genre relates to another, straight from MusicBrainz's genre-genre
 * relationship types.
 *
 * Only `subgenre` is ever DRAWN on the map. `fusion` and `influence` exist in the data
 * and change which nodes are revealed on focus, but never produce a visible edge — this
 * is the project's core edge rule. See `src/graph/edges.ts`.
 */
export const RelationKind = z.enum(['subgenre', 'fusion', 'influence']);
export type RelationKind = z.infer<typeof RelationKind>;

/** A link out to somewhere the music actually lives. */
export const ExternalLink = z.object({
  /** Where it points. Sourced from MusicBrainz artist URL relationships. */
  kind: z.enum(['spotify', 'soundcloud', 'bandcamp', 'youtube', 'discogs']),
  url: z.url(),
});
export type ExternalLink = z.infer<typeof ExternalLink>;

export const Artist = z.object({
  mbid: z.uuid(),
  name: z.string().min(1),
  /** ListenBrainz total listen count. Drives the popular/small split. */
  listens: z.number().int().nonnegative(),
  /**
   * MusicBrainz community votes for THIS genre's tag on this artist — how strongly
   * the artist belongs here, not how popular they are. Always >= `MIN_TAG_VOTES`,
   * because the pipeline drops anything weaker (see `fetch-entities.ts`).
   *
   * Kept in the dataset rather than consumed and discarded at build time because the
   * personal lens needs it at runtime: an artist in ten panels is not equally each of
   * those ten genres, and without this the lens can only treat membership as binary.
   */
  tagVotes: z.number().int().positive(),
  links: z.array(ExternalLink),
});
export type Artist = z.infer<typeof Artist>;

export const Track = z.object({
  mbid: z.uuid(),
  title: z.string().min(1),
  artistName: z.string().min(1),
  listens: z.number().int().nonnegative(),
  links: z.array(ExternalLink),
  /**
   * Deezer track id, resolved at build time. The panel embeds Deezer's own widget
   * player on demand with it. NOT a preview URL: Deezer preview MP3 links carry an
   * auth token that expires in ~12 minutes (verified 2026-08-08), so a URL baked
   * into a committed dataset would be dead before it merged. The id is stable.
   * Absent when Deezer has no match — previews degrade, links remain.
   */
  deezerId: z.number().int().positive().optional(),
});
export type Track = z.infer<typeof Track>;

/**
 * A node on the map. Everything here is needed to PAINT the graph, which is why it is
 * kept separate from the detail payload — see `GenreDetail`.
 */
export const GenreNode = z.object({
  /** Slug, e.g. `melodic-techno`. Used in URLs and as the detail file name. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'ids must be lowercase kebab-case'),
  mbid: z.uuid(),
  name: z.string().min(1),
  /**
   * MusicBrainz release-groups tagged with this genre. Spans five orders of magnitude
   * (rock: 547,091 · vaporwave: 15,981 · acholitronix: 0), so node radius must be
   * scaled logarithmically.
   */
  popularity: z.number().int().nonnegative(),
  /** Hops from the top-level family root. 0 = a root genre. Drives the colour gradient. */
  depth: z.number().int().nonnegative(),
  /** Id of the top-level ancestor. Decides the node's hue. */
  family: z.string().min(1),
  /** Baked `d3-force` coordinates. Computed offline so the map never moves between visits. */
  x: z.number(),
  y: z.number(),
});
export type GenreNode = z.infer<typeof GenreNode>;

export const GenreEdge = z.object({
  /** The parent / more general genre. */
  source: z.string().min(1),
  /** The child / more specific genre. */
  target: z.string().min(1),
  kind: RelationKind,
});
export type GenreEdge = z.infer<typeof GenreEdge>;

/** `public/data/graph.json` — must stay under ~400 KB pre-gzip. */
export const GraphDataset = z.object({
  /** ISO date the pipeline produced this. Shown in the UI footer. */
  builtAt: z.iso.datetime(),
  nodes: z.array(GenreNode),
  edges: z.array(GenreEdge),
});
export type GraphDataset = z.infer<typeof GraphDataset>;

/** `public/data/genres/<id>.json` — lazy-loaded when a node is focused. */
export const GenreDetail = z.object({
  id: z.string().min(1),
  /**
   * When this genre's panel was last rebuilt from upstream.
   *
   * This IS the refresh queue. The daily rolling refresh rebuilds the N oldest
   * genres, so "what is due next" is a sort key rather than a stored cursor — which
   * makes it self-healing: a brand-new genre has no file and therefore sorts first, a
   * deleted genre leaves the queue by disappearing, and a failed day corrupts nothing
   * because those genres simply stay oldest and are picked up tomorrow.
   *
   * Optional so a dataset written before the rolling refresh existed still validates;
   * a missing value is treated as "never refreshed", i.e. due first.
   */
  refreshedAt: z.iso.datetime().optional(),
  popularArtists: z.array(Artist),
  smallArtists: z.array(Artist),
  popularTracks: z.array(Track),
  obscureTracks: z.array(Track),
});
export type GenreDetail = z.infer<typeof GenreDetail>;

/**
 * One artist in the reverse index. Derived from the genre detail files, so it only
 * covers artists that appear in some genre's panel — an artist outside every panel
 * simply doesn't light anything up (see
 * `docs/research/listening-history-personalization.md` §5).
 */
export const ArtistIndexEntry = z
  .object({
    /** MusicBrainz artist id — every entry has one; the ListenBrainz-path match key. */
    mbid: z.uuid(),
    /**
     * Spotify artist id, extracted from the artist's `spotify` link when present
     * (~68% of dataset artists). The Spotify-path exact-match key.
     */
    spotifyId: z.string().min(1).optional(),
    /** Normalized display name (see `normalizeArtistName`) — the fallback match key. */
    name: z.string().min(1),
    /** Indexes into {@link ArtistIndex.genreIds}, kept as numbers for payload size. */
    genres: z.array(z.number().int().nonnegative()).min(1),
    /**
     * MusicBrainz tag votes, positionally parallel to {@link genres} — `votes[i]` is
     * the support for `genres[i]`. Parallel arrays rather than pairs or objects purely
     * for payload size; this file is already the largest thing the lens loads.
     *
     * This is what lets the lens say Coldplay is *mostly* alternative rock (34 votes)
     * and only marginally britpop (1). Validated as the same length as `genres` —
     * a drift there would silently misattribute every genre after the gap.
     */
    votes: z.array(z.number().int().positive()).min(1),
  })
  .refine((entry) => entry.genres.length === entry.votes.length, {
    message: 'genres and votes must be the same length — they are positionally paired',
    path: ['votes'],
  });
export type ArtistIndexEntry = z.infer<typeof ArtistIndexEntry>;

/**
 * `public/data/artist-index.json` — artist → genres, inverted from the detail files
 * at build time. Lazy-loaded only when the personal lens is activated, so it never
 * touches first paint or the graph.json size budget.
 */
export const ArtistIndex = z.object({
  builtAt: z.iso.datetime(),
  genreIds: z.array(z.string().min(1)),
  artists: z.array(ArtistIndexEntry),
});
export type ArtistIndex = z.infer<typeof ArtistIndex>;
