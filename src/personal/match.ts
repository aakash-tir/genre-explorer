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
 * dominates without the tail vanishing.
 */
export function artistWeight(rank: number): number {
  return 1 / Math.sqrt(rank + 1);
}

/**
 * How much of an artist a given genre actually is, from MusicBrainz tag votes.
 *
 * This module used to credit every genre an artist appeared in IN FULL, on the
 * reasoning that splitting would punish versatile artists. That was the wrong shape:
 * it made a listener who plays nothing but Coldplay come out equally an indie rock,
 * ambient and britpop listener, because those genres are equal *members* of
 * Coldplay's list even though they are wildly unequal *claims*. Coldplay carry 34
 * votes for alternative rock and 1 for britpop.
 *
 * Measured against the artist's own strongest tag rather than an absolute scale, so
 * the question stays "how much of THIS artist is this genre" — an artist with 3 votes
 * total is not a weaker listener signal than one with 300, they are just less tagged.
 * The strongest genre always scores exactly 1, so a single-genre artist is unaffected.
 *
 * `sqrt` keeps the fade gentle: Coldplay's britpop (1 of 34) lands at 0.17 rather
 * than 0.03, so a marginal genre is quiet but not erased. Versatile artists still
 * light up their whole neighbourhood — just at honest relative brightness.
 */
export function genreShare(votes: number, strongestVotes: number): number {
  if (strongestVotes <= 0) return 0;
  return Math.sqrt(Math.max(votes, 0) / strongestVotes);
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
    const strongest = Math.max(...entry.votes);
    entry.genres.forEach((genreIndex, i) => {
      const id = index.genreIds[genreIndex];
      if (id === undefined) return;
      const share = genreShare(entry.votes[i] ?? 0, strongest);
      if (share === 0) return;
      const bucket = accumulated.get(id) ?? { weight: 0, artistNames: [] };
      bucket.weight += weight * share;
      bucket.artistNames.push(artist.name);
      accumulated.set(id, bucket);
    });
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
