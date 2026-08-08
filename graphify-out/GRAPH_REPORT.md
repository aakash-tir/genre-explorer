# Graph Report - genre-explorer  (2026-08-08)

## Corpus Check
- 990 files · ~104,273 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 511 nodes · 840 edges · 35 communities (32 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e1034424`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- lod.ts
- compilerOptions
- scripts
- App.tsx
- Research — Where the genre, song and artist data comes from
- generate_diagram.py
- Design System
- Genre Explorer — Project Context
- Genre Explorer — Plan
- Research — How to render and lay out the graph
- Genre Explorer
- Runbook — CI and branch protection
- colors.ts
- 2026-08-04
- Future
- Research — Hosting the site
- pull_request_template.md
- .prettierrc.json
- protect-main.sh
- index.ts
- progress.md
- 2026-08-06
- 2026-08-07
- layout.ts
- Hosting: Cloudflare Pages
- App.tsx
- Hosting

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `compilerOptions` - 20 edges
3. `cachedFetch()` - 17 edges
4. `2026-08-07` - 15 edges
5. `buildDataset()` - 14 edges
6. `scripts` - 12 edges
7. `GenreNode` - 12 edges
8. `GraphDataset` - 10 edges
9. `Design System` - 10 edges
10. `Genre Explorer — Plan` - 10 edges

## Surprising Connections (you probably didn't know these)
- `buildGraph()` --indirect_call--> `child()`  [INFERRED]
  scripts/build-dataset/build-graph.ts → tests/graph/fan.test.ts
- `GraphCanvas()` --indirect_call--> `candidates()`  [INFERRED]
  src/graph/GraphCanvas.tsx → tests/scripts/rank.test.ts
- `structuralDescendants()` --indirect_call--> `child()`  [INFERRED]
  src/graph/edges.ts → tests/graph/fan.test.ts
- `BuiltGraph` --references--> `GenreEdge`  [EXTRACTED]
  scripts/build-dataset/build-graph.ts → src/types.ts
- `emitGraph()` --references--> `GraphDataset`  [EXTRACTED]
  scripts/build-dataset/emit.ts → src/types.ts

## Import Cycles
- None detected.

## Communities (35 total, 3 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.04
Nodes (49): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+41 more)

### Community 1 - "lod.ts"
Cohesion: 0.15
Nodes (23): BuiltGraph, ASSOCIATIVE_KINDS, DRAWN_KINDS, drawnEdges(), focusChildren(), isAssociative(), isDrawn(), structuralDescendants() (+15 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 3 - "scripts"
Cohesion: 0.06
Nodes (33): d3-force, d3-selection, d3-transition, d3-zoom, dependencies, d3-force, d3-selection, d3-transition (+25 more)

### Community 4 - "App.tsx"
Cohesion: 0.40
Nodes (4): 2026-08-08, Post-merge chores for PR #18, Sticky selection: the panel and preview survive map browsing, Went public, real branch protection, and the site is deploying to GitHub Pages

### Community 5 - "Research — Where the genre, song and artist data comes from"
Cohesion: 0.08
Nodes (24): 1. Spotify is no longer a viable data source (this is the finding that shapes the project), 2. Every Noise at Once is not a maintainable source either, 3. MusicBrainz has the genre hierarchy — and it matches the plan exactly, 4. Artists per genre, with real streaming links, 5. Popularity — the popular / obscure split, 6. Genre popularity for node size, 7. Deezer — audio previews, no key required, Conclusion (+16 more)

### Community 6 - "generate_diagram.py"
Cohesion: 0.18
Nodes (14): assign_columns(), endpoint(), esc(), group_chain(), layout(), main(), Node, (cx, cy, left, right, top, bottom, column) for a node OR group id. (+6 more)

### Community 7 - "Design System"
Cohesion: 0.12
Nodes (15): Architecture Diagram Skill, Auto-layout scaffold (local extension v1.2), Color Palette, Component Box Pattern, Design System, Export Toolbar (built-in), Info Card Pattern, Layout Structure (+7 more)

### Community 8 - "Genre Explorer — Project Context"
Cohesion: 0.14
Nodes (13): 1. Edges — `src/graph/edges.ts`, 2. Level of detail — `src/graph/lod.ts`, 3. Colour — `src/graph/colors.ts`, Auth model, Camera model, Data model, Genre Explorer — Project Context, Known gaps (+5 more)

### Community 9 - "Genre Explorer — Plan"
Cohesion: 0.14
Nodes (13): Architecture, Edge rules, External dependencies, Genre Explorer — Plan, Known upstream breakage, Level of detail, Milestones, Open questions (+5 more)

### Community 10 - "Research — How to render and lay out the graph"
Cohesion: 0.18
Nodes (10): Candidates, Canvas 2D + d3-zoom + offline d3-force — **chosen**, Cytoscape.js — rejected, Layout: constellation with radial focus mode, Level of detail, react-force-graph — rejected, Research — How to render and lay out the graph, Sigma.js v3 + graphology — rejected (+2 more)

### Community 11 - "Genre Explorer"
Cohesion: 0.20
Nodes (9): After every PR merge (required), Backlog (required), Change log (required), Conventions, Don't commit secrets, Genre Explorer, Git workflow (required), Tech stack (+1 more)

### Community 12 - "Runbook — CI and branch protection"
Cohesion: 0.22
Nodes (8): Applying it, Branch protection on `main`, ⚠️ Current state: server-side protection is NOT active, Day-to-day workflow, Runbook — CI and branch protection, The dataset refresh workflow, The gate, Verifying it took

### Community 13 - "colors.ts"
Cohesion: 0.14
Nodes (24): CameraTransform, computeFit(), Fit, screenRadius(), worldToScreen(), assignFamilyHues(), edgeColor(), genreColor() (+16 more)

### Community 14 - "2026-08-04"
Cohesion: 0.25
Nodes (7): 2026-08-04, Built the skeleton and the tests that make it a gate, CI, and one deliberate omission, Decisions taken with the user, Expanded the plan from a sketch into a scaffolded project, Found the hard part: MusicBrainz hides the hierarchy from its own API, Research: Spotify turned out to be a dead end, and MusicBrainz turned out to be perfect

### Community 15 - "Future"
Cohesion: 0.29
Nodes (6): Decisions still open, Deferred from v1, Future, Known gaps, Scaling, Upstream watch

### Community 16 - "Research — Hosting the site"
Cohesion: 0.33
Nodes (5): Deployment, Options, Payload budget, Research — Hosting the site, What we need to host

### Community 17 - "pull_request_template.md"
Cohesion: 0.33
Nodes (5): After merging — required artifacts, Before merging, How it was tested, What changed, Why

### Community 18 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 20 - "index.ts"
Cohesion: 0.07
Nodes (54): buildGraph(), slugify(), emitGraph(), ArtistSearch, CandidateArtist, CandidateRecording, escapeLucene(), fetchEntities() (+46 more)

### Community 29 - "2026-08-07"
Cohesion: 0.12
Nodes (15): 2026-08-07, Fix: PR #4 merged red — prettier failure masked by a piped exit code, Milestone 3: the map renders, Milestone 4: focus and the panel — the core loop works end to end, Milestone 5: find your way around — the filter panel, Milestone 6: previews, mobile, and the colour fix, Milestone 7: the weekly refresh workflow — v1 code-complete, Post-merge chores for PR #10 (+7 more)

### Community 30 - "layout.ts"
Cohesion: 0.29
Nodes (7): UnplacedNode, Anchor, computeAnchors(), layoutGraph(), seededRandom(), edges, nodes

### Community 31 - "Hosting: Cloudflare Pages"
Cohesion: 0.30
Nodes (11): App(), GraphCanvasProps, AppState, DEFAULT_STATE, isSameUrl(), parseUrl(), sanitiseId(), stripBase() (+3 more)

### Community 32 - "App.tsx"
Cohesion: 0.10
Nodes (29): emitDetail(), FilterPanel(), FilterPanelProps, searchGenres(), createDetailCache(), DatasetError, fetchJson(), genreDetailUrl() (+21 more)

### Community 33 - "Hosting"
Cohesion: 0.40
Nodes (4): Fallback: Cloudflare Pages (unlimited static bandwidth), Hosting, How the GitHub Pages deploy works, Limits worth knowing

## Knowledge Gaps
- **214 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+209 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `GraphCanvas()` connect `colors.ts` to `lod.ts`, `index.ts`, `Hosting: Cloudflare Pages`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _214 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `lod.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14838709677419354 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._