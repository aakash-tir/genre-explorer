# Graph Report - C:\Users\aakas\personal-projects\currently-working\genre-explorer  (2026-08-12)

## Corpus Check
- 1018 files · ~103,908 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 603 nodes · 1205 edges · 42 communities (27 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.88)
- Token cost: 260,206 input · 9,800 output

## Community Hubs (Navigation)
- Build Pipeline Stages
- Runtime Map Rendering
- Personal Lens and Artist Index
- Research and Design Decisions
- App Shell and Dataset Loading
- TypeScript Build Config
- Detail and Filter Panels
- Architecture Diagram Skill
- Package Manifest and Scripts
- Diagram Auto-Layout Generator
- Dev and Test Dependencies
- Project Conventions and CI
- Tech Stack Choices
- Project Context and Data Sources
- Claude Instructions and Git Guardrails
- Backlog, Progress and Refresh Job
- Runtime Dependencies
- README and Auth Model
- Plan, Scope and Milestones
- Dataset Data Model
- Hosting and Deploy Workflow
- Prettier Config
- ESLint Core
- ESLint JS Rules
- React Hooks Lint
- React Refresh Lint
- Globals Package
- jsdom Test Environment
- User Event Testing
- d3-force Types
- d3-selection Types
- d3-transition Types
- Node Types
- React DOM Types
- TypeScript Compiler
- Vite Bundler
- React Frontend Rules (empty)

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `compilerOptions` - 20 edges
3. `cachedFetch()` - 17 edges
4. `Architecture Diagram Skill` - 17 edges
5. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
6. `buildDataset()` - 15 edges
7. `GenreNode` - 14 edges
8. `Genre Explorer - Claude Project Instructions` - 14 edges
9. `Genre Explorer Plan` - 14 edges
10. `scripts` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Tech Stack (choices and rejections)` --references--> `zod`  [EXTRACTED]
  plan.md → package.json
- `Tech Stack (choices and rejections)` --references--> `react`  [EXTRACTED]
  plan.md → package.json
- `Tech Stack (choices and rejections)` --references--> `tsx`  [EXTRACTED]
  plan.md → package.json
- `Tech Stack (choices and rejections)` --references--> `vitest`  [EXTRACTED]
  plan.md → package.json
- `Camera Model` --references--> `d3-force`  [EXTRACTED]
  .claude/project-context.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Eight-Stage Dataset Build Pipeline** — scripts_build_dataset_fetch_genres, scripts_build_dataset_fetch_hierarchy, scripts_build_dataset_fetch_popularity, scripts_build_dataset_fetch_entities, scripts_build_dataset_rank, scripts_build_dataset_fetch_previews, scripts_build_dataset_layout, scripts_build_dataset_emit [EXTRACTED 1.00]
- **Free, Unauthenticated Upstream Data Sources** — musicbrainz, listenbrainz, deezer [EXTRACTED 1.00]
- **Pure Tested Visibility Rules Feeding GraphCanvas** — src_graph_edges, src_graph_lod, src_graph_colors, src_graph_fan, src_graph_labels, src_graph_graphcanvas [EXTRACTED 1.00]
- **Chosen Build-time Data Pipeline (MusicBrainz + ListenBrainz + Deezer)** — docs_research_music_data_sources_musicbrainz_backbone, docs_research_music_data_sources_genre_html_scrape, docs_research_music_data_sources_listenbrainz_popularity, docs_research_music_data_sources_deezer_previews, docs_research_music_data_sources_genre_threshold_filter [EXTRACTED 1.00]
- **Graph Rendering Decision (Canvas 2D chosen over library candidates)** — docs_research_graph_rendering_canvas_2d_d3_zoom, docs_research_graph_rendering_sigma_js, docs_research_graph_rendering_react_force_graph, docs_research_graph_rendering_cytoscape_js, docs_research_graph_rendering_offline_d3_force_layout [EXTRACTED 1.00]
- **Personal 'Your Genres' Lens (intake, index, scoring, persistence)** — docs_research_listening_history_personalization_listenbrainz_bridge, docs_research_listening_history_personalization_spotify_export_upload, docs_research_listening_history_personalization_artist_genre_reverse_index, docs_research_listening_history_personalization_branch_out_adjacency, docs_research_listening_history_personalization_localstorage_persistence, docs_research_listening_history_personalization_runtime_network_exception [EXTRACTED 1.00]

## Communities (42 total, 15 thin omitted)

### Community 0 - "Build Pipeline Stages"
Cohesion: 0.06
Nodes (67): Sharp-Drop Guard, The Build Pipeline (scripts/build-dataset/), refresh job - rebuild and open PR, buildGraph(), BuiltGraph, slugify(), UnplacedNode, emitDetail() (+59 more)

### Community 1 - "Runtime Map Rendering"
Cohesion: 0.06
Nodes (62): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Detail Panel (DetailPanel.tsx), Focus Fan and Labels (fan.ts, labels.ts) (+54 more)

### Community 2 - "Personal Lens and Artist Index"
Cohesion: 0.06
Nodes (45): The Personal Lens (src/personal/), ARTIST_INDEX_PATH, buildArtistIndex(), DATA_DIR, emitArtistIndex(), normalizeArtistName(), spotifyArtistIdFromUrl(), ArtistTally (+37 more)

### Community 3 - "Research and Design Decisions"
Cohesion: 0.06
Nodes (59): Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen), Cytoscape.js (rejected), Fusion Edge Rule (structural drawn, associative hidden), Zoom Level of Detail (lod.ts rules), Offline d3-force Layout (build-time baked coordinates), Force Constellation with Radial Focus Mode, react-force-graph (rejected) (+51 more)

### Community 4 - "App Shell and Dataset Loading"
Cohesion: 0.12
Nodes (26): Shell and State (App.tsx, deepLink.ts), Deploy build job (vite build --base=/genre-explorer/), App HTML Entry (index.html), App(), GraphCanvasProps, PersonalLens, createDetailCache(), DatasetError (+18 more)

### Community 5 - "TypeScript Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 6 - "Detail and Filter Panels"
Cohesion: 0.11
Nodes (21): Filter Panel (FilterPanel.tsx), FilterPanel(), FilterPanelProps, searchGenres(), ArtistList(), cache, DetailPanel(), formatListens() (+13 more)

### Community 7 - "Architecture Diagram Skill"
Cohesion: 0.10
Nodes (23): After Every PR Merge (required), Architecture Diagram HTML Template, Architecture Diagram Skill, Auto-layout Scaffold (local extension v1.2), Color Palette, Component Box Pattern, Design System, Export Toolbar (built-in) (+15 more)

### Community 8 - "Package Manifest and Scripts"
Cohesion: 0.10
Nodes (19): engines, node, name, private, scripts, build, build:artist-index, build:dataset (+11 more)

### Community 9 - "Diagram Auto-Layout Generator"
Cohesion: 0.18
Nodes (14): assign_columns(), endpoint(), esc(), group_chain(), layout(), main(), Node, (cx, cy, left, right, top, bottom, column) for a node OR group id. (+6 more)

### Community 10 - "Dev and Test Dependencies"
Cohesion: 0.15
Nodes (15): devDependencies, prettier, @testing-library/dom, @testing-library/jest-dom, @testing-library/react, @types/d3-zoom, @types/react, typescript-eslint (+7 more)

### Community 11 - "Project Conventions and CI"
Cohesion: 0.19
Nodes (13): Conventions, Pure Logic Is Tested; Rendering Is Not, Committed Dataset Artifact, Personal Lens - Scoped Runtime Network Exception, The Shape of the System, How Genre Explorer Works, Automation (.github/workflows/), Status - v1 complete and live (+5 more)

### Community 12 - "Tech Stack Choices"
Cohesion: 0.17
Nodes (13): Camera Model, d3-force, d3-zoom, Every Noise at Once, d3-force, d3-zoom, tsx, vitest (+5 more)

### Community 13 - "Project Context and Data Sources"
Cohesion: 0.27
Nodes (12): Genre Explorer Project Context, Known Gaps, Pipeline Stages (1-8), Stage 2 Is the Fragile One (HTML scraping), Stage 3 Threshold Filter, Deezer, Upstream Watch, GitHub Actions (+4 more)

### Community 14 - "Claude Instructions and Git Guardrails"
Cohesion: 0.20
Nodes (10): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required), Tech Stack, Where Things Belong (required) (+2 more)

### Community 15 - "Backlog, Progress and Refresh Job"
Cohesion: 0.24
Nodes (10): Backlog (required), Progress, Progress - Milestone 7 Complete, v1 Live, Future (backlog), Decisions Still Open, Deferred from v1, Known Gaps (backlog), Refresh Dataset Workflow (refresh-data.yml) (+2 more)

### Community 16 - "Runtime Dependencies"
Cohesion: 0.20
Nodes (10): d3-selection, d3-transition, dependencies, d3-selection, d3-transition, react, react-dom, zod (+2 more)

### Community 17 - "README and Auth Model"
Cohesion: 0.25
Nodes (8): Auth Model - no accounts, no server, Genre Explorer README, Commands, Contributing, Genre Explorer (README overview), Notable Constraint: Spotify Is a Link Target, Not a Data Source, Quick Start, Spotify (outbound link target only)

### Community 18 - "Plan, Scope and Milestones"
Cohesion: 0.29
Nodes (7): Genre Explorer Plan, Known Upstream Breakage (ListenBrainz GET 500), Milestones (1-7), Open Questions, Scope (v1 / deferred / non-goals), The Hard Part - genre hierarchy extraction, What This Is

### Community 19 - "Dataset Data Model"
Cohesion: 0.33
Nodes (6): Data Model (graph.json + genres/<id>.json), Scaling, artist-index.json - the personal lens's reverse index, genres/<id>.json - per-genre detail files, graph.json - everything needed to paint the map, The Dataset (public/data/)

### Community 20 - "Hosting and Deploy Workflow"
Cohesion: 0.33
Nodes (6): Cloudflare Pages (documented fallback host), The Big Picture, GitHub Pages, Deploy Site Workflow (deploy-pages.yml), Deploy job (actions/deploy-pages), SPA Fallback via 404.html

### Community 21 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **145 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Genre Explorer Plan` connect `Plan, Scope and Milestones` to `Runtime Map Rendering`, `Project Conventions and CI`, `Tech Stack Choices`, `Project Context and Data Sources`, `Claude Instructions and Git Guardrails`, `README and Auth Model`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `Tech Stack (choices and rejections)` connect `Tech Stack Choices` to `Runtime Dependencies`, `README and Auth Model`, `Plan, Scope and Milestones`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `Genre Explorer - Claude Project Instructions` connect `Claude Instructions and Git Guardrails` to `Architecture Diagram Skill`, `Project Conventions and CI`, `Project Context and Data Sources`, `Backlog, Progress and Refresh Job`, `README and Auth Model`, `Plan, Scope and Milestones`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build Pipeline Stages` be split into smaller, more focused modules?**
  _Cohesion score 0.05892634207240949 - nodes in this community are weakly interconnected._
- **Should `Runtime Map Rendering` be split into smaller, more focused modules?**
  _Cohesion score 0.06264199935086011 - nodes in this community are weakly interconnected._