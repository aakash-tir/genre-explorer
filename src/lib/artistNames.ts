/**
 * Artist-name matching keys, shared by the build-time index emitter and the
 * runtime personal lens. Both sides MUST normalize identically or name-fallback
 * matching silently misses — which is why this lives in `src/lib` and not in
 * `scripts/`.
 */

/** Combining diacritical marks, produced by NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Collapse an artist display name to a match key: lowercase, diacritics stripped
 * (NFD, combining marks removed), whitespace collapsed. "Röyksopp" and "royksopp"
 * meet in the middle; "The Knife" stays distinct from "Knife" on purpose — dropping
 * articles causes more false merges than it fixes.
 */
export function normalizeArtistName(name: string): string {
  return name
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const SPOTIFY_ARTIST_URL = /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/;

/** The artist id out of an `open.spotify.com/artist/...` link, or null. */
export function spotifyArtistIdFromUrl(url: string): string | null {
  const match = SPOTIFY_ARTIST_URL.exec(url);
  return match ? match[1] : null;
}
