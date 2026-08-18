/**
 * The intake gate. Every case here is a real shape observed in the MusicBrainz
 * response cache on 2026-08-17 — the negative counts and the absent-tag entries
 * especially, which are what put The Beatles in `indie-rock`.
 */
import { describe, expect, it } from 'vitest';

import {
  normalizeTagName,
  tagVotesFor,
} from '../../scripts/build-dataset/fetch-entities';
import {
  MIN_TAG_VOTES,
  SPECIAL_PURPOSE_ARTIST_MBIDS,
} from '../../scripts/build-dataset/config';

describe('normalizeTagName', () => {
  it('folds case so `Hip-Hop` matches `hip-hop`', () => {
    expect(normalizeTagName('Hip-Hop')).toBe(normalizeTagName('hip-hop'));
  });

  it('folds unicode dashes to ASCII', () => {
    // U+2010 HYPHEN, as MusicBrainz stores some tag names.
    expect(normalizeTagName('neo‐soul')).toBe('neo-soul');
    expect(normalizeTagName('Jean‐Michel')).toBe('jean-michel');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTagName('  ambient ')).toBe('ambient');
  });

  it('leaves spaces inside a name alone — `indie rock` is not `indierock`', () => {
    expect(normalizeTagName('Indie Rock')).toBe('indie rock');
  });
});

describe('tagVotesFor', () => {
  it('returns the count for a matching tag', () => {
    expect(tagVotesFor([{ name: 'ambient', count: 25 }], 'ambient')).toBe(25);
  });

  it('distinguishes absent (null) from voted-to-neutral (0)', () => {
    expect(tagVotesFor([{ name: 'rock', count: 5 }], 'ambient')).toBeNull();
    expect(tagVotesFor([{ name: 'ambient', count: 0 }], 'ambient')).toBe(0);
  });

  it('preserves net-negative counts rather than clamping them', () => {
    // The Beatles really do carry `indie rock` at -3.
    expect(tagVotesFor([{ name: 'indie rock', count: -3 }], 'indie rock')).toBe(-3);
  });

  it('returns null when the entity has no tags at all', () => {
    expect(tagVotesFor(undefined, 'ambient')).toBeNull();
    expect(tagVotesFor([], 'ambient')).toBeNull();
  });

  it('matches case- and dash-insensitively', () => {
    expect(tagVotesFor([{ name: 'Indie Rock', count: 4 }], 'indie rock')).toBe(4);
    expect(tagVotesFor([{ name: 'neo‐soul', count: 2 }], 'neo-soul')).toBe(2);
  });
});

describe('the intake gate', () => {
  // Mirrors `qualifies` in fetch-entities, which is module-private.
  const passes = (votes: number | null) => votes !== null && votes >= MIN_TAG_VOTES;

  it('rejects exactly the cases that produced the bad panels', () => {
    expect(passes(tagVotesFor([{ name: 'indie rock', count: -3 }], 'indie rock'))).toBe(
      false,
    ); // The Beatles / indie rock
    expect(passes(tagVotesFor([{ name: 'indie rock', count: 0 }], 'indie rock'))).toBe(
      false,
    ); // Nirvana / indie rock
    expect(
      passes(tagVotesFor([{ name: 'alternative rock', count: 34 }], 'ambient')),
    ).toBe(false); // Coldplay / ambient — tag absent entirely
  });

  it('admits the weakest genuine claim of membership', () => {
    expect(passes(tagVotesFor([{ name: 'britpop', count: 1 }], 'britpop'))).toBe(true);
  });
});

describe('special-purpose artist blocklist', () => {
  it('covers Various Artists, which reached 30 genre panels', () => {
    expect(SPECIAL_PURPOSE_ARTIST_MBIDS.has('89ad4ac3-39f7-470e-963a-56509c546377')).toBe(
      true,
    );
  });

  it('covers the bracketed placeholders', () => {
    for (const mbid of [
      '125ec42a-7229-4250-afc5-e057484327fe', // [unknown]
      'eec63d3c-3b81-4ad4-b1e4-7c147d4d2b61', // [no artist]
      'f731ccc4-e22a-43af-a747-64213329e088', // [anonymous]
      '9be7f096-97ec-4615-8957-8d40b5dcbc41', // [traditional]
      '33cf029c-63b0-41a0-9855-be2a3665fb3b', // [data]
      '314e1c25-dde7-4e4d-b2f4-0a7b9f7c56dc', // [dialogue]
    ]) {
      expect(SPECIAL_PURPOSE_ARTIST_MBIDS.has(mbid)).toBe(true);
    }
  });

  it('does not block real artists', () => {
    // Coldplay and Mozart — the latter because it was misremembered as a
    // placeholder MBID during research and only caught by checking the API.
    expect(SPECIAL_PURPOSE_ARTIST_MBIDS.has('cc197bad-dc9c-440d-a5b5-d52ba2e14234')).toBe(
      false,
    );
    expect(SPECIAL_PURPOSE_ARTIST_MBIDS.has('b972f589-fb0e-474e-b64a-803b0364fa75')).toBe(
      false,
    );
  });
});
