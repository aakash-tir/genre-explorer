/**
 * Fixture tests over SAVED REAL MusicBrainz genre pages (fetched 2026-08-06).
 *
 * These are the tripwire for the most fragile assumption in the project: the genre tree
 * only exists in the HTML, so a MusicBrainz redesign must fail here — loudly, in CI —
 * instead of silently emptying the map. If these fail after a MusicBrainz deploy,
 * re-save the fixtures, fix the parser, and check the stage 8 sharp-drop guard still
 * holds. The 7 GB mbdump import is the documented fallback if scraping dies for good.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  looksLikeGenrePage,
  parseGenrePage,
} from '../../scripts/build-dataset/parse-genre-page';

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, '..', 'fixtures', `${name}.html`), 'utf8');
}

describe('looksLikeGenrePage', () => {
  it('accepts every saved genre page', () => {
    for (const name of [
      'genre-grunge',
      'genre-dubstep',
      'genre-alternative-dance',
      'genre-acholitronix',
    ]) {
      expect(looksLikeGenrePage(fixture(name)), name).toBe(true);
    }
  });

  it('rejects a page that is not a genre page', () => {
    // The failure mode this guards: a CDN error page or redesign parsing to six empty
    // arrays, indistinguishable from a genre that genuinely has no relations.
    expect(looksLikeGenrePage('<html><title>MusicBrainz</title></html>')).toBe(false);
    expect(looksLikeGenrePage('Service unavailable')).toBe(false);
  });
});

describe('parseGenrePage', () => {
  it('parses a plain subgenre with a parent (grunge)', () => {
    const rels = parseGenrePage(fixture('genre-grunge'));
    expect(rels.parents).toEqual([
      { mbid: 'ceeaa283-5d7b-4202-8d1d-e25d116b2a18', name: 'alternative rock' },
    ]);
    expect(rels.children).toEqual([]);
    expect(rels.fusionOf).toEqual([]);
    expect(rels.influencedGenres).toEqual([
      { mbid: 'bbb1310c-24cb-4fc9-97c4-f93e4549f1e2', name: 'post-grunge' },
      { mbid: '7f89796a-4b15-4d31-9d9b-639ec0be399a', name: 'riot grrrl' },
    ]);
  });

  it('parses a fusion genre (alternative dance — the canonical edge-rule example)', () => {
    const rels = parseGenrePage(fixture('genre-alternative-dance'));
    // This exact pair is why the fusion rule exists: alternative dance must surface
    // under both alternative rock and dance without a drawn edge between them.
    expect(rels.fusionOf).toEqual([
      { mbid: 'ceeaa283-5d7b-4202-8d1d-e25d116b2a18', name: 'alternative rock' },
      { mbid: 'e5bba957-8c91-496a-a675-c6d0c6b51c33', name: 'dance' },
    ]);
    expect(rels.parents).toEqual([]);
    expect(rels.children.map((r) => r.name)).toEqual(['madchester', 'new rave']);
  });

  it('parses every relation direction on a busy page (dubstep)', () => {
    const rels = parseGenrePage(fixture('genre-dubstep'));
    expect(rels.parents.map((r) => r.name)).toEqual(['edm']);
    expect(rels.children.map((r) => r.name)).toEqual([
      'brostep',
      'chillstep',
      'dungeon sound',
      'melodic dubstep',
      'purple sound',
      'tearout',
    ]);
    expect(rels.fusionGenres.map((r) => r.name)).toEqual(['wonky']);
    expect(rels.influencedBy.map((r) => r.name)).toEqual(['dark garage']);
    expect(rels.influencedGenres).toHaveLength(9);
    // Every parsed mbid must be a well-formed UUID — the edge builder keys on them.
    for (const list of Object.values(rels)) {
      for (const ref of list) {
        expect(ref.mbid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      }
    }
  });

  it('returns all-empty relations for a genre with almost nothing (acholitronix)', () => {
    const rels = parseGenrePage(fixture('genre-acholitronix'));
    expect(rels.parents).toEqual([]);
    expect(rels.children).toEqual([]);
    expect(rels.fusionOf).toEqual([]);
    expect(rels.influencedBy.map((r) => r.name)).toEqual(['edm']);
  });

  it('decodes HTML entities in genre names', () => {
    const html =
      '<table><tr><th>subgenre of:</th><td>' +
      '<a href="/genre/00000000-0000-4000-8000-000000000001"><bdi>drum &amp; bass</bdi></a>' +
      '</td></tr></table>';
    expect(parseGenrePage(html).parents).toEqual([
      { mbid: '00000000-0000-4000-8000-000000000001', name: 'drum & bass' },
    ]);
  });
});
