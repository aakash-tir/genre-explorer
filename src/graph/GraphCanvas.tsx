/**
 * The map — a single imperative Canvas 2D component that React mounts once and never
 * re-renders. Everything that DECIDES what appears here lives in the pure modules
 * (`lod.ts`, `edges.ts`, `colors.ts`, `camera.ts`); this file only puts pixels where
 * they say.
 *
 * Camera: `d3-zoom` owns the live transform (wheel zoom, drag pan, pinch). The zoom
 * factor is mirrored into app state on gesture end — not per frame — so the URL and the
 * React tree update at rest while panning stays at canvas speed. Programmatic zoom
 * changes (deep links, the zoom buttons) flow the other way, into `d3-zoom`, so its
 * internal state never diverges from the app's.
 *
 * In test environments (jsdom) `getContext('2d')` returns null; every draw is a no-op
 * and the component is just an inert <canvas>.
 */
import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';

import type { GraphDataset } from '../types';
import type { AppState } from '../lib/deepLink';

import { computeFit, screenRadius, worldToScreen } from './camera';
import { assignFamilyHues, edgeColor, nodeGradient, toCss, genreColor } from './colors';
import { drawnEdges, focusChildren } from './edges';
import { fanPositions, type WorldPosition } from './fan';
import { FULL_DETAIL_ZOOM, isLabelVisible, visibilityContext, visibleNodes } from './lod';

export const MIN_ZOOM = 0.5;

const BACKGROUND = '#08080c';
const LABEL_COLOR = 'rgba(232, 232, 240, 0.87)';
const LABEL_FONT = '12px system-ui, sans-serif';

/** Zoom the camera settles at when focusing a genre from further out. */
export const FOCUS_ZOOM = 4;

interface GraphCanvasProps {
  dataset: GraphDataset;
  state: AppState;
  onZoomChange: (zoom: number) => void;
  onFocusChange: (focusId: string | null) => void;
}

export default function GraphCanvas({
  dataset,
  state,
  onZoomChange,
  onFocusChange,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const behaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const structural = useMemo(() => drawnEdges(dataset.edges), [dataset]);
  const nodesById = useMemo(
    () => new Map(dataset.nodes.map((node) => [node.id, node])),
    [dataset],
  );
  // Popularity-ranked hues; singleton families are absent → neutral (null).
  const hues = useMemo(() => assignFamilyHues(dataset.nodes), [dataset]);
  const hueOf = (family: string) => hues.get(family) ?? null;

  // The radial fan: while focused, children render on a ring around the focus — a
  // rendering transform only, the baked layout is untouched. See fan.ts.
  const focusNode = state.focusId ? (nodesById.get(state.focusId) ?? null) : null;
  const fanned = useMemo<Map<string, WorldPosition>>(() => {
    if (!focusNode) return new Map();
    const children = focusChildren(focusNode.id, dataset.edges)
      .map((id) => nodesById.get(id))
      .filter((node) => node !== undefined);
    return fanPositions(focusNode, children);
  }, [focusNode, dataset, nodesById]);

  // The draw closure reads this render's props; `drawRef` republishes it after every
  // render (first effect below) so the d3-zoom handlers — subscribed once — always
  // call the latest version without re-subscribing.
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
    const data = dataset;
    const t = transformRef.current;
    const fit = computeFit(data.nodes, width, height);

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const context = visibilityContext(
      { zoom: t.k, focusId: state.focusId, selectedIds: state.selectedIds },
      data.edges,
    );
    const visible = visibleNodes(data.nodes, context);
    const visibleIds = new Set(visible.map((node) => node.id));

    // Fan override: a focused genre's children sit on the ring, everything else at
    // its baked position.
    const pos = (node: { id: string; x: number; y: number }): [number, number] => {
      const override = fanned.get(node.id);
      return worldToScreen(
        fit,
        t,
        override?.x ?? node.x,
        override?.y ?? node.y,
        width,
        height,
      );
    };

    // Edges first, so nodes paint over their own connection points. An edge is drawn
    // only when both ends are on screen — a line to an invisible node reads as a bug.
    ctx.lineWidth = 1;
    for (const edge of structural) {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
      const parent = nodesById.get(edge.source);
      const child = nodesById.get(edge.target);
      if (!parent || !child) continue;
      const [px, py] = pos(parent);
      const [cx, cy] = pos(child);
      ctx.strokeStyle = edgeColor(hueOf(child.family), child.depth);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    }

    for (const node of visible) {
      const [sx, sy] = pos(node);
      const r = screenRadius(node.popularity, fit, t.k);
      if (sx < -r || sy < -r || sx > width + r || sy > height + r) continue;
      const stops = nodeGradient(hueOf(node.family), node.depth);
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      gradient.addColorStop(0, stops.inner);
      gradient.addColorStop(1, stops.outer);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Focus ring — a halo in the focused genre's own colour, drawn over its node.
    if (focusNode && visibleIds.has(focusNode.id)) {
      const [sx, sy] = pos(focusNode);
      const r = screenRadius(focusNode.popularity, fit, t.k);
      ctx.strokeStyle = toCss(genreColor(hueOf(focusNode.family), 0), 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.font = LABEL_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = LABEL_COLOR;
    for (const node of visible) {
      if (!isLabelVisible(node, context)) continue;
      const [sx, sy] = pos(node);
      const r = screenRadius(node.popularity, fit, t.k);
      if (sx < -80 || sy < -r - 20 || sx > width + 80 || sy > height + r + 20) continue;
      ctx.fillText(node.name, sx, sy + r + 4);
    }
  };

  // Click-to-focus. Hit-testing walks the draw list back to front with a small slop;
  // clicking empty space releases focus. d3-zoom suppresses the click after a drag,
  // so panning never focuses by accident.
  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;
    const t = transformRef.current;
    const fit = computeFit(dataset.nodes, width, height);
    const context = visibilityContext(
      { zoom: t.k, focusId: state.focusId, selectedIds: state.selectedIds },
      dataset.edges,
    );
    let hit: string | null = null;
    for (const node of visibleNodes(dataset.nodes, context)) {
      const override = fanned.get(node.id);
      const [sx, sy] = worldToScreen(
        fit,
        t,
        override?.x ?? node.x,
        override?.y ?? node.y,
        width,
        height,
      );
      const r = screenRadius(node.popularity, fit, t.k) + 6;
      if ((clickX - sx) ** 2 + (clickY - sy) ** 2 <= r * r) hit = node.id;
    }
    onFocusChange(hit === state.focusId ? null : hit);
  };

  // Republish the freshest draw closure. No dependency array on purpose: it must run
  // after EVERY render, and before the effects below (declaration order guarantees it).
  useEffect(() => {
    drawRef.current = draw;
  });

  // Canvas sizing, DPR-aware. jsdom has no ResizeObserver — fall back to one initial
  // measure so tests can mount the component.
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

  // Programmatic zoom (deep link restore, zoom buttons) → push into d3-zoom. The zoom
  // event it fires redraws; the 'end' mirror is a no-op because the values then match.
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
  }, [state.focusId, state.selectedIds, dataset]);

  return (
    <canvas
      ref={canvasRef}
      className="graph-canvas"
      role="img"
      aria-label="Zoomable map of music genres"
      data-testid="graph-canvas"
      onClick={handleClick}
    />
  );
}
