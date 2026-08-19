# Graph Report - C:\Users\aakas\personal-projects\currently-working\genre-explorer  (2026-08-12)

## Corpus Check
- 9 files · ~110,288 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 662 nodes · 1418 edges · 35 communities (33 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.85)
- Token cost: 95,849 input · 0 output

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
- Genre Page Parser and Upstream Watch
- Weekly Refresh and Cache Resume
- Hosting Research and Scaling
- Post-Merge Chores and Docs Sweeps
- Branch Protection and Going Public
- Prettier Config
- Pull Request Template
- App Entry and Deploy Build
- React Frontend Rules (empty)
- v1 Status

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 21 edges
2. `compilerOptions` - 20 edges
3. `cachedFetch()` - 20 edges
4. `ListenBrainz` - 19 edges
5. `MusicBrainz` - 18 edges
6. `Research: Music Data Sources` - 18 edges
7. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
8. `buildDataset()` - 15 edges
9. `Architecture Diagram Skill` - 15 edges
10. `Known Gaps (backlog)` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Scoped Runtime Network Exception` --semantically_similar_to--> `Personal Lens - Scoped Runtime Network Exception`  [INFERRED] [semantically similar]
  docs/research/listening-history-personalization.md → .claude/project-context.md
- `Artist to Genre Reverse Index (artist-index.json)` --conceptually_related_to--> `buildLookup()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/match.ts
- `Branch-out Adjacency Scoring` --conceptually_related_to--> `suggestGenres()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/suggest.ts
- `Purge the Poisoned Cache Entry Before Re-Fetching` --references--> `writeCache()`  [INFERRED]
  logs/2026-08-12.md → scripts/build-dataset/http.ts
- `Purge the Poisoned Cache Entry Before Re-Fetching` --references--> `fetchDeezerId()`  [EXTRACTED]
  logs/2026-08-12.md → scripts/build-dataset/fetch-previews.ts

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

## Communities (35 total, 2 thin omitted)

### Community 0 - "Build Pipeline and Data Quality"
Cohesion: 0.06
Nodes (65): Stage 2 Is the Fragile One (HTML scraping), Decisions Still Open, Sharp-Drop Guard, The Build Pipeline (scripts/build-dataset/), Genre Data Threshold Filter, Popular-Artist Lists Skew to Global Megastars, Non-Western Coverage After the Threshold Filter Was Never Reviewed, Fixed: the Weekly Refresh No Longer Dies on a Transient MusicBrainz Error Page (+57 more)

### Community 1 - "App Shell, Panels and Personal Lens"
Cohesion: 0.06
Nodes (58): Shell and State (App.tsx, deepLink.ts), The Personal Lens (src/personal/), Spotify Owner Mode Removal, App(), FilterPanel(), FilterPanelProps, searchGenres(), GraphCanvasProps (+50 more)

### Community 2 - "Map Rendering and Visibility Rules"
Cohesion: 0.06
Nodes (61): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Filter Panel (FilterPanel.tsx), Focus Fan and Labels (fan.ts, labels.ts) (+53 more)

### Community 3 - "Detail Panel, Song Links and Post-v1 Work"
Cohesion: 0.08
Nodes (47): Shipped After v1 (personal lens, owner-mode removal, song links), Auth Model - no accounts, no server, Deferred from v1, No Free Route to an Exact Spotify Track URL, Derived Song Links (trackLinks.ts), Detail Panel (DetailPanel.tsx), Research: Personal 'Your Genres' Subgraph, Artist to Genre Reverse Index (artist-index.json) (+39 more)

### Community 4 - "Lint and Test Dependencies"
Cohesion: 0.04
Nodes (47): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+39 more)

### Community 5 - "Conventions, Testing and ListenBrainz Intake"
Cohesion: 0.07
Nodes (30): Conventions, Pure Logic Is Tested; Rendering Is Not, artist-index.json - the personal lens's reverse index, Testing, ListenBrainz Bridge Intake, ListenBrainz Stats Pipeline Lag (weeks, not a day), Before Merging checklist, Raw Listens Fallback (stats pipeline lag) (+22 more)

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
Nodes (18): Architecture Diagram HTML Template, Architecture Diagram Skill, Auto-layout Scaffold (local extension v1.2), Color Palette, Component Box Pattern, Design System, Export Toolbar (built-in), Info Card Pattern (+10 more)

### Community 10 - "Backlog and Review Staging"
Cohesion: 0.25
Nodes (14): Backlog (required), docs/review/ as a Review-Session Staging Area, Known Gaps (backlog), Parked for a Review Session (four items, linked to docs/review/), Open Items - Found 2026-08-12, Review Queue (docs/review/), Settlement Protocol: Delete the Item, Remove the Bullet, A Staging Area, Not a Second Backlog (+6 more)

### Community 11 - "Tech Stack and Rendering Research"
Cohesion: 0.21
Nodes (14): Tech Stack, Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen), Cytoscape.js (rejected), Zoom Level of Detail (lod.ts rules), Offline d3-force Layout (build-time baked coordinates), Force Constellation with Radial Focus Mode, react-force-graph (rejected) (+6 more)

### Community 12 - "Plan, Architecture and Dependencies"
Cohesion: 0.18
Nodes (13): ListenBrainz Popularity API, GitHub Actions, Genre Explorer Plan, Architecture (build time / runtime), Edge Rules, External Dependencies (all free, no keys), Answer: Several Floating Family Roots (179 roots, 131 singletons), Known Upstream Breakage (ListenBrainz GET 500) (+5 more)

### Community 13 - "Claude Instructions and Git Guardrails"
Cohesion: 0.18
Nodes (11): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required), Where Things Belong (required), deny() (+3 more)

### Community 14 - "Genre Scrape and Pipeline Guards"
Cohesion: 0.24
Nodes (12): Fusion Edge Rule (structural drawn, associative hidden), Genre HTML Page Scrape (relations absent from JSON API), MusicBrainz Data Backbone, Log 2026-08-06: Milestone 2, Real Genre Tree, Disk-cached Resumable Pipeline, Sharp-drop Guard on Emit, Weekly Refresh Cache Strategy, MusicBrainz (+4 more)

### Community 15 - "Progress, Hosting and Deploy"
Cohesion: 0.24
Nodes (11): Progress, Progress - Milestone 7 Complete, v1 Live, Cloudflare Pages (documented fallback host), The Big Picture, GitHub Pages, Deploy Site Workflow (deploy-pages.yml), Deploy job (actions/deploy-pages), SPA Fallback via 404.html (+3 more)

### Community 16 - "Project Context and Data Model"
Cohesion: 0.20
Nodes (11): Genre Explorer Project Context, Data Model (graph.json + genres/<id>.json), Known Gaps, Pipeline Stages (1-8), Stage 3 Threshold Filter, graph.json - everything needed to paint the map, The Dataset (public/data/), Review Trigger: Owner's ListenBrainz Import from Spotify (+3 more)

### Community 17 - "Force Layout"
Cohesion: 0.29
Nodes (7): UnplacedNode, Anchor, computeAnchors(), layoutGraph(), seededRandom(), edges, nodes

### Community 18 - "CI Gate and Automation"
Cohesion: 0.25
Nodes (9): Committed Dataset Artifact, Personal Lens - Scoped Runtime Network Exception, The Shape of the System, Automation (.github/workflows/), Runbook: CI and Branch Protection, verify CI Gate, CI Workflow (ci.yml), CI verify job - lint, format, typecheck, test, build (+1 more)

### Community 19 - "Deezer Previews and Prior Art"
Cohesion: 0.33
Nodes (9): Deezer, genres/<id>.json - per-genre detail files, Deezer Preview MP3s, Every Noise at Once (rejected prior art), Stale Deezer 'Preview MP3' Wording in the Research Doc, Every Noise at Once, Deezer Track ID Pivot (expiring preview URLs), Purge the Poisoned Cache Entry Before Re-Fetching (+1 more)

### Community 20 - "Genre Page Parser and Upstream Watch"
Cohesion: 0.28
Nodes (6): Upstream Watch, decodeEntities(), GenrePageRef, GenrePageRelations, LABELS, parseGenrePage()

### Community 21 - "Weekly Refresh and Cache Resume"
Cohesion: 0.61
Nodes (8): Weekly Refresh Live (Sundays 04:00 UTC, cache-as-resume), First Scheduled Refresh Runs on a Cold Actions Cache, Dataset Refresh Cron Is Live (0 4 * * 0), Refresh Dataset Workflow (refresh-data.yml), Actions Cache as Cross-Run Resume, Prune Volatile Cache step (scheduled runs), refresh job - rebuild and open PR, Found: the Weekly Refresh Is Failing (2026-08-09 run, parked in a new docs/review/)

### Community 22 - "Hosting Research and Scaling"
Cohesion: 0.36
Nodes (8): Scaling, Research: Hosting the Site, Cloudflare Pages (chosen host), GitHub Pages Disqualification (private repo), graph.json / genres per-id Payload Split, Runbook: Hosting (GitHub Pages live), Cloudflare Pages Fallback, GitHub Pages Deployment

### Community 23 - "Post-Merge Chores and Docs Sweeps"
Cohesion: 0.40
Nodes (6): After Every PR Merge (required), Log 2026-08-12: Fallback, Docs Sweep, Song Links, Owner-Mode Removal, Docs Accuracy Sweep (stale claims brought in line), Post-Merge Chores for PR #35 (graph refresh + diagram), Post-Merge Chores for PR #37 (graph refresh), Post-Merge Chores for PR #39 (graph refresh)

### Community 24 - "Branch Protection and Going Public"
Cohesion: 0.50
Nodes (5): Server-side Branch Protection on main, PR #4 Red Merge Incident, Log 2026-08-08: Sticky Selection and Going Public, Repo Went Public + Real Branch Protection + Pages Ship, Sticky Selection (selection vs fan split)

### Community 25 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 26 - "Pull Request Template"
Cohesion: 0.50
Nodes (4): Pull Request Template, How It Was Tested, What Changed, Why

### Community 27 - "App Entry and Deploy Build"
Cohesion: 0.50
Nodes (3): Deploy build job (vite build --base=/genre-explorer/), App HTML Entry (index.html), root

## Knowledge Gaps
- **146 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Genre Explorer Project Context` connect `Project Context and Data Model` to `Build Pipeline and Data Quality`, `Map Rendering and Visibility Rules`, `Detail Panel, Song Links and Post-v1 Work`, `Runtime Dependencies and Camera`, `CI Gate and Automation`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `Camera Model` connect `Runtime Dependencies and Camera` to `Project Context and Data Model`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Build Pipeline and Data Quality` be split into smaller, more focused modules?**
  _Cohesion score 0.05854341736694678 - nodes in this community are weakly interconnected._
- **Should `App Shell, Panels and Personal Lens` be split into smaller, more focused modules?**
  _Cohesion score 0.0620253164556962 - nodes in this community are weakly interconnected._
- **Should `Map Rendering and Visibility Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06288448393711552 - nodes in this community are weakly interconnected._