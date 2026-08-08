# Graph Report - genre-explorer  (2026-08-07)

## Corpus Check
- 984 files · ~78,601 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 478 nodes · 779 edges · 31 communities (28 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2489b8b3`
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `GraphCanvas()` - 16 edges
3. `cachedFetch()` - 15 edges
4. `buildDataset()` - 13 edges
5. `scripts` - 12 edges
6. `GenreNode` - 12 edges
7. `GraphDataset` - 10 edges
8. `Design System` - 10 edges
9. `Genre Explorer — Plan` - 10 edges
10. `visibilityContext` - 9 edges

## Surprising Connections (you probably didn't know these)
- `BuiltGraph` --references--> `GenreEdge`  [EXTRACTED]
  scripts/build-dataset/build-graph.ts → src/types.ts
- `buildGraph()` --indirect_call--> `child()`  [INFERRED]
  scripts/build-dataset/build-graph.ts → tests/graph/fan.test.ts
- `structuralDescendants()` --indirect_call--> `child()`  [INFERRED]
  src/graph/edges.ts → tests/graph/fan.test.ts
- `emitGraph()` --references--> `GraphDataset`  [EXTRACTED]
  scripts/build-dataset/emit.ts → src/types.ts
- `GraphCanvas()` --indirect_call--> `child()`  [INFERRED]
  src/graph/GraphCanvas.tsx → tests/graph/fan.test.ts

## Import Cycles
- None detected.

## Communities (31 total, 3 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.04
Nodes (49): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+41 more)

### Community 1 - "lod.ts"
Cohesion: 0.11
Nodes (31): App(), ASSOCIATIVE_KINDS, DRAWN_KINDS, drawnEdges(), focusChildren(), isAssociative(), isDrawn(), structuralDescendants() (+23 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 3 - "scripts"
Cohesion: 0.06
Nodes (33): d3-force, d3-selection, d3-transition, d3-zoom, dependencies, d3-force, d3-selection, d3-transition (+25 more)

### Community 4 - "App.tsx"
Cohesion: 0.10
Nodes (29): emitDetail(), FilterPanel(), FilterPanelProps, searchGenres(), createDetailCache(), DatasetError, fetchJson(), genreDetailUrl() (+21 more)

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
Cohesion: 0.18
Nodes (20): CameraTransform, computeFit(), Fit, screenRadius(), worldToScreen(), edgeColor(), familyHue(), genreColor() (+12 more)

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
Nodes (52): buildGraph(), BuiltGraph, slugify(), emitGraph(), ArtistSearch, CandidateArtist, CandidateRecording, escapeLucene() (+44 more)

### Community 29 - "2026-08-07"
Cohesion: 0.22
Nodes (8): 2026-08-07, Fix: PR #4 merged red — prettier failure masked by a piped exit code, Milestone 3: the map renders, Milestone 4: focus and the panel — the core loop works end to end, Milestone 5: find your way around — the filter panel, Post-merge chores for PR #3: knowledge graph refresh + first architecture diagram, Post-merge chores for PR #6, Post-merge chores for PR #8

### Community 30 - "layout.ts"
Cohesion: 0.33
Nodes (6): UnplacedNode, layoutGraph(), radius(), seededRandom(), edges, nodes

## Knowledge Gaps
- **200 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `scripts`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `GenreNode` connect `App.tsx` to `lod.ts`, `index.ts`, `colors.ts`, `layout.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `lod.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11184939091915837 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._