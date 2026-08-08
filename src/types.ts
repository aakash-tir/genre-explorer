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
  popularArtists: z.array(Artist),
  smallArtists: z.array(Artist),
  popularTracks: z.array(Track),
  obscureTracks: z.array(Track),
});
export type GenreDetail = z.infer<typeof GenreDetail>;
