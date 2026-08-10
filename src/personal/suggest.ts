/**
 * "Genres to branch out into" — the personal lens's second half. Pure.
 *
 * No external API: the `fusion` and `influence` edges already shipped in
 * `graph.json` are literally MusicBrainz's "sounds adjacent" statements, and the
 * `subgenre` tree supplies parent/child/sibling nearness. Spotify's own
 * recommendations endpoint is gone for new apps anyway (research doc §6).
 *
 * Scoring: every unlistened genre collects weight from each listened neighbour,
 * scaled by how associative the connection is. Fusion/influence beat tree edges
 * on purpose — "trip hop is influenced by dub" is a stronger listening lead than
 * "dub has a parent". A candidate several listened genres point at outranks one
 * with a single strong neighbour, which is exactly the "branch out from where you
 * already are" the feature wants.
 */
import type { GenreEdge } from '../types';
import type { GenreWeight } from './match';

export const FUSION_FACTOR = 1;
export const SUBGENRE_FACTOR = 0.7;
export const SIBLING_FACTOR = 0.35;

export const DEFAULT_SUGGESTION_LIMIT = 12;

export interface Suggestion {
  id: string;
  score: number;
  /** The listened genres that led here, strongest contribution first (max 3). */
  because: string[];
}

export function suggestGenres(
  weights: readonly GenreWeight[],
  edges: readonly GenreEdge[],
  limit: number = DEFAULT_SUGGESTION_LIMIT,
): Suggestion[] {
  const weightById = new Map(weights.map((genre) => [genre.id, genre.weight]));
  if (weightById.size === 0) return [];

  // candidate id → (listened neighbour id → accumulated contribution)
  const contributions = new Map<string, Map<string, number>>();
  const contribute = (candidate: string, listened: string, factor: number) => {
    const weight = weightById.get(listened);
    if (weight === undefined || weightById.has(candidate)) return;
    const bucket = contributions.get(candidate) ?? new Map<string, number>();
    bucket.set(listened, (bucket.get(listened) ?? 0) + weight * factor);
    contributions.set(candidate, bucket);
  };

  const childrenByParent = new Map<string, string[]>();
  for (const edge of edges) {
    const factor = edge.kind === 'subgenre' ? SUBGENRE_FACTOR : FUSION_FACTOR;
    // Adjacency is symmetric for discovery: listening to the child recommends the
    // parent and vice versa.
    contribute(edge.source, edge.target, factor);
    contribute(edge.target, edge.source, factor);
    if (edge.kind === 'subgenre') {
      const siblings = childrenByParent.get(edge.source) ?? [];
      siblings.push(edge.target);
      childrenByParent.set(edge.source, siblings);
    }
  }

  // Siblings: children of the same parent lean toward each other, faintly.
  for (const siblings of childrenByParent.values()) {
    const listened = siblings.filter((id) => weightById.has(id));
    if (listened.length === 0) continue;
    for (const candidate of siblings) {
      if (weightById.has(candidate)) continue;
      for (const source of listened) contribute(candidate, source, SIBLING_FACTOR);
    }
  }

  return [...contributions.entries()]
    .map(([id, bucket]) => {
      const ranked = [...bucket.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      return {
        id,
        score: ranked.reduce((sum, [, value]) => sum + value, 0),
        because: ranked.slice(0, 3).map(([listened]) => listened),
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
