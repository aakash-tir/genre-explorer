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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphDataset } from './types';
import { indexNodes, loadGraph } from './lib/dataset';
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
import GraphCanvas, { MIN_ZOOM, type PersonalLens } from './graph/GraphCanvas';
import DetailPanel from './panel/DetailPanel';
import FilterPanel from './filters/FilterPanel';
import PersonalPanel from './personal/PersonalPanel';
import { usePersonal } from './personal/usePersonal';
import TopBanner from './mobile/TopBanner';
import { useIsMobile } from './mobile/useIsMobile';
import { NO_INSETS, type Insets } from './graph/insets';
import { sheetAfterDrag } from './mobile/sheet';

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
  const isMobile = useIsMobile();
  /**
   * Mobile chrome starts CLOSED: the map is the product, and the old layout opened
   * with both panels mounted, covering it entirely. Controls are summoned, not
   * permanent.
   */
  const [bannerOpen, setBannerOpen] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  /** Dragged down out of the way. Reset whenever a new genre is picked. */
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const personal = usePersonal(dataset);
  const nodesById = useMemo(
    () => (dataset ? indexNodes(dataset) : new Map<string, never>()),
    [dataset],
  );
  // The lens the canvas draws: only when toggled on and there is something to show.
  const lens = useMemo<PersonalLens | null>(() => {
    if (!personal.lensOn || personal.weights.length === 0) return null;
    return {
      matched: new Map(personal.weights.map((genre) => [genre.id, genre.weight])),
      suggested: new Set(personal.suggestions.map((suggestion) => suggestion.id)),
    };
  }, [personal.lensOn, personal.weights, personal.suggestions]);

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

  /**
   * Measure the bottom sheet. It floats OVER the full-bleed canvas on mobile, so the
   * camera needs its real height to avoid centring genres behind it — the bug in the
   * phone screenshots, where the focused node sat half-hidden at the sheet edge.
   */
  useEffect(() => {
    const el = sheetRef.current;
    if (!isMobile || !el) {
      setSheetHeight(0);
      return;
    }
    const report = () => setSheetHeight(el.getBoundingClientRect().height);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, state.focusId, dataset, sheetCollapsed]);

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
    // Picking a genre gets the chrome out of the way — you asked to look at the map.
    setBannerOpen(false);
    // ...and brings the sheet back, since a new pick is a request to see it.
    setSheetCollapsed(false);
  };

  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    setState((s) => ({ ...s, selectedIds }));
  }, []);

  // Panel picks (your genres / branch out) focus directly — no toggle semantics.
  const handlePick = useCallback((genreId: string) => {
    setState((s) => ({ ...s, focusId: genreId }));
    setFanOpen(true);
    setBannerOpen(false);
    setSheetCollapsed(false);
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

  const focusNode = state.focusId
    ? (dataset.nodes.find((n) => n.id === state.focusId) ?? null)
    : null;

  const filterPanel = (
    <FilterPanel
      nodes={dataset.nodes}
      selectedIds={state.selectedIds}
      onSelectionChange={handleSelectionChange}
    />
  );
  const personalPanel = (
    <PersonalPanel
      personal={personal}
      nodesById={nodesById}
      onPick={handlePick}
      horizontal={isMobile}
    />
  );

  // What the chrome covers, so the camera can aim at the part you can still see.
  // Desktop chrome sits BESIDE the canvas rather than over it, so it contributes none.
  const insets: Insets = isMobile
    ? { top: bannerHeight, bottom: sheetHeight }
    : NO_INSETS;

  return (
    <main className={isMobile ? 'app app--mobile' : 'app'}>
      {isMobile ? (
        <TopBanner
          open={bannerOpen}
          onOpenChange={setBannerOpen}
          onHeightChange={setBannerHeight}
          filter={filterPanel}
          personal={personalPanel}
        />
      ) : (
        <aside className="filters" aria-label="Genre filters">
          {filterPanel}
          {personalPanel}
        </aside>
      )}

      <section className="canvas-host" aria-label="Genre map">
        <GraphCanvas
          dataset={dataset}
          state={state}
          fanOpen={fanOpen}
          lens={lens}
          insets={insets}
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

      <aside
        className={[
          'detail',
          isMobile && focusNode === null ? 'detail--idle' : '',
          // The banner opening collapses the sheet too — reusing the SAME class
          // rather than a parallel `:has(.top-banner)` rule, which silently stopped
          // matching when the sheet's internals were renamed.
          isMobile && (sheetCollapsed || bannerOpen) ? 'detail--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Genre detail"
        ref={sheetRef}
      >
        {isMobile && focusNode !== null && (
          /*
           * Drag handle. The gesture lives on this strip rather than the whole sheet
           * so that scrolling a track list never dismisses what you are reading.
           */
          <div
            className="sheet-handle"
            role="button"
            tabIndex={0}
            aria-expanded={!sheetCollapsed}
            aria-label={sheetCollapsed ? 'Expand details' : 'Collapse details'}
            onClick={() => setSheetCollapsed((c) => !c)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSheetCollapsed((c) => !c);
              }
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              dragStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = dragStart.current;
              if (!start) return;
              dragStart.current = null;
              const touch = event.changedTouches[0];
              // Capture the deltas BEFORE the updater. React may invoke a state
              // updater more than once (StrictMode does in development), and reading
              // the ref inside it threw once the gesture had already cleared it.
              const dx = touch.clientX - start.x;
              const dy = touch.clientY - start.y;
              setSheetCollapsed((collapsed) => sheetAfterDrag(collapsed, dx, dy));
            }}
          >
            <span className="sheet-grip" aria-hidden="true" />
          </div>
        )}
        <DetailPanel node={focusNode} asSlides={isMobile} />
      </aside>
    </main>
  );
}
