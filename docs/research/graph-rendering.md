# Research — How to render and lay out the graph

**Date:** 2026-08-04
**Decision it supports:** Canvas 2D + `d3-zoom` for rendering, `d3-force` run **offline**
at build time for layout, with a radial focus mode on click.

---

## The constraints that actually decide this

From `plan.md`, in order of how much they narrow the field:

1. **Per-genre colours, and gradients for subgenres based on distance from the root.**
   Every node is a different colour, and the fill is a gradient keyed to depth.
2. **Level of detail on zoom** — "when zoomed out just show the big ones."
3. **Click a node to zoom into it**, and still show its sub-nodes with titles.
4. **Scroll-wheel zoom** as well as click-zoom.
5. Roughly **800–1,200 nodes** after the data threshold filter (see
   `music-data-sources.md`).

Constraint 5 is the quiet one: at 1,200 nodes, _raw rendering performance is not a
problem for anything_. That removes the usual reason to pick a WebGL library and lets
constraint 1 decide instead.

---

## Candidates

### Sigma.js v3 + graphology — rejected

Current stable is **3.0.3** (v4 is in alpha). It is the right tool for large graphs:
WebGL rendering, a mature camera, hit-testing, and graphology's ForceAtlas2 with a
WebWorker mode that keeps physics off the main thread.

Rejected because of constraint 1. Sigma draws nodes through **WebGL node programs**.
Flat-colour circles are built in; a per-node gradient fill means writing and maintaining
custom GLSL shader programs. The most distinctive part of the requested design would
become the hardest part of the codebase. Sigma's headline advantage — 10k+ nodes at
60fps — buys us nothing at 1,200.

Worth revisiting if the graph ever grows past ~10k nodes.

### react-force-graph — rejected

Fastest route to a working demo; zoom, pan and drag included. Two disqualifiers:

- It runs the force simulation **live in the browser**, so the layout is different on
  every visit. A map you're meant to learn and navigate must be in the same place every
  time. (This is fixable by pinning coordinates, at which point you're not really using
  the library's main feature.)
- Styling and level-of-detail control are the weakest of the three.

### Cytoscape.js — rejected

Excellent graph _analysis_ library with a large algorithm set, but DOM-dependent and
single-threaded, and its styling model is CSS-like rather than free-form drawing.
Aimed at biological network analysis, not at a designed visual experience.

### Canvas 2D + d3-zoom + offline d3-force — **chosen**

- `ctx.createRadialGradient()` is one line. The depth-gradient look is free.
- Level of detail is a plain `if` in the draw loop against the current zoom transform —
  no library semantics to fight.
- `d3-zoom` gives scroll-wheel zoom, pan, and programmatic animated transitions to a
  target node (the click-to-zoom behaviour) out of the box.
- 1,200 circles plus ~1,500 edges per frame on a 2D canvas is comfortably 60fps.
- The layout is computed **once, at build time**, by `d3-force` in Node, and the
  resulting `x`/`y` coordinates are baked into the dataset JSON. The map is therefore
  identical on every visit and on every device, the browser never runs a simulation, and
  first paint is immediate.

Cost accepted: hit-testing, label collision avoidance, and the render loop are ours to
write. That is a few hundred lines of well-understood code, and it is the code that
determines whether the app feels good.

Sources:

- [Sigma.js](https://www.sigmajs.org/) · [npm: sigma 3.0.3](https://www.npmjs.com/package/sigma)
- [A fresh new version of sigma.js (v3 announcement)](https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/)
- [Cytoscape.js vs vis-network vs Sigma.js 2026](https://www.pkgpulse.com/guides/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026)
- [Memgraph — graph visualization tool tradeoffs](https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool)

---

## Layout: constellation with radial focus mode

Two shapes were considered.

**Pure force-directed** produces the organic star-map look that suits a music genre
space, but dense families — electronic, metal — stay visually tangled even zoomed in,
because force layout optimises globally and doesn't care that you're currently looking at
one cluster.

**Pure radial tree** is always readable and never tangled, but reads as an org chart, and
fusion genres (which have two ancestries) sit awkwardly in a strict tree.

**Chosen: force constellation as the overview, radial fan on focus.** The baked
`d3-force` positions are the resting state. When a node is clicked, its direct children
animate from their resting positions onto a ring around it, and animate back when focus
is released. Nothing about the underlying data changes — this is purely a rendering
transform — so the map you learn stays the map you get.

---

## Level of detail

Three inputs decide whether a node is drawn:

1. **Zoom level** vs. the node's popularity rank. Zoomed all the way out, only genres
   above a popularity cutoff are drawn; the cutoff drops as you zoom in.
2. **Focus.** When a node is focused, its subtree is always drawn regardless of the zoom
   cutoff — this is the plan's "still show some sub nodes with the titles" rule.
3. **Filter selection.** When the left-hand filter has a selection, everything outside
   the selected genres and their descendants is hidden entirely.

Labels have their own, stricter threshold than nodes: a node can be a visible dot before
it is large enough to earn a label.

This logic is pure and lives in `src/graph/lod.ts` with unit tests. It is the kind of
rule that is easy to get subtly wrong and impossible to eyeball, so it is tested rather
than tuned by hand in a render loop.

---

## The fusion-edge rule

From `plan.md`: _"If a sub genre is a mix of 2 big genre don't try to connect the 2 with a
displayed edge although an edge may exist in the codebase. Don't display the edge but if
zoomed into each category 1 at a time show them in both."_

MusicBrainz gives us this distinction for free (see `music-data-sources.md`):

- `subgenre of` → **structural**. Drawn. Each genre has exactly one drawn parent edge.
- `fusion of` and `influenced by` → **associative**. Present in the dataset, never drawn
  in the overview.

When a genre is focused, its associative children are included in the focused set, so
`alternative dance` appears under both `alternative rock` and `dance` when each is
focused in turn — without either edge ever being drawn on the map.

Also pure, also unit-tested (`src/graph/edges.ts`).
