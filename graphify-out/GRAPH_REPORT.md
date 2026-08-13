# Graph Report - C:\Users\aakas\personal-projects\currently-working\genre-explorer  (2026-08-12)

## Corpus Check
- 7 files · ~105,515 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 613 nodes · 1248 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.89)
- Token cost: 104,275 input · 0 output

## Community Hubs (Navigation)
- Map Rendering and Visibility Rules
- Build Pipeline and Refresh Job
- Personal Lens and Artist Index
- Dataset Model and Rendering Research
- Lint and Test Dependencies
- App Shell and Dataset Emit
- TypeScript Build Config
- Detail Panel and Song Links
- Architecture Diagram Skill
- Package Manifest and Scripts
- Runtime d3 Dependencies
- Diagram Auto-Layout Generator
- Force Layout and Filter Panel
- Project Context and Known Gaps
- Progress, Hosting and CI Workflows
- Claude Instructions and Git Guardrails
- Conventions and Testing Strategy
- Plan, Scope and Level of Detail
- README and Credits
- Prettier Config
- React Frontend Rules (empty)
- v1 Status

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `compilerOptions` - 20 edges
3. `cachedFetch()` - 17 edges
4. `Architecture Diagram Skill` - 17 edges
5. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
6. `buildDataset()` - 15 edges
7. `Genre Explorer - Claude Project Instructions` - 14 edges
8. `Genre Explorer Plan` - 14 edges
9. `scripts` - 13 edges
10. `usePersonal()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Tech Stack (choices and rejections)` --references--> `vitest`  [EXTRACTED]
  plan.md → package.json
- `Exact Spotify Link Probe (MusicBrainz url-rels + Odesli)` --references--> `fetchDeezerId()`  [INFERRED]
  logs/2026-08-12.md → scripts/build-dataset/fetch-previews.ts
- `Exact Spotify Link Probe (MusicBrainz url-rels + Odesli)` --semantically_similar_to--> `Spotify API Deprecation (2024-2026)`  [INFERRED] [semantically similar]
  logs/2026-08-12.md → docs/research/music-data-sources.md
- `Song Rows Link Out to Spotify and Deezer` --references--> `PanelLink`  [INFERRED]
  logs/2026-08-12.md → src/lib/trackLinks.ts
- `Tech Stack (choices and rejections)` --references--> `react`  [EXTRACTED]
  plan.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Derived song links: trackLinks.ts computes Spotify search + exact Deezer URLs for DetailPanel track rows** — docs_how_it_works_derived_song_links, src_lib_tracklinks, src_panel_detailpanel_tracklist, docs_future_spotify_search_link_gap, logs_2026_08_12_song_link_derivation [EXTRACTED 1.00]
- **The no-API-keys rule forces search links, owner-mode removal and the Deezer-id-only preview path** — docs_future_spotify_search_link_gap, logs_2026_08_12_exact_spotify_link_probe, logs_2026_08_12_spotify_owner_mode_removal, docs_how_it_works_genres_id_json_what_a_genre_sounds_like, spotify [INFERRED 0.85]
- **Personal lens reduced to one ListenBrainz intake with a raw-listens fallback** — docs_how_it_works_the_personal_lens_src_personal, logs_2026_08_12_raw_listens_fallback, logs_2026_08_12_spotify_owner_mode_removal, src_personal_listenbrainz, src_personal_match [EXTRACTED 1.00]
- **Free, Unauthenticated Upstream Data Sources** — musicbrainz, listenbrainz, deezer [EXTRACTED 1.00]
- **Chosen Build-time Data Pipeline (MusicBrainz + ListenBrainz + Deezer)** — docs_research_music_data_sources_musicbrainz_backbone, docs_research_music_data_sources_genre_html_scrape, docs_research_music_data_sources_listenbrainz_popularity, docs_research_music_data_sources_deezer_previews, docs_research_music_data_sources_genre_threshold_filter [EXTRACTED 1.00]
- **Graph Rendering Decision (Canvas 2D chosen over library candidates)** — docs_research_graph_rendering_canvas_2d_d3_zoom, docs_research_graph_rendering_sigma_js, docs_research_graph_rendering_react_force_graph, docs_research_graph_rendering_cytoscape_js, docs_research_graph_rendering_offline_d3_force_layout [EXTRACTED 1.00]
- **Personal 'Your Genres' Lens (intake, index, scoring, persistence)** — docs_research_listening_history_personalization_listenbrainz_bridge, docs_research_listening_history_personalization_spotify_export_upload, docs_research_listening_history_personalization_artist_genre_reverse_index, docs_research_listening_history_personalization_branch_out_adjacency, docs_research_listening_history_personalization_localstorage_persistence, docs_research_listening_history_personalization_runtime_network_exception [EXTRACTED 1.00]

## Communities (27 total, 2 thin omitted)

### Community 0 - "Map Rendering and Visibility Rules"
Cohesion: 0.06
Nodes (59): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Filter Panel (FilterPanel.tsx), Focus Fan and Labels (fan.ts, labels.ts) (+51 more)

### Community 1 - "Build Pipeline and Refresh Job"
Cohesion: 0.07
Nodes (59): Decisions Still Open, Upstream Watch, The Build Pipeline (scripts/build-dataset/), refresh job - rebuild and open PR, buildGraph(), BuiltGraph, slugify(), emitDetail() (+51 more)

### Community 2 - "Personal Lens and Artist Index"
Cohesion: 0.06
Nodes (51): artist-index.json - the personal lens's reverse index, The Personal Lens (src/personal/), Raw Listens Fallback (stats pipeline lag), Spotify Owner Mode Removal, ARTIST_INDEX_PATH, buildArtistIndex(), DATA_DIR, emitArtistIndex() (+43 more)

### Community 3 - "Dataset Model and Rendering Research"
Cohesion: 0.05
Nodes (62): Data Model (graph.json + genres/<id>.json), Deferred from v1, Scaling, genres/<id>.json - per-genre detail files, graph.json - everything needed to paint the map, The Dataset (public/data/), Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen) (+54 more)

### Community 4 - "Lint and Test Dependencies"
Cohesion: 0.05
Nodes (45): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+37 more)

### Community 5 - "App Shell and Dataset Emit"
Cohesion: 0.12
Nodes (27): Shell and State (App.tsx, deepLink.ts), Deploy build job (vite build --base=/genre-explorer/), App HTML Entry (index.html), emitGraph(), App(), GraphCanvasProps, PersonalLens, createDetailCache() (+19 more)

### Community 6 - "TypeScript Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 7 - "Detail Panel and Song Links"
Cohesion: 0.17
Nodes (20): Derived Song Links (trackLinks.ts), Detail Panel (DetailPanel.tsx), Song Rows Link Out to Spotify and Deezer, deezerTrackUrl(), PanelLink, spotifySearchUrl(), trackLinks(), ArtistList() (+12 more)

### Community 8 - "Architecture Diagram Skill"
Cohesion: 0.09
Nodes (24): After Every PR Merge (required), Architecture Diagram HTML Template, Architecture Diagram Skill, Auto-layout Scaffold (local extension v1.2), Color Palette, Component Box Pattern, Design System, Export Toolbar (built-in) (+16 more)

### Community 9 - "Package Manifest and Scripts"
Cohesion: 0.10
Nodes (19): engines, node, name, private, scripts, build, build:artist-index, build:dataset (+11 more)

### Community 10 - "Runtime d3 Dependencies"
Cohesion: 0.13
Nodes (19): Camera Model, d3-force, d3-selection, d3-transition, d3-zoom, dependencies, d3-force, d3-selection (+11 more)

### Community 11 - "Diagram Auto-Layout Generator"
Cohesion: 0.18
Nodes (14): assign_columns(), endpoint(), esc(), group_chain(), layout(), main(), Node, (cx, cy, left, right, top, bottom, column) for a node OR group id. (+6 more)

### Community 12 - "Force Layout and Filter Panel"
Cohesion: 0.16
Nodes (14): UnplacedNode, Anchor, computeAnchors(), layoutGraph(), seededRandom(), FilterPanel(), FilterPanelProps, searchGenres() (+6 more)

### Community 13 - "Project Context and Known Gaps"
Cohesion: 0.20
Nodes (18): Genre Explorer Project Context, Auth Model - no accounts, no server, Known Gaps, Pipeline Stages (1-8), Stage 3 Threshold Filter, Deezer, Known Gaps (backlog), No Free Route to an Exact Spotify Track URL (+10 more)

### Community 14 - "Progress, Hosting and CI Workflows"
Cohesion: 0.16
Nodes (15): Progress, Progress - Milestone 7 Complete, v1 Live, Stage 2 Is the Fragile One (HTML scraping), Cloudflare Pages (documented fallback host), Automation (.github/workflows/), Sharp-Drop Guard, The Big Picture, GitHub Pages (+7 more)

### Community 15 - "Claude Instructions and Git Guardrails"
Cohesion: 0.18
Nodes (11): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, Backlog (required), Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required), Tech Stack (+3 more)

### Community 16 - "Conventions and Testing Strategy"
Cohesion: 0.28
Nodes (9): Conventions, Pure Logic Is Tested; Rendering Is Not, Committed Dataset Artifact, Personal Lens - Scoped Runtime Network Exception, The Shape of the System, Testing, Before Merging checklist, CI verify job - lint, format, typecheck, test, build (+1 more)

### Community 17 - "Plan, Scope and Level of Detail"
Cohesion: 0.25
Nodes (8): Level of Detail (src/graph/lod.ts), Genre Explorer Plan, Architecture (build time / runtime), Level of Detail, Milestones (1-7), Open Questions, Scope (v1 / deferred / non-goals), What This Is

### Community 18 - "README and Credits"
Cohesion: 0.25
Nodes (8): Every Noise at Once, Genre Explorer README, Commands, Contributing, Data Sources and Credit, Genre Explorer (README overview), Layout (directory map), Quick Start

### Community 19 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Ambiguous Edges - Review These
- `Genre Explorer Architecture Diagram` → `Post-Merge Chores for PR #35 (graph refresh + diagram)`  [AMBIGUOUS]
  logs/2026-08-12.md · relation: references

## Knowledge Gaps
- **149 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Genre Explorer Architecture Diagram` and `Post-Merge Chores for PR #35 (graph refresh + diagram)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Tech Stack (choices and rejections)` connect `Runtime d3 Dependencies` to `Plan, Scope and Level of Detail`, `README and Credits`, `Lint and Test Dependencies`, `Project Context and Known Gaps`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `Genre Explorer Plan` connect `Plan, Scope and Level of Detail` to `Map Rendering and Visibility Rules`, `Runtime d3 Dependencies`, `Project Context and Known Gaps`, `Claude Instructions and Git Guardrails`, `Conventions and Testing Strategy`, `README and Credits`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint and Test Dependencies` to `Package Manifest and Scripts`, `Runtime d3 Dependencies`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Map Rendering and Visibility Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06227106227106227 - nodes in this community are weakly interconnected._