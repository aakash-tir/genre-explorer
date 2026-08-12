/**
 * Listening history → genre weights. Pure; the personal lens's first half.
 *
 * Every intake path (ListenBrainz username today, someday an export upload)
 * reduces to the same shape — a ranked list of {@link ListenedArtist} —
 * so this module is source-agnostic. Matching order per artist:
 *
 *   1. MusicBrainz id, exact — matches the dataset's own primary key, so it
 *      cannot false-match and covers every index entry.
 *   2. Spotify artist id, exact — covers ~68% of the index; supplied when a
 *      listen's metadata carries a Spotify origin URL.
 *   3. Normalized name (see `src/lib/artistNames.ts`) — but ONLY when the name
 *      is unique in the index. Two different artists sharing a name ("Bush")
 *      would otherwise credit the wrong genres, and a wrong highlight is worse
 *      than a missing one.
 *
 * An artist that matches nothing contributes nothing — the index only covers
 * panel artists, and that honesty is by design (research doc §5).
 */
import type { ArtistIndex, ArtistIndexEntry } from '../types';
import { normalizeArtistName } from '../lib/artistNames';

/** One listened artist, whatever the source. `rank` is 0-based, best first. */
export interface ListenedArtist {
  mbid?: string;
  spotifyId?: string;
  name: string;
  rank: number;
}

export interface GenreWeight {
  id: string;
  /** Normalized to (0, 1]: the listener's strongest genre is exactly 1. */
  weight: number;
  /** Display names of the matched artists that put this genre here, strongest first. */
  artistNames: string[];
}

/**
 * A rank-0 artist counts 1.0, rank 9 ≈ 0.32, rank 49 ≈ 0.14 — top of the list
 * dominates without the tail vanishing. An artist tagged with several genres
 * credits each in full: splitting would punish exactly the versatile artists the
 * map is about.
 */
export function artistWeight(rank: number): number {
  return 1 / Math.sqrt(rank + 1);
}

interface IndexLookup {
  byMbid: Map<string, ArtistIndexEntry>;
  bySpotifyId: Map<string, ArtistIndexEntry>;
  /** Normalized name → entry, or null when the name is ambiguous in the index. */
  byName: Map<string, ArtistIndexEntry | null>;
}

export function buildLookup(index: ArtistIndex): IndexLookup {
  const byMbid = new Map<string, ArtistIndexEntry>();
  const bySpotifyId = new Map<string, ArtistIndexEntry>();
  const byName = new Map<string, ArtistIndexEntry | null>();
  for (const entry of index.artists) {
    byMbid.set(entry.mbid, entry);
    if (entry.spotifyId !== undefined) bySpotifyId.set(entry.spotifyId, entry);
    byName.set(entry.name, byName.has(entry.name) ? null : entry);
  }
  return { byMbid, bySpotifyId, byName };
}

export function matchGenres(
  listened: readonly ListenedArtist[],
  index: ArtistIndex,
): GenreWeight[] {
  const lookup = buildLookup(index);
  const accumulated = new Map<string, { weight: number; artistNames: string[] }>();

  for (const artist of listened) {
    const entry =
      (artist.mbid !== undefined ? lookup.byMbid.get(artist.mbid) : undefined) ??
      (artist.spotifyId !== undefined
        ? lookup.bySpotifyId.get(artist.spotifyId)
        : undefined) ??
      lookup.byName.get(normalizeArtistName(artist.name)) ??
      null;
    if (entry === null) continue;
    const weight = artistWeight(artist.rank);
    for (const genreIndex of entry.genres) {
      const id = index.genreIds[genreIndex];
      if (id === undefined) continue;
      const bucket = accumulated.get(id) ?? { weight: 0, artistNames: [] };
      bucket.weight += weight;
      bucket.artistNames.push(artist.name);
      accumulated.set(id, bucket);
    }
  }

  const max = Math.max(...[...accumulated.values()].map((bucket) => bucket.weight), 0);
  if (max === 0) return [];

  return [...accumulated.entries()]
    .map(([id, bucket]) => ({
      id,
      weight: bucket.weight / max,
      artistNames: bucket.artistNames,
    }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
}
