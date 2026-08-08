/**
 * App shell.
 *
 * The centre pane is the real map as of milestone 3: `GraphCanvas` draws the dataset
 * and owns the camera. The filter panel and the detail panel are still stubs
 * (milestones 5 and 4 in `plan.md`).
 *
 * The state shape here is deliberate and not a stub: `AppState` is the same object the
 * URL serialises to (`src/lib/deepLink.ts`), so deep links work from the first real
 * interaction rather than being retrofitted.
 */
import { useCallback, useEffect, useState } from 'react';
import type { GraphDataset } from './types';
import { loadGraph } from './lib/dataset';
import {
  DEFAULT_STATE,
  parseUrl,
  stripBase,
  toUrl,
  withBase,
  type AppState,
} from './lib/deepLink';

/** '/' in dev; '/genre-explorer/' when served from GitHub Pages. */
const BASE = import.meta.env.BASE_URL;
import { FULL_DETAIL_ZOOM, visibilityContext, visibleNodes } from './graph/lod';
import { drawnEdges } from './graph/edges';
import GraphCanvas, { MIN_ZOOM } from './graph/GraphCanvas';
import DetailPanel from './panel/DetailPanel';
import FilterPanel from './filters/FilterPanel';

export default function App() {
  const [dataset, setDataset] = useState<GraphDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>(() =>
    typeof window === 'undefined'
      ? DEFAULT_STATE
      : parseUrl(stripBase(window.location.pathname, BASE), window.location.search),
  );
  /**
   * Whether the focused genre's fan/dim view is open. SEPARATE from the selection
   * on purpose: the panel (and whatever preview is playing) sticks to
   * `state.focusId` until another genre is picked, while clicking empty map space
   * merely collapses the fan so the full map is browsable mid-listen. Ephemeral —
   * not part of the URL; a deep-linked genre opens fanned.
   */
  const [fanOpen, setFanOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadGraph()
      .then((data) => {
        if (!cancelled) setDataset(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the URL in step with the state so every view is shareable.
  useEffect(() => {
    const next = withBase(toUrl(state), BASE);
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [state]);

  // Stable identity: GraphCanvas subscribes d3-zoom once and keeps this setter.
  const handleZoomChange = useCallback((zoom: number) => {
    setState((s) => (Math.abs(s.zoom - zoom) < 0.001 ? s : { ...s, zoom }));
  }, []);

  /**
   * Canvas clicks. The selection is sticky: empty space only closes the fan (the
   * music keeps playing, the panel stays, the ring outline remains); clicking the
   * already-selected genre toggles its fan; only clicking a DIFFERENT genre
   * switches the selection. Not memoised — the canvas re-binds onClick per render.
   */
  const handleFocusChange = (hitId: string | null) => {
    if (hitId === null) {
      setFanOpen(false);
      return;
    }
    if (hitId === state.focusId) {
      setFanOpen((open) => !open);
      return;
    }
    setState((s) => ({ ...s, focusId: hitId }));
    setFanOpen(true);
  };

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setState((s) => ({ ...s, selectedIds }));
  }, []);

  if (error !== null) {
    return (
      <main className="status status--error">
        <h1>Genre Explorer</h1>
        <p>Could not load the genre map.</p>
        <pre>{error}</pre>
      </main>
    );
  }

  if (dataset === null) {
    return (
      <main className="status">
        <h1>Genre Explorer</h1>
        <p>Loading the genre map…</p>
      </main>
    );
  }

  const context = visibilityContext(state, dataset.edges);
  const shown = visibleNodes(dataset.nodes, context);
  const lines = drawnEdges(dataset.edges);

  return (
    <main className="app">
      <aside className="filters" aria-label="Genre filters">
        <FilterPanel
          nodes={dataset.nodes}
          selectedIds={state.selectedIds}
          onSelectionChange={handleSelectionChange}
        />
      </aside>

      <section className="canvas-host" aria-label="Genre map">
        <GraphCanvas
          dataset={dataset}
          state={state}
          fanOpen={fanOpen}
          onZoomChange={handleZoomChange}
          onFocusChange={handleFocusChange}
        />
        <div className="map-hud">
          <div className="zoom-buttons">
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() =>
                setState((s) => ({ ...s, zoom: Math.min(s.zoom * 2, FULL_DETAIL_ZOOM) }))
              }
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() =>
                setState((s) => ({ ...s, zoom: Math.max(s.zoom / 2, MIN_ZOOM) }))
              }
            >
              −
            </button>
          </div>
          <dl className="counts">
            <dt>Genres</dt>
            <dd data-testid="node-count">{dataset.nodes.length}</dd>
            <dt>Visible</dt>
            <dd data-testid="visible-count">{shown.length}</dd>
            <dt>Edges</dt>
            <dd data-testid="edge-count">{lines.length}</dd>
          </dl>
        </div>
      </section>

      <aside className="detail" aria-label="Genre detail">
        <DetailPanel
          node={
            state.focusId
              ? (dataset.nodes.find((n) => n.id === state.focusId) ?? null)
              : null
          }
        />
      </aside>
    </main>
  );
}
