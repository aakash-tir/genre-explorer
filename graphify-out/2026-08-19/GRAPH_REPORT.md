# Graph Report - genre-explorer  (2026-08-19)

## Corpus Check
- 1015 files · ~115,091 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 676 nodes · 1471 edges · 28 communities (26 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41fe9e27`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Build Pipeline and Data Quality
- App Shell, Panels and Personal Lens
- Map Rendering and Visibility Rules
- Detail Panel, Song Links and Post-v1 Work
- Lint and Test Dependencies
- Conventions, Testing and ListenBrainz Intake
- Runtime Dependencies and Camera
- TypeScript Build Config
- Diagram Auto-Layout Generator
- Architecture Diagram Skill
- Backlog and Review Staging
- Tech Stack and Rendering Research
- Plan, Architecture and Dependencies
- Claude Instructions and Git Guardrails
- Genre Scrape and Pipeline Guards
- Progress, Hosting and Deploy
- Project Context and Data Model
- Force Layout
- CI Gate and Automation
- Deezer Previews and Prior Art
- Prettier Config
- React Frontend Rules (empty)
- v1 Status

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `cachedFetch()` - 20 edges
3. `compilerOptions` - 20 edges
4. `ListenBrainz` - 19 edges
5. `MusicBrainz` - 18 edges
6. `Research: Music Data Sources` - 18 edges
7. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
8. `buildDataset()` - 15 edges
9. `Architecture Diagram Skill` - 15 edges
10. `Known Gaps (backlog)` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Purge the Poisoned Cache Entry Before Re-Fetching` --references--> `writeCache()`  [INFERRED]
  logs/2026-08-12.md → scripts/build-dataset/http.ts
- `Popular-Artist Lists Skew to Global Megastars` --references--> `fetchArtistListens()`  [INFERRED]
  docs/review/2026-08-12-open-items.md → scripts/build-dataset/rank.ts
- `Popular-Artist Lists Skew to Global Megastars` --references--> `selectEntities()`  [INFERRED]
  docs/review/2026-08-12-open-items.md → scripts/build-dataset/rank.ts
- `Consequence: Songs Link to Spotify by Search Plus Exact Deezer` --references--> `spotifySearchUrl()`  [INFERRED]
  docs/research/music-data-sources.md → src/lib/trackLinks.ts
- `Consequence: Songs Link to Spotify by Search Plus Exact Deezer` --references--> `deezerTrackUrl()`  [INFERRED]
  docs/research/music-data-sources.md → src/lib/trackLinks.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Validate-Inside-the-Fetch Fix for the Weekly Refresh** — logs_2026_08_12_refresh_validation_fix, scripts_build_dataset_http_fetchusable, scripts_build_dataset_http_cachedfetch, scripts_build_dataset_fetch_hierarchy, scripts_build_dataset_parse_genre_page_lookslikegenrepage, tests_scripts_http_test [EXTRACTED 1.00]
- **The docs/review/ Staging Convention** — claude_claude_review_staging_convention, docs_review_readme, docs_review_2026_08_12_open_items, docs_future_parked_for_review_banner, readme_layout [EXTRACTED 1.00]
- **Four Items Parked for the 2026-08-12 Review Session** — docs_review_2026_08_12_open_items, docs_review_2026_08_12_open_items_touch_mobile_unverified, docs_review_2026_08_12_open_items_megastar_skew, docs_review_2026_08_12_open_items_non_western_coverage, docs_review_2026_08_12_open_items_stale_deezer_preview_wording [EXTRACTED 1.00]
- **No Free Route to an Exact Per-Song Spotify URL** — docs_research_music_data_sources_recording_url_rels_absent, docs_research_music_data_sources_odesli_bridge, docs_research_music_data_sources_song_search_link_consequence, plan_song_search_link_amendment, readme_derived_song_links, logs_2026_08_12_exact_spotify_link_probe [EXTRACTED 1.00]
- **The Personal Lens Is the One Scoped Runtime-Network Exception** — docs_research_listening_history_personalization_runtime_network_exception, readme_personal_lens, plan_personal_lens_amendment, github_pull_request_template_before_merging, src_personal_listenbrainz [EXTRACTED 1.00]
- **Derived song links: trackLinks.ts computes Spotify search + exact Deezer URLs for DetailPanel track rows** — docs_how_it_works_derived_song_links, src_lib_tracklinks, src_panel_detailpanel_tracklist, docs_future_spotify_search_link_gap, logs_2026_08_12_song_link_derivation [EXTRACTED 1.00]
- **Graph Rendering Decision (Canvas 2D chosen over library candidates)** — docs_research_graph_rendering_canvas_2d_d3_zoom, docs_research_graph_rendering_sigma_js, docs_research_graph_rendering_react_force_graph, docs_research_graph_rendering_cytoscape_js, docs_research_graph_rendering_offline_d3_force_layout [EXTRACTED 1.00]

## Communities (28 total, 2 thin omitted)

### Community 0 - "Build Pipeline and Data Quality"
Cohesion: 0.05
Nodes (70): Stage 2 Is the Fragile One (HTML scraping), Sharp-Drop Guard, The Build Pipeline (scripts/build-dataset/), Fixed: the Weekly Refresh No Longer Dies on a Transient MusicBrainz Error Page, A Persistently Unreadable Page Still Fails the Run, Validate Inside the Fetch, Not After It (fetchUsable's third retryable condition), buildGraph(), slugify() (+62 more)

### Community 1 - "App Shell, Panels and Personal Lens"
Cohesion: 0.09
Nodes (34): Automation (.github/workflows/), Shell and State (App.tsx, deepLink.ts), verify CI Gate, CI Workflow (ci.yml), CI verify job - lint, format, typecheck, test, build, Deploy Site Workflow (deploy-pages.yml), Deploy build job (vite build --base=/genre-explorer/), Deploy job (actions/deploy-pages) (+26 more)

### Community 2 - "Map Rendering and Visibility Rules"
Cohesion: 0.06
Nodes (60): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Focus Fan and Labels (fan.ts, labels.ts), Level of Detail (src/graph/lod.ts) (+52 more)

### Community 3 - "Detail Panel, Song Links and Post-v1 Work"
Cohesion: 0.10
Nodes (30): Derived Song Links (trackLinks.ts), Detail Panel (DetailPanel.tsx), Filter Panel (FilterPanel.tsx), FilterPanel(), FilterPanelProps, searchGenres(), deezerTrackUrl(), PanelLink (+22 more)

### Community 4 - "Lint and Test Dependencies"
Cohesion: 0.04
Nodes (49): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+41 more)

### Community 5 - "Conventions, Testing and ListenBrainz Intake"
Cohesion: 0.06
Nodes (51): Conventions, Pure Logic Is Tested; Rendering Is Not, Shipped After v1 (personal lens, owner-mode removal, song links), Genre Explorer Project Context, Auth Model - no accounts, no server, Committed Dataset Artifact, Known Gaps, Personal Lens - Scoped Runtime Network Exception (+43 more)

### Community 6 - "Runtime Dependencies and Camera"
Cohesion: 0.06
Nodes (35): Camera Model, d3-force, d3-selection, d3-transition, d3-zoom, dependencies, d3-force, d3-selection (+27 more)

### Community 7 - "TypeScript Build Config"
Cohesion: 0.06
Nodes (31): DOM, DOM.Iterable, ES2023, node, scripts, src, tests, vite.config.ts (+23 more)

### Community 8 - "Diagram Auto-Layout Generator"
Cohesion: 0.18
Nodes (14): assign_columns(), endpoint(), esc(), group_chain(), layout(), main(), Node, (cx, cy, left, right, top, bottom, column) for a node OR group id. (+6 more)

### Community 9 - "Architecture Diagram Skill"
Cohesion: 0.12
Nodes (19): Architecture Diagram HTML Template, Architecture Diagram Skill, Auto-layout Scaffold (local extension v1.2), Color Palette, Component Box Pattern, Design System, Export Toolbar (built-in), Info Card Pattern (+11 more)

### Community 10 - "Backlog and Review Staging"
Cohesion: 0.07
Nodes (53): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, After Every PR Merge (required), Backlog (required), Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required) (+45 more)

### Community 11 - "Tech Stack and Rendering Research"
Cohesion: 0.20
Nodes (14): Scaling, Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen), Cytoscape.js (rejected), Zoom Level of Detail (lod.ts rules), Offline d3-force Layout (build-time baked coordinates), Force Constellation with Radial Focus Mode, react-force-graph (rejected) (+6 more)

### Community 12 - "Plan, Architecture and Dependencies"
Cohesion: 0.19
Nodes (14): Every Noise at Once (rejected prior art), Every Noise at Once, GitHub Actions, Genre Explorer Plan, Amendments Since v1 Shipped, Architecture (build time / runtime), Edge Rules, External Dependencies (all free, no keys) (+6 more)

### Community 13 - "Claude Instructions and Git Guardrails"
Cohesion: 0.38
Nodes (12): No Free Route to an Exact Spotify Track URL, Research: Music Data Sources, Odesli / song.link Bridge Omits Spotify, Recordings Carry No URL Relations (0 of 4 probed, 2026-08-12), Consequence: Songs Link to Spotify by Search Plus Exact Deezer, Spotify API Deprecation (2024-2026), Not Included, and Why, Exact Spotify Link Probe (MusicBrainz url-rels + Odesli) (+4 more)

### Community 14 - "Genre Scrape and Pipeline Guards"
Cohesion: 0.21
Nodes (15): Decisions Still Open, Upstream Watch, Fusion Edge Rule (structural drawn, associative hidden), Genre HTML Page Scrape (relations absent from JSON API), Genre Data Threshold Filter, MusicBrainz Data Backbone, Non-Western Coverage After the Threshold Filter Was Never Reviewed, Log 2026-08-06: Milestone 2, Real Genre Tree (+7 more)

### Community 15 - "Progress, Hosting and Deploy"
Cohesion: 0.18
Nodes (16): Progress, Progress - Milestone 7 Complete, v1 Live, Cloudflare Pages (documented fallback host), The Big Picture, Research: Hosting the Site, Cloudflare Pages (chosen host), GitHub Pages Disqualification (private repo), graph.json / genres per-id Payload Split (+8 more)

### Community 16 - "Project Context and Data Model"
Cohesion: 0.08
Nodes (36): Data Model (graph.json + genres/<id>.json), artist-index.json - the personal lens's reverse index, graph.json - everything needed to paint the map, The Dataset (public/data/), ARTIST_INDEX_PATH, buildArtistIndex(), DATA_DIR, emitArtistIndex() (+28 more)

### Community 17 - "Force Layout"
Cohesion: 0.29
Nodes (7): UnplacedNode, Anchor, computeAnchors(), layoutGraph(), seededRandom(), edges, nodes

### Community 18 - "CI Gate and Automation"
Cohesion: 0.33
Nodes (6): ListenBrainz Popularity API, Popular-Artist Lists Skew to Global Megastars, Answer: Release-Group Count Alone (MIN_RELEASE_GROUPS = 50, 912 of 2,184), Answer: Several Floating Family Roots (179 roots, 131 singletons), Answer: Obscure Band Has a Hard Floor (OBSCURE_MIN_LISTENS = 100), Open Questions

### Community 19 - "Deezer Previews and Prior Art"
Cohesion: 0.50
Nodes (3): 2026-08-17, Favicon: give the app a real icon instead of a 404, Genre membership: gate on tag votes instead of search rank

### Community 25 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

## Knowledge Gaps
- **151 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Genre Explorer Project Context` connect `Conventions, Testing and ListenBrainz Intake` to `Project Context and Data Model`, `Build Pipeline and Data Quality`, `Map Rendering and Visibility Rules`, `Runtime Dependencies and Camera`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `Camera Model` connect `Runtime Dependencies and Camera` to `Conventions, Testing and ListenBrainz Intake`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build Pipeline and Data Quality` be split into smaller, more focused modules?**
  _Cohesion score 0.05467856325783574 - nodes in this community are weakly interconnected._
- **Should `App Shell, Panels and Personal Lens` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Should `Map Rendering and Visibility Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06493506493506493 - nodes in this community are weakly interconnected._