/**
 * Loading and validating the static dataset.
 *
 * The app makes no network calls other than these — no MusicBrainz, no ListenBrainz, no
 * Deezer at runtime. Everything upstream happens at build time (see
 * `scripts/build-dataset/`).
 *
 * Both files are Zod-validated on load even though the pipeline already validated them on
 * emit. The dataset is refreshed weekly by an automated PR; if a MusicBrainz change
 * corrupts a field, this is where it surfaces as a clear error instead of as a map that
 * renders wrong in a way nobody notices.
 */
import { ArtistIndex, GenreDetail, GraphDataset } from '../types';

/**
 * Data URLs are built on Vite's BASE_URL so the same bundle works at the domain
 * root (dev, Cloudflare) and under a sub-path (GitHub Pages serves the site at
 * /genre-explorer/). BASE_URL is '/' in dev and tests.
 */
const BASE = import.meta.env.BASE_URL;

export const GRAPH_URL = `${BASE}data/graph.json`;

export function genreDetailUrl(genreId: string): string {
  return `${BASE}data/genres/${genreId}.json`;
}

export class DatasetError extends Error {
  constructor(
    message: string,
    readonly url: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'DatasetError';
  }
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new DatasetError(`Could not reach ${url}`, url, { cause });
  }
  if (!response.ok) {
    throw new DatasetError(`${url} returned ${response.status}`, url);
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new DatasetError(`${url} is not valid JSON`, url, { cause });
  }
}

export async function loadGraph(fetchImpl: typeof fetch = fetch): Promise<GraphDataset> {
  const raw = await fetchJson(GRAPH_URL, fetchImpl);
  const parsed = GraphDataset.safeParse(raw);
  if (!parsed.success) {
    throw new DatasetError(
      `graph.json failed validation: ${parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join('.')} ${issue.message}`)
        .join('; ')}`,
      GRAPH_URL,
    );
  }
  return parsed.data;
}

export async function loadGenreDetail(
  genreId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GenreDetail> {
  const url = genreDetailUrl(genreId);
  const raw = await fetchJson(url, fetchImpl);
  const parsed = GenreDetail.safeParse(raw);
  if (!parsed.success) {
    throw new DatasetError(`${url} failed validation`, url);
  }
  return parsed.data;
}

export const ARTIST_INDEX_URL = `${BASE}data/artist-index.json`;

/**
 * The artist → genre reverse index behind the personal lens. Deliberately NOT
 * loaded with the graph: it is only fetched when a listening profile exists, so
 * visitors who never touch personal mode never pay for it.
 */
export async function loadArtistIndex(
  fetchImpl: typeof fetch = fetch,
): Promise<ArtistIndex> {
  const raw = await fetchJson(ARTIST_INDEX_URL, fetchImpl);
  const parsed = ArtistIndex.safeParse(raw);
  if (!parsed.success) {
    throw new DatasetError(`artist-index.json failed validation`, ARTIST_INDEX_URL);
  }
  return parsed.data;
}

/**
 * Detail files are fetched once per genre and kept for the session.
 *
 * In-flight promises are cached too, not just results — clicking a node twice in quick
 * succession is normal and must not fire two requests.
 */
export function createDetailCache(fetchImpl: typeof fetch = fetch) {
  const cache = new Map<string, Promise<GenreDetail>>();
  return {
    get(genreId: string): Promise<GenreDetail> {
      const existing = cache.get(genreId);
      if (existing) return existing;
      const pending = loadGenreDetail(genreId, fetchImpl).catch((error: unknown) => {
        // A failed fetch must not be cached, or a transient blip makes the genre
        // permanently unopenable for the rest of the session.
        cache.delete(genreId);
        throw error;
      });
      cache.set(genreId, pending);
      return pending;
    },
    get size(): number {
      return cache.size;
    },
  };
}

/**
 * Index the nodes by id.
 *
 * The renderer, the filter and the panel all look nodes up by id every frame; scanning
 * an array of 1,200 nodes per lookup is the kind of thing that quietly costs a frame.
 */
export function indexNodes(
  dataset: GraphDataset,
): Map<string, GraphDataset['nodes'][number]> {
  return new Map(dataset.nodes.map((node) => [node.id, node]));
}
