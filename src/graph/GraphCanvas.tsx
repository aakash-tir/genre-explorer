/**
 * The map — a single imperative Canvas 2D component that React mounts once and never
 * re-renders. Everything that DECIDES what appears here lives in the pure modules
 * (`lod.ts`, `edges.ts`, `colors.ts`, `camera.ts`, `fan.ts`, `labels.ts`); this file
 * only puts pixels where they say.
 *
 * Render order per frame: dust → edges → nodes → focus ring → labels.
 *
 *   - DUST: every node that hasn't cleared the LOD cutoff still paints as a faint
 *     2px mote, so the map always has its galaxy shape instead of a few dots in a
 *     void (image 1 of the UI review).
 *   - FOCUS MODE: while a genre is focused, unrelated nodes dim to a shadow, their
 *     edges and labels disappear, and anything squatting inside the fan ring is
 *     displaced just outside it — the ring becomes the whole picture (image 3).
 *   - LABELS: `lod.ts` says who earned one; `labels.ts` drops whichever would
 *     overlap a more important one this frame (image 2).
 *
 * Camera: `d3-zoom` owns the live transform (wheel zoom, drag pan, pinch). The zoom
 * factor is mirrored into app state on gesture end — not per frame — so the URL and
 * the React tree update at rest while panning stays at canvas speed.
 *
 * In test environments (jsdom) `getContext('2d')` returns null; every draw is a
 * no-op and the component is just an inert <canvas>.
 */
import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';

import type { GraphDataset } from '../types';
import type { AppState } from '../lib/deepLink';

import { computeFit, screenRadius, worldToScreen } from './camera';
import { assignFamilyHues, edgeColor, genreColor, nodeGradient, toCss } from './colors';
import { drawnEdges, focusChildren } from './edges';
import { fanPositions, fanRadius, ringClearance, type WorldPosition } from './fan';
import { placeLabels, type LabelCandidate } from './labels';
import { FULL_DETAIL_ZOOM, isLabelVisible, visibilityContext, visibleNodes } from './lod';

export const MIN_ZOOM = 0.5;

const BACKGROUND = '#08080c';
const LABEL_COLOR = 'rgba(232, 232, 240, 0.87)';
const LABEL_FONT = '12px system-ui, sans-serif';
const LABEL_HEIGHT = 13;

/** Zoom the camera settles at when focusing a genre from further out. */
export const FOCUS_ZOOM = 4;

/** Alpha for nodes unrelated to the current focus. */
const DIMMED_ALPHA = 0.12;

/** Hovered nodes swell slightly — enough to feel alive, not enough to shove labels. */
const HOVER_SCALE = 1.18;

/** Dust: sub-cutoff nodes still paint as faint motes so the map keeps its shape. */
const DUST_RADIUS = 2;
const DUST_ALPHA = 0.3;

interface GraphCanvasProps {
  dataset: GraphDataset;
  state: AppState;
  /** Whether the focused genre's fan/dim view is open. The selection (and its
   * ring) outlives the fan — see App.tsx for the click semantics. */
  fanOpen: boolean;
  onZoomChange: (zoom: number) => void;
  /** Reports the raw hit: a node id, or null for empty space. App decides. */
  onFocusChange: (focusId: string | null) => void;
}

export default function GraphCanvas({
  dataset,
  state,
  fanOpen,
  onZoomChange,
  onFocusChange,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const behaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const hoveredRef = useRef<string | null>(null);

  const structural = useMemo(() => drawnEdges(dataset.edges), [dataset]);
  const nodesById = useMemo(
    () => new Map(dataset.nodes.map((node) => [node.id, node])),
    [dataset],
  );
  // Popularity-ranked hues; singleton families are absent → neutral (null).
  const hues = useMemo(() => assignFamilyHues(dataset.nodes), [dataset]);
  const hueOf = (family: string) => hues.get(family) ?? null;

  // Focus overlay: the fan (children on a ring) plus ring clearance (bystanders
  // displaced outside it). Both rendering transforms only — the baked layout never
  // changes, release puts everything back. `related` is null when nothing is
  // focused, meaning "no dimming".
  const focusNode = state.focusId ? (nodesById.get(state.focusId) ?? null) : null;
  const overlay = useMemo<{
    overrides: Map<string, WorldPosition>;
    related: Set<string> | null;
  }>(() => {
    if (!focusNode || !fanOpen) return { overrides: new Map(), related: null };
    const childIds = focusChildren(focusNode.id, dataset.edges);
    const children = childIds
      .map((id) => nodesById.get(id))
      .filter((node) => node !== undefined);
    const overrides = new Map(fanPositions(focusNode, children));
    const related = new Set([focusNode.id, ...childIds]);
    const ring = fanRadius(focusNode, children);
    const bystanders = dataset.nodes.filter((node) => !related.has(node.id));
    for (const [id, position] of ringClearance(focusNode, ring, bystanders)) {
      overrides.set(id, position);
    }
    return { overrides, related };
  }, [focusNode, fanOpen, dataset, nodesById]);

  const worldPos = (node: { id: string; x: number; y: number }) => {
    const override = overlay.overrides.get(node.id);
    return { x: override?.x ?? node.x, y: override?.y ?? node.y };
  };

  // Shared by click and hover. Walks the draw list back to front with a small slop.
  const hitTest = (screenX: number, screenY: number): string | null => {
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return null;
    const t = transformRef.current;
    const fit = computeFit(dataset.nodes, width, height);
    const context = visibilityContext(
      {
        zoom: t.k,
        focusId: fanOpen ? state.focusId : null,
        selectedIds: state.selectedIds,
      },
      dataset.edges,
    );
    let hit: string | null = null;
    for (const node of visibleNodes(dataset.nodes, context)) {
      const w = worldPos(node);
      const [sx, sy] = worldToScreen(fit, t, w.x, w.y, width, height);
      const r = screenRadius(node.popularity, fit, t.k) + 6;
      if ((screenX - sx) ** 2 + (screenY - sy) ** 2 <= r * r) hit = node.id;
    }
    return hit;
  };

  // The draw closure reads this render's props; `drawRef` republishes it after
  // every render (first effect below) so the d3-zoom handlers — subscribed once —
  // always call the latest version without re-subscribing.
  const drawRef = useRef(() => {});
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return; // jsdom
    }
    if (!ctx) return;

    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;
    const t = transformRef.current;
    const fit = computeFit(dataset.nodes, width, height);
    const { related } = overlay;
    const hovered = hoveredRef.current;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const context = visibilityContext(
      {
        zoom: t.k,
        focusId: fanOpen ? state.focusId : null,
        selectedIds: state.selectedIds,
      },
      dataset.edges,
    );
    const visible = visibleNodes(dataset.nodes, context);
    const visibleIds = new Set(visible.map((node) => node.id));

    const screen = (node: { id: string; x: number; y: number }): [number, number] => {
      const w = worldPos(node);
      return worldToScreen(fit, t, w.x, w.y, width, height);
    };

    // 1. Dust — everything below the cutoff, faint, so the galaxy keeps its shape.
    // Skipped for filtered-out nodes: the filter is a promise that they're gone.
    ctx.globalAlpha = related ? DUST_ALPHA * 0.5 : DUST_ALPHA;
    for (const node of dataset.nodes) {
      if (visibleIds.has(node.id)) continue;
      if (context.allowed !== null && !context.allowed.has(node.id)) continue;
      const [sx, sy] = screen(node);
      if (sx < -4 || sy < -4 || sx > width + 4 || sy > height + 4) continue;
      ctx.fillStyle = toCss(genreColor(hueOf(node.family), node.depth));
      ctx.beginPath();
      ctx.arc(sx, sy, DUST_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. Edges. In focus mode only the spokes of the focused genre draw — every
    // other line is exactly the clutter the review flagged.
    ctx.lineWidth = 1;
    for (const edge of structural) {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
      if (related && edge.source !== state.focusId && edge.target !== state.focusId) {
        continue;
      }
      const parent = nodesById.get(edge.source);
      const child = nodesById.get(edge.target);
      if (!parent || !child) continue;
      const [px, py] = screen(parent);
      const [cx, cy] = screen(child);
      ctx.strokeStyle = related
        ? toCss(genreColor(hueOf(child.family), child.depth), 0.55)
        : edgeColor(hueOf(child.family), child.depth);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    // 3. Nodes. Unrelated ones become shadows while a genre is focused.
    for (const node of visible) {
      const [sx, sy] = screen(node);
      const grow = node.id === hovered ? HOVER_SCALE : 1;
      const r = screenRadius(node.popularity, fit, t.k) * grow;
      if (sx < -r || sy < -r || sx > width + r || sy > height + r) continue;
      ctx.globalAlpha = related && !related.has(node.id) ? DIMMED_ALPHA : 1;
      const stops = nodeGradient(hueOf(node.family), node.depth);
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      gradient.addColorStop(0, stops.inner);
      gradient.addColorStop(0.78, stops.outer);
      gradient.addColorStop(1, toCss(genreColor(hueOf(node.family), node.depth), 0.55));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 4. Rings: focus (solid, its family colour) and hover (subtle).
    if (focusNode) {
      // The selection ring outlives the fan: while a preview plays and the user
      // browses, the outline marks what's in the panel. Sub-cutoff selections are
      // ringed at dust size.
      const [sx, sy] = screen(focusNode);
      const r = visibleIds.has(focusNode.id)
        ? screenRadius(focusNode.popularity, fit, t.k) *
          (focusNode.id === hovered ? HOVER_SCALE : 1)
        : DUST_RADIUS;
      ctx.strokeStyle = toCss(genreColor(hueOf(focusNode.family), 0), 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (hovered && hovered !== state.focusId) {
      const node = nodesById.get(hovered);
      if (node && visibleIds.has(node.id)) {
        const [sx, sy] = screen(node);
        const r = screenRadius(node.popularity, fit, t.k) * HOVER_SCALE;
        ctx.strokeStyle = 'rgba(232, 232, 240, 0.6)';
        ctx.beginPath();
        ctx.arc(sx, sy, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 5. Labels — earned via lod.ts, then de-overlapped via labels.ts. The hovered
    // node always gets its name; focus-related labels outrank everything else.
    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const candidates: LabelCandidate[] = [];
    for (const node of visible) {
      const earned =
        node.id === hovered ||
        (isLabelVisible(node, context) && (!related || related.has(node.id)));
      if (!earned) continue;
      const [sx, sy] = screen(node);
      const r =
        screenRadius(node.popularity, fit, t.k) * (node.id === hovered ? HOVER_SCALE : 1);
      if (sx < -120 || sy < -r - 24 || sx > width + 120 || sy > height + r + 24) {
        continue;
      }
      const textWidth = ctx.measureText(node.name).width;
      candidates.push({
        id: node.id,
        x: sx - textWidth / 2,
        y: sy + r + 4,
        width: textWidth,
        height: LABEL_HEIGHT,
        priority:
          node.id === hovered || related?.has(node.id)
            ? Number.MAX_SAFE_INTEGER
            : node.popularity,
      });
    }
    const placed = placeLabels(candidates);
    ctx.fillStyle = LABEL_COLOR;
    for (const candidate of candidates) {
      if (!placed.has(candidate.id)) continue;
      const node = nodesById.get(candidate.id);
      if (!node) continue;
      ctx.fillText(node.name, candidate.x + candidate.width / 2, candidate.y);
    }
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    onFocusChange(hitTest(event.clientX - rect.left, event.clientY - rect.top));
  };

  // Hover: re-hit-test on move, redraw only when the hovered node changes.
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit = hitTest(event.clientX - rect.left, event.clientY - rect.top);
    if (hit !== hoveredRef.current) {
      hoveredRef.current = hit;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      drawRef.current();
    }
  };

  // Republish the freshest draw closure. No dependency array on purpose: it must
  // run after EVERY render, and before the effects below (declaration order).
  useEffect(() => {
    drawRef.current = draw;
  });

  // Canvas sizing, DPR-aware. jsdom has no ResizeObserver — fall back to one
  // initial measure so tests can mount the component.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      drawRef.current();
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // d3-zoom wiring, once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const behavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([MIN_ZOOM, FULL_DETAIL_ZOOM])
      .on('zoom', (event: { transform: ZoomTransform }) => {
        transformRef.current = event.transform;
        drawRef.current();
      })
      .on('end', (event: { transform: ZoomTransform }) => {
        onZoomChange(event.transform.k);
      });
    behaviorRef.current = behavior;
    const selection = select(canvas);
    selection.call(behavior);
    // Mount-time value on purpose: this restores a deep-linked zoom exactly once.
    if (state.zoom !== 1) {
      selection.call(behavior.scaleTo, state.zoom);
    }
    return () => {
      selection.on('.zoom', null);
    };
    // onZoomChange is intentionally read once; parents pass a stable setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Programmatic zoom (deep link restore, zoom buttons) → push into d3-zoom. The
  // zoom event it fires redraws; the 'end' mirror is a no-op when values match.
  useEffect(() => {
    const canvas = canvasRef.current;
    const behavior = behaviorRef.current;
    if (!canvas || !behavior) return;
    if (Math.abs(transformRef.current.k - state.zoom) > 0.001) {
      select(canvas).call(behavior.scaleTo, state.zoom);
    }
  }, [state.zoom]);

  // Focusing a genre flies the camera to it: centre the node, and come in to at
  // least FOCUS_ZOOM if the camera was further out. Releasing focus moves nothing —
  // the fan collapses in place.
  useEffect(() => {
    const canvas = canvasRef.current;
    const behavior = behaviorRef.current;
    if (!canvas || !behavior || !focusNode) return;
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;
    const fit = computeFit(dataset.nodes, width, height);
    const k = Math.max(transformRef.current.k, FOCUS_ZOOM);
    const bx = (focusNode.x - fit.cx) * fit.scale + width / 2;
    const by = (focusNode.y - fit.cy) * fit.scale + height / 2;
    const target = zoomIdentity
      .translate(width / 2, height / 2)
      .scale(k)
      .translate(-bx, -by);
    select(canvas).transition().duration(500).call(behavior.transform, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusId]);

  // Focus and filter changes redraw without touching the camera.
  useEffect(() => {
    drawRef.current();
  }, [state.focusId, fanOpen, state.selectedIds, dataset]);

  return (
    <canvas
      ref={canvasRef}
      className="graph-canvas"
      role="img"
      aria-label="Zoomable map of music genres"
      data-testid="graph-canvas"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    />
  );
}
