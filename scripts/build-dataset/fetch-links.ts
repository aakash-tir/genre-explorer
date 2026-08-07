/**
 * Streaming links for chosen artists, from MusicBrainz URL relationships.
 *
 * Only the ~10 artists that survived ranking get this lookup — one request per
 * UNIQUE artist across all genres (popular artists appear in many genres; the disk
 * cache collapses them to one fetch).
 *
 * Kind is mapped from the URL's hostname, not the relation type: MusicBrainz types
 * Spotify and Deezer alike as "free streaming" (verified 2026-08-07), so the type
 * string cannot distinguish the platforms the panel links to.
 */
import { z } from 'zod';

import type { ExternalLink } from '../../src/types';

import { MUSICBRAINZ_DELAY_MS } from './config';
import { cachedFetch } from './http';

const UrlRels = z.object({
  relations: z.array(z.object({ url: z.object({ resource: z.string() }) })),
});

/** Hostname → panel link kind. Pure; unit-tested. Returns null for hosts we don't show. */
export function linkFromUrl(url: string): ExternalLink | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const kind = host.endsWith('open.spotify.com')
    ? ('spotify' as const)
    : host === 'soundcloud.com' || host.endsWith('.soundcloud.com')
      ? ('soundcloud' as const)
      : host.endsWith('.bandcamp.com')
        ? ('bandcamp' as const)
        : host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be'
          ? ('youtube' as const)
          : host === 'discogs.com' || host.endsWith('.discogs.com')
            ? ('discogs' as const)
            : null;
  return kind === null ? null : { kind, url };
}

/** One link per kind, in the order the panel shows them. */
export function pickLinks(urls: readonly string[]): ExternalLink[] {
  const byKind = new Map<ExternalLink['kind'], ExternalLink>();
  for (const url of urls) {
    const link = linkFromUrl(url);
    if (link && !byKind.has(link.kind)) byKind.set(link.kind, link);
  }
  const order: ExternalLink['kind'][] = [
    'spotify',
    'soundcloud',
    'bandcamp',
    'youtube',
    'discogs',
  ];
  return order.flatMap((kind) => byKind.get(kind) ?? []);
}

export async function fetchArtistLinks(artistMbid: string): Promise<ExternalLink[]> {
  const body = await cachedFetch(
    `https://musicbrainz.org/ws/2/artist/${artistMbid}?inc=url-rels&fmt=json`,
    `artist-links/${artistMbid}.json`,
    MUSICBRAINZ_DELAY_MS,
  );
  const rels = UrlRels.parse(JSON.parse(body)).relations;
  return pickLinks(rels.map((rel) => rel.url.resource));
}
