# Progress

**Current milestone: 3 — The map renders** (complete)

The centre pane is a real map: `src/graph/GraphCanvas.tsx` (imperative Canvas 2D,
mounted once) draws nodes with per-node radial gradients, structural edges in the
child's dimmed colour, and LOD-gated labels; `d3-zoom` provides wheel zoom, drag pan
and the zoom buttons; `src/graph/camera.ts` holds the pure world→screen math (fit +
live transform, sqrt-of-zoom radius growth) with unit tests. Zoom round-trips through
the URL (`?zoom=8`), restored on load. Verified by driving headless Chromium: 9 roots
at zoom 1 → 523 nodes at zoom 8 → all 912 deep in, pan works, no console errors.

**Next: milestone 4 — Focus and the panel.** Click-to-focus with the radial child fan
(camera.ts + GraphCanvas hit-testing), then pipeline stages 4–5 (artists, recordings,
links, ListenBrainz ranking) and the detail panel that reads `genres/<id>.json`.
Known colour issue to revisit: rock and electronic hash to near-identical hues
(`docs/future.md`).

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
