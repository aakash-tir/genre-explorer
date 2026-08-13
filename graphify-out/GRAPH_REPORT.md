# Graph Report - C:\Users\aakas\personal-projects\currently-working\genre-explorer  (2026-08-12)

## Corpus Check
- 10 files · ~107,171 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 635 nodes · 1369 edges · 30 communities (28 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.87)
- Token cost: 113,816 input · 0 output

## Community Hubs (Navigation)
- Map Rendering and Visibility Rules
- Build Pipeline Stages
- Dataset Model and Personal Lens
- Lint and Test Dependencies
- Claude Instructions and Working Agreement
- Runtime Dependencies and Camera
- TypeScript Build Config
- Song Links and the Spotify Dead End
- ListenBrainz Intake and Post-v1 Work
- Rendering and Layout Research
- Hosting, Deploy and Progress
- Diagram Auto-Layout Generator
- Music Data Source Research
- Testing, Thresholds and Docs Sweep
- Personalization Research
- Project Context and Auth Model
- Filter Panel
- Conventions and CI Gate
- Weekly Refresh and Cache Resume
- README and Prior Art
- Prettier Config
- Deezer Previews and Detail Files
- App Entry and Deploy Build
- React Frontend Rules (empty)
- v1 Status

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `compilerOptions` - 20 edges
3. `cachedFetch()` - 17 edges
4. `MusicBrainz` - 17 edges
5. `Research: Music Data Sources` - 17 edges
6. `Architecture Diagram Skill` - 16 edges
7. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
8. `ListenBrainz` - 16 edges
9. `buildDataset()` - 15 edges
10. `Genre Explorer Plan` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Answer: Family Hues by Popularity Rank Around the Golden Angle (137.508)` --conceptually_related_to--> `assignFamilyHues()`  [INFERRED]
  plan.md → src/graph/colors.ts
- `Artist to Genre Reverse Index (artist-index.json)` --conceptually_related_to--> `buildLookup()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/match.ts
- `Branch-out Adjacency Scoring` --conceptually_related_to--> `suggestGenres()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/suggest.ts
- `Scoped Runtime Network Exception` --semantically_similar_to--> `Personal Lens - Scoped Runtime Network Exception`  [INFERRED] [semantically similar]
  docs/research/listening-history-personalization.md → .claude/project-context.md
- `artist-index.json - the personal lens's reverse index` --references--> `spotifyArtistIdFromUrl()`  [INFERRED]
  docs/how-it-works.md → src/lib/artistNames.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **No Free Route to an Exact Per-Song Spotify URL** — docs_research_music_data_sources_recording_url_rels_absent, docs_research_music_data_sources_odesli_bridge, docs_research_music_data_sources_song_search_link_consequence, plan_song_search_link_amendment, readme_derived_song_links, logs_2026_08_12_exact_spotify_link_probe [EXTRACTED 1.00]
- **The Personal Lens Is the One Scoped Runtime-Network Exception** — docs_research_listening_history_personalization_runtime_network_exception, readme_personal_lens, plan_personal_lens_amendment, github_pull_request_template_before_merging, src_personal_listenbrainz [EXTRACTED 1.00]
- **Docs Accuracy Sweep of 2026-08-12** — logs_2026_08_12_docs_accuracy_sweep, readme_status_v1_live, plan_amendments_since_v1, plan_open_questions, claude_progress_post_v1_shipped, docs_runbooks_ci_and_branch_protection_refresh_cron, docs_research_listening_history_personalization_owner_mode_removed, github_pull_request_template_before_merging [EXTRACTED 1.00]
- **Derived song links: trackLinks.ts computes Spotify search + exact Deezer URLs for DetailPanel track rows** — docs_how_it_works_derived_song_links, src_lib_tracklinks, src_panel_detailpanel_tracklist, docs_future_spotify_search_link_gap, logs_2026_08_12_song_link_derivation [EXTRACTED 1.00]
- **Graph Rendering Decision (Canvas 2D chosen over library candidates)** — docs_research_graph_rendering_canvas_2d_d3_zoom, docs_research_graph_rendering_sigma_js, docs_research_graph_rendering_react_force_graph, docs_research_graph_rendering_cytoscape_js, docs_research_graph_rendering_offline_d3_force_layout [EXTRACTED 1.00]

## Communities (30 total, 2 thin omitted)

### Community 0 - "Map Rendering and Visibility Rules"
Cohesion: 0.05
Nodes (72): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Detail Panel (DetailPanel.tsx), Focus Fan and Labels (fan.ts, labels.ts) (+64 more)

### Community 1 - "Build Pipeline Stages"
Cohesion: 0.06
Nodes (65): Decisions Still Open, Upstream Watch, The Build Pipeline (scripts/build-dataset/), buildGraph(), slugify(), UnplacedNode, emitDetail(), emitGraph() (+57 more)

### Community 2 - "Dataset Model and Personal Lens"
Cohesion: 0.07
Nodes (52): Data Model (graph.json + genres/<id>.json), Scaling, artist-index.json - the personal lens's reverse index, graph.json - everything needed to paint the map, The Dataset (public/data/), The Personal Lens (src/personal/), Spotify Owner Mode Removal, BuiltGraph (+44 more)

### Community 3 - "Lint and Test Dependencies"
Cohesion: 0.04
Nodes (47): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+39 more)

### Community 4 - "Claude Instructions and Working Agreement"
Cohesion: 0.06
Nodes (39): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, After Every PR Merge (required), Backlog (required), Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required) (+31 more)

### Community 5 - "Runtime Dependencies and Camera"
Cohesion: 0.06
Nodes (35): Camera Model, d3-force, d3-selection, d3-transition, d3-zoom, dependencies, d3-force, d3-selection (+27 more)

### Community 6 - "TypeScript Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 7 - "Song Links and the Spotify Dead End"
Cohesion: 0.14
Nodes (22): No Free Route to an Exact Spotify Track URL, Derived Song Links (trackLinks.ts), Consequence: Songs Link to Spotify by Search Plus Exact Deezer, Log 2026-08-12: Fallback, Docs Sweep, Song Links, Owner-Mode Removal, Exact Spotify Link Probe (MusicBrainz url-rels + Odesli), Song Rows Link Out to Spotify and Deezer, deezerTrackUrl(), PanelLink (+14 more)

### Community 8 - "ListenBrainz Intake and Post-v1 Work"
Cohesion: 0.12
Nodes (18): Shipped After v1 (personal lens, owner-mode removal, song links), ListenBrainz Bridge Intake, ListenBrainz Stats Pipeline Lag (weeks, not a day), Personal Lens: ListenBrainz Public Intake, Raw Listens Fallback (stats pipeline lag), ArtistTally, creditsOf(), fetchListenBrainzTopArtists() (+10 more)

### Community 9 - "Rendering and Layout Research"
Cohesion: 0.11
Nodes (25): Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen), Cytoscape.js (rejected), Zoom Level of Detail (lod.ts rules), Offline d3-force Layout (build-time baked coordinates), Force Constellation with Radial Focus Mode, react-force-graph (rejected), Sigma.js v3 (rejected) (+17 more)

### Community 10 - "Hosting, Deploy and Progress"
Cohesion: 0.15
Nodes (20): Progress, Progress - Milestone 7 Complete, v1 Live, Cloudflare Pages (documented fallback host), GitHub Actions, GitHub Pages, Deploy Site Workflow (deploy-pages.yml), Deploy job (actions/deploy-pages), SPA Fallback via 404.html (+12 more)

### Community 11 - "Diagram Auto-Layout Generator"
Cohesion: 0.18
Nodes (14): assign_columns(), endpoint(), esc(), group_chain(), layout(), main(), Node, (cx, cy, left, right, top, bottom, column) for a node OR group id. (+6 more)

### Community 12 - "Music Data Source Research"
Cohesion: 0.21
Nodes (17): Fusion Edge Rule (structural drawn, associative hidden), Research: Music Data Sources, Genre HTML Page Scrape (relations absent from JSON API), Genre Data Threshold Filter, MusicBrainz Data Backbone, Recordings Carry No URL Relations (0 of 4 probed, 2026-08-12), Spotify API Deprecation (2024-2026), Log 2026-08-04: Plan Expansion and Data Research (+9 more)

### Community 13 - "Testing, Thresholds and Docs Sweep"
Cohesion: 0.24
Nodes (12): Pure Logic Is Tested; Rendering Is Not, Known Gaps (backlog), Testing, ListenBrainz Popularity API, Before Merging checklist, Docs Accuracy Sweep (stale claims brought in line), Answer: Release-Group Count Alone (MIN_RELEASE_GROUPS = 50, 912 of 2,184), Answer: Several Floating Family Roots (179 roots, 131 singletons) (+4 more)

### Community 14 - "Personalization Research"
Cohesion: 0.26
Nodes (13): Deferred from v1, Research: Personal 'Your Genres' Subgraph, Artist to Genre Reverse Index (artist-index.json), Branch-out Adjacency Scoring, localStorage Persistence, No Accounts, Owner Mode Built Then Removed (status note, 2026-08-12), Spotify GDPR Export Upload (offline fallback), Spotify OAuth Personal Mode (<=5 users) (+5 more)

### Community 15 - "Project Context and Auth Model"
Cohesion: 0.27
Nodes (11): Genre Explorer Project Context, Auth Model - no accounts, no server, Known Gaps, Pipeline Stages (1-8), Stage 3 Threshold Filter, The Big Picture, Scoped Runtime Network Exception, ListenBrainz (+3 more)

### Community 16 - "Filter Panel"
Cohesion: 0.33
Nodes (8): Filter Panel (FilterPanel.tsx), FilterPanel(), FilterPanelProps, searchGenres(), GenreNode, M(), node(), NODES

### Community 17 - "Conventions and CI Gate"
Cohesion: 0.28
Nodes (9): Conventions, Committed Dataset Artifact, Personal Lens - Scoped Runtime Network Exception, The Shape of the System, verify CI Gate, CI Workflow (ci.yml), CI verify job - lint, format, typecheck, test, build, Testing Strategy (+1 more)

### Community 18 - "Weekly Refresh and Cache Resume"
Cohesion: 0.42
Nodes (9): Weekly Refresh Live (Sundays 04:00 UTC, cache-as-resume), Stage 2 Is the Fragile One (HTML scraping), Automation (.github/workflows/), Sharp-Drop Guard, Dataset Refresh Cron Is Live (0 4 * * 0), Refresh Dataset Workflow (refresh-data.yml), Actions Cache as Cross-Run Resume, Prune Volatile Cache step (scheduled runs) (+1 more)

### Community 19 - "README and Prior Art"
Cohesion: 0.25
Nodes (8): Every Noise at Once (rejected prior art), Every Noise at Once, Genre Explorer README, Data Sources and Credit, Genre Explorer (README overview), Layout (directory map), Notable Constraint: Spotify Is a Link Target, Not a Data Source, Quick Start

### Community 20 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 21 - "Deezer Previews and Detail Files"
Cohesion: 0.67
Nodes (4): Deezer, genres/<id>.json - per-genre detail files, Deezer Preview MP3s, Deezer Track ID Pivot (expiring preview URLs)

### Community 22 - "App Entry and Deploy Build"
Cohesion: 0.50
Nodes (3): Deploy build job (vite build --base=/genre-explorer/), App HTML Entry (index.html), root

## Knowledge Gaps
- **146 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Genre Explorer Project Context` connect `Project Context and Auth Model` to `Map Rendering and Visibility Rules`, `Dataset Model and Personal Lens`, `Claude Instructions and Working Agreement`, `Runtime Dependencies and Camera`, `Conventions and CI Gate`, `Weekly Refresh and Cache Resume`?**
  _High betweenness centrality (0.224) - this node is a cross-community bridge._
- **Why does `Camera Model` connect `Runtime Dependencies and Camera` to `Project Context and Auth Model`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Map Rendering and Visibility Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.05467856325783574 - nodes in this community are weakly interconnected._
- **Should `Build Pipeline Stages` be split into smaller, more focused modules?**
  _Cohesion score 0.05663474692202462 - nodes in this community are weakly interconnected._
- **Should `Dataset Model and Personal Lens` be split into smaller, more focused modules?**
  _Cohesion score 0.06519114688128773 - nodes in this community are weakly interconnected._