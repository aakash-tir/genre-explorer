/**
 * Deep links — the URL is the app state.
 *
 * `/genre/melodic-techno?filter=techno,house&zoom=8` opens the map focused on
 * `melodic-techno`, filtered to the techno and house families, at zoom 8. Sharing a URL
 * shares exactly what you were looking at.
 *
 * Built in from the start deliberately: retrofitting URL state onto an app that already
 * keeps it in component state means touching every interaction.
 *
 * Pure string ⇄ object functions with no `window` access, so they can be tested directly
 * and used identically on the server if this ever pre-renders.
 */

export interface AppState {
  /** Focused genre id, or null for the overview. */
  focusId: string | null;
  /** Genre ids selected in the filter panel. */
  selectedIds: string[];
  /** d3-zoom scale. */
  zoom: number;
}

export const DEFAULT_ZOOM = 1;

export const DEFAULT_STATE: AppState = {
  focusId: null,
  selectedIds: [],
  zoom: DEFAULT_ZOOM,
};

/** Genre ids are lowercase kebab-case; anything else in a URL is user error or an attack. */
const GENRE_ID = /^[a-z0-9-]+$/;

function sanitiseId(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return GENRE_ID.test(trimmed) ? trimmed : null;
}

/**
 * Parse a path + query into app state.
 *
 * Never throws. A malformed URL falls back to the default for whichever field is bad and
 * keeps the rest — landing on the overview beats showing an error page because someone
 * hand-edited a query string.
 */
export function parseUrl(pathname: string, search = ''): AppState {
  const state: AppState = { ...DEFAULT_STATE, selectedIds: [] };

  const match = /^\/genre\/([^/?#]+)\/?$/.exec(pathname);
  if (match) {
    state.focusId = sanitiseId(decodeURIComponent(match[1]));
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  const filter = params.get('filter');
  if (filter) {
    const seen = new Set<string>();
    for (const part of filter.split(',')) {
      const id = sanitiseId(part);
      if (id !== null && !seen.has(id)) {
        seen.add(id);
        state.selectedIds.push(id);
      }
    }
  }

  const zoom = Number.parseFloat(params.get('zoom') ?? '');
  if (Number.isFinite(zoom) && zoom > 0) {
    state.zoom = zoom;
  }

  return state;
}

/**
 * Serialise state back to a URL.
 *
 * Defaults are omitted so the common case is a clean `/`, and so the URL doesn't churn
 * in the history on every trivial camera nudge. Zoom is rounded to two decimals for the
 * same reason.
 */
export function toUrl(state: AppState): string {
  const path = state.focusId ? `/genre/${state.focusId}` : '/';

  // Built by hand rather than with URLSearchParams, which percent-encodes the comma
  // separator into `%2C`. Genre ids are already restricted to [a-z0-9-], so there is
  // nothing here that needs escaping, and a shared link should be readable.
  const params: string[] = [];

  if (state.selectedIds.length > 0) {
    params.push(`filter=${state.selectedIds.join(',')}`);
  }
  if (Math.abs(state.zoom - DEFAULT_ZOOM) > 0.001) {
    params.push(`zoom=${Math.round(state.zoom * 100) / 100}`);
  }

  return params.length > 0 ? `${path}?${params.join('&')}` : path;
}

/** True when two states would produce the same URL — used to skip redundant history writes. */
export function isSameUrl(a: AppState, b: AppState): boolean {
  return toUrl(a) === toUrl(b);
}
