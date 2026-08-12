/**
 * Where to hear one song. Derived at render time, because the dataset cannot
 * supply it: every `Track.links` array ships empty.
 *
 * MusicBrainz records streaming URLs on ARTISTS (~68% of dataset artists) but
 * effectively never on recordings — four real dataset tracks probed live on
 * 2026-08-12 returned zero URL relations each, so a per-recording `url-rels`
 * pass would add ~9,000 requests at 1 req/s to buy almost nothing.
 *
 * The exact per-song Spotify URL is reachable only through Spotify's
 * authenticated API, and this project holds no keys. The obvious free bridge —
 * Deezer id → Odesli/song.link → Spotify — does not work either: Odesli's
 * unauthenticated tier resolves a Deezer track to Amazon, Tidal, Napster,
 * Anghami, Boomplay and Yandex but omits Spotify entirely, verified against a
 * global #1 single.
 *
 * So the two links here are honest about what they can do:
 *   - Spotify gets a SEARCH deep link. No fetch, no key, every track covered,
 *     and the song is normally the first result.
 *   - Deezer gets the track's own page — exact and free, because stage 6
 *     already resolved a stable track id for the preview player.
 *
 * Real links the dataset does carry always win; these only fill the gap. Pure,
 * so the panel stays a renderer (see the testing convention in CLAUDE.md).
 */
import type { Track } from '../types';

/** A link as the panel renders it. Looser than `ExternalLink`: these are
 * derived at runtime and never validated against the dataset schema, and
 * `deezer` is deliberately not a dataset link kind. */
export interface PanelLink {
  kind: string;
  url: string;
  /** Tooltip. Set when the destination is not the song's own page. */
  title?: string;
}

const SPOTIFY_SEARCH = 'https://open.spotify.com/search/';
const DEEZER_TRACK = 'https://www.deezer.com/track/';

/**
 * Spotify's in-app search for "<artist> <title>". Spotify treats the path
 * segment as a plain query, so the whole phrase is encoded as one component.
 */
export function spotifySearchUrl(artistName: string, title: string): string {
  const query = `${artistName} ${title}`.trim().replace(/\s+/g, ' ');
  return SPOTIFY_SEARCH + encodeURIComponent(query);
}

/** The track's own Deezer page, from the id stage 6 already resolved. */
export function deezerTrackUrl(deezerId: number): string {
  return DEEZER_TRACK + String(deezerId);
}

/**
 * Dataset links first, then derived ones for whatever is still missing — so a
 * future pipeline that learns to bake real track links silently takes over.
 */
export function trackLinks(track: Track): PanelLink[] {
  const links: PanelLink[] = track.links.map((link) => ({
    kind: link.kind,
    url: link.url,
  }));
  const has = (kind: string) => links.some((link) => link.kind === kind);

  if (!has('spotify')) {
    links.push({
      kind: 'spotify',
      url: spotifySearchUrl(track.artistName, track.title),
      title: `Search Spotify for "${track.title}" by ${track.artistName}`,
    });
  }
  if (track.deezerId !== undefined && !has('deezer')) {
    links.push({ kind: 'deezer', url: deezerTrackUrl(track.deezerId) });
  }
  return links;
}
