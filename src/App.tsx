/**
 * App shell — MILESTONE 1 SKELETON.
 *
 * This wires the three panes together and proves the dataset loads and validates. The
 * canvas renderer, the filter panel and the detail panel are stubs; they are milestones
 * 3, 4 and 5 in `plan.md`.
 *
 * The state shape here is deliberate and not a stub: `AppState` is the same object the
 * URL serialises to (`src/lib/deepLink.ts`), so deep links work from the first real
 * interaction rather than being retrofitted.
 */
import { useEffect, useState } from 'react';
import type { GraphDataset } from './types';
import { loadGraph } from './lib/dataset';
import { DEFAULT_STATE, parseUrl, toUrl, type AppState } from './lib/deepLink';
import { visibilityContext, visibleNodes } from './graph/lod';
import { drawnEdges } from './graph/edges';

export default function App() {
  const [dataset, setDataset] = useState<GraphDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AppState>(() =>
    typeof window === 'undefined'
      ? DEFAULT_STATE
      : parseUrl(window.location.pathname, window.location.search),
  );

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
    const next = toUrl(state);
    if (window.location.pathname + window.location.search !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [state]);

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
        <h2>Filter</h2>
        <p className="stub">Search and multi-select — milestone 5.</p>
      </aside>

      <section className="canvas-host" aria-label="Genre map">
        <h1>Genre Explorer</h1>
        <p className="stub">The canvas renderer is milestone 3.</p>
        <dl className="counts">
          <dt>Genres in dataset</dt>
          <dd data-testid="node-count">{dataset.nodes.length}</dd>
          <dt>Visible at this zoom</dt>
          <dd data-testid="visible-count">{shown.length}</dd>
          <dt>Drawn edges</dt>
          <dd data-testid="edge-count">{lines.length}</dd>
        </dl>
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, zoom: s.zoom * 2 }))}
        >
          Zoom in
        </button>
      </section>

      <aside className="detail" aria-label="Genre detail">
        <h2>{state.focusId ?? 'No genre selected'}</h2>
        <p className="stub">Songs, artists and previews — milestone 4.</p>
      </aside>
    </main>
  );
}
