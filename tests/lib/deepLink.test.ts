import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ZOOM,
  isSameUrl,
  parseUrl,
  toUrl,
  type AppState,
} from '../../src/lib/deepLink';

describe('parseUrl', () => {
  it('reads the focused genre from the path', () => {
    expect(parseUrl('/genre/melodic-techno').focusId).toBe('melodic-techno');
  });

  it('tolerates a trailing slash', () => {
    expect(parseUrl('/genre/techno/').focusId).toBe('techno');
  });

  it('has no focus on the root path', () => {
    expect(parseUrl('/').focusId).toBeNull();
  });

  it('reads the filter selection', () => {
    expect(parseUrl('/', '?filter=techno,house').selectedIds).toEqual([
      'techno',
      'house',
    ]);
  });

  it('reads zoom', () => {
    expect(parseUrl('/', '?zoom=8.5').zoom).toBe(8.5);
  });

  it('accepts a search string with or without the leading question mark', () => {
    expect(parseUrl('/', 'zoom=4').zoom).toBe(4);
    expect(parseUrl('/', '?zoom=4').zoom).toBe(4);
  });

  it('deduplicates repeated filter entries', () => {
    expect(parseUrl('/', '?filter=techno,techno,house').selectedIds).toEqual([
      'techno',
      'house',
    ]);
  });

  it('drops a malformed genre id rather than trusting it', () => {
    expect(parseUrl('/genre/<script>alert(1)</script>').focusId).toBeNull();
    expect(parseUrl('/', '?filter=techno,DROP TABLE,house').selectedIds).toEqual([
      'techno',
      'house',
    ]);
  });

  it('falls back to the default zoom for nonsense values', () => {
    expect(parseUrl('/', '?zoom=banana').zoom).toBe(DEFAULT_ZOOM);
    expect(parseUrl('/', '?zoom=-4').zoom).toBe(DEFAULT_ZOOM);
    expect(parseUrl('/', '?zoom=Infinity').zoom).toBe(DEFAULT_ZOOM);
  });

  it('keeps the good fields when one field is broken', () => {
    // A hand-edited URL should land you somewhere reasonable, not on an error page.
    const state = parseUrl('/genre/techno', '?zoom=banana&filter=house');
    expect(state.focusId).toBe('techno');
    expect(state.selectedIds).toEqual(['house']);
    expect(state.zoom).toBe(DEFAULT_ZOOM);
  });
});

describe('toUrl', () => {
  it('is clean at the default state', () => {
    expect(toUrl({ focusId: null, selectedIds: [], zoom: DEFAULT_ZOOM })).toBe('/');
  });

  it('omits defaults so the history does not churn', () => {
    expect(toUrl({ focusId: 'techno', selectedIds: [], zoom: DEFAULT_ZOOM })).toBe(
      '/genre/techno',
    );
  });

  it('rounds zoom to two decimals', () => {
    expect(toUrl({ focusId: null, selectedIds: [], zoom: 3.14159 })).toBe('/?zoom=3.14');
  });

  it('serialises everything together', () => {
    expect(toUrl({ focusId: 'techno', selectedIds: ['techno', 'house'], zoom: 8 })).toBe(
      '/genre/techno?filter=techno,house&zoom=8',
    );
  });
});

describe('round trip', () => {
  const cases: AppState[] = [
    { focusId: null, selectedIds: [], zoom: DEFAULT_ZOOM },
    { focusId: 'melodic-techno', selectedIds: [], zoom: DEFAULT_ZOOM },
    { focusId: null, selectedIds: ['techno', 'house'], zoom: DEFAULT_ZOOM },
    { focusId: 'grunge', selectedIds: ['rock'], zoom: 12.5 },
  ];

  it.each(cases)('survives parse(toUrl(state)) for %j', (state) => {
    const url = toUrl(state);
    const [pathname, search] = url.split('?');
    expect(parseUrl(pathname, search ?? '')).toEqual(state);
  });
});

describe('isSameUrl', () => {
  it('ignores zoom differences too small to change the URL', () => {
    const a: AppState = { focusId: 'techno', selectedIds: [], zoom: 4 };
    const b: AppState = { focusId: 'techno', selectedIds: [], zoom: 4.0004 };
    expect(isSameUrl(a, b)).toBe(true);
  });

  it('spots a real difference', () => {
    const a: AppState = { focusId: 'techno', selectedIds: [], zoom: 4 };
    const b: AppState = { focusId: 'house', selectedIds: [], zoom: 4 };
    expect(isSameUrl(a, b)).toBe(false);
  });
});
