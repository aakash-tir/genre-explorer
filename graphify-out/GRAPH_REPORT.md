# Graph Report - genre-explorer  (2026-08-19)

## Corpus Check
- 1029 files · ~125,733 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 731 nodes · 1572 edges · 37 communities (35 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c04ef04b`
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
- Found: the Weekly Refresh Is Failing (2026-08-09 run, parked in a new docs/review/)
- fetch-entities.ts
- Genre Explorer - Claude Project Instructions
- rank.ts
- config.ts
- Prettier Config
- Runbook — the rolling dataset refresh
- 2026-08-19
- React Frontend Rules (empty)
- v1 Status
- Genre Explorer README
- fetch-links.ts

## God Nodes (most connected - your core abstractions)
1. `GraphCanvas()` - 23 edges
2. `cachedFetch()` - 20 edges
3. `compilerOptions` - 20 edges
4. `ListenBrainz` - 19 edges
5. `GenreNode` - 18 edges
6. `MusicBrainz` - 18 edges
7. `Research: Music Data Sources` - 18 edges
8. `The Build Pipeline (scripts/build-dataset/)` - 16 edges
9. `Architecture Diagram Skill` - 15 edges
10. `Known Gaps (backlog)` - 15 edges

## Surprising Connections (you probably didn't know these)
- `ListenBrainz Stats Pipeline Lag (weeks, not a day)` --references--> `topArtistsFromListens()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/listenbrainz.ts
- `ListenBrainz Bridge Intake` --conceptually_related_to--> `fetchListenBrainzTopArtists()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/listenbrainz.ts
- `Artist to Genre Reverse Index (artist-index.json)` --conceptually_related_to--> `buildLookup()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/match.ts
- `Branch-out Adjacency Scoring` --conceptually_related_to--> `suggestGenres()`  [INFERRED]
  docs/research/listening-history-personalization.md → src/personal/suggest.ts
- `Scoped Runtime Network Exception` --semantically_similar_to--> `Personal Lens - Scoped Runtime Network Exception`  [INFERRED] [semantically similar]
  docs/research/listening-history-personalization.md → .claude/project-context.md

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

## Communities (37 total, 2 thin omitted)

### Community 0 - "Build Pipeline and Data Quality"
Cohesion: 0.15
Nodes (14): Upstream Watch, Fixed: the Weekly Refresh No Longer Dies on a Transient MusicBrainz Error Page, A Persistently Unreadable Page Still Fails the Run, Validate Inside the Fetch, Not After It (fetchUsable's third retryable condition), dedupe(), fetchHierarchy(), fetchUsable(), decodeEntities() (+6 more)

### Community 1 - "App Shell, Panels and Personal Lens"
Cohesion: 0.11
Nodes (24): Shell and State (App.tsx, deepLink.ts), Deploy build job (vite build --base=/genre-explorer/), App HTML Entry (index.html), App(), PersonalLens, indexNodes(), AppState, DEFAULT_STATE (+16 more)

### Community 2 - "Map Rendering and Visibility Rules"
Cohesion: 0.06
Nodes (67): Rule 1: Edges - only subgenre-of drawn, Rule 2: Level of Detail, Rule 3: Colour - family hue, depth gradient, The Three Rules That Define the Interaction, Camera (src/graph/camera.ts), Colour (src/graph/colors.ts), Filter Panel (FilterPanel.tsx), Focus Fan and Labels (fan.ts, labels.ts) (+59 more)

### Community 3 - "Detail Panel, Song Links and Post-v1 Work"
Cohesion: 0.14
Nodes (22): Shipped After v1 (personal lens, owner-mode removal, song links), Derived Song Links (trackLinks.ts), Detail Panel (DetailPanel.tsx), Consequence: Songs Link to Spotify by Search Plus Exact Deezer, Song Rows Link Out to Spotify and Deezer, deezerTrackUrl(), PanelLink, spotifySearchUrl() (+14 more)

### Community 4 - "Lint and Test Dependencies"
Cohesion: 0.04
Nodes (49): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, devDependencies, eslint (+41 more)

### Community 5 - "Conventions, Testing and ListenBrainz Intake"
Cohesion: 0.16
Nodes (18): Genre Explorer Project Context, Auth Model - no accounts, no server, Committed Dataset Artifact, Known Gaps, Personal Lens - Scoped Runtime Network Exception, Pipeline Stages (1-8), Stage 3 Threshold Filter, The Shape of the System (+10 more)

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
Cohesion: 0.06
Nodes (38): After Every PR Merge (required), Conventions, Pure Logic Is Tested; Rendering Is Not, Architecture Diagram HTML Template, Architecture Diagram Skill, Auto-layout Scaffold (local extension v1.2), Color Palette, Component Box Pattern (+30 more)

### Community 10 - "Backlog and Review Staging"
Cohesion: 0.24
Nodes (17): Backlog (required), docs/review/ as a Review-Session Staging Area, Deezer, Known Gaps (backlog), Parked for a Review Session (four items, linked to docs/review/), genres/<id>.json - per-genre detail files, Deezer Preview MP3s, Open Items - Found 2026-08-12 (+9 more)

### Community 11 - "Tech Stack and Rendering Research"
Cohesion: 0.08
Nodes (39): Decisions Still Open, Scaling, Research: Graph Rendering and Layout, Canvas 2D + d3-zoom Rendering (chosen), Cytoscape.js (rejected), Fusion Edge Rule (structural drawn, associative hidden), Zoom Level of Detail (lod.ts rules), Offline d3-force Layout (build-time baked coordinates) (+31 more)

### Community 12 - "Plan, Architecture and Dependencies"
Cohesion: 0.17
Nodes (20): Progress, Progress - Milestone 7 Complete, v1 Live, Cloudflare Pages (documented fallback host), The Big Picture, GitHub Actions, GitHub Pages, docs/how-it-works.md - Full System Walkthrough, MusicBrainz (+12 more)

### Community 13 - "Claude Instructions and Git Guardrails"
Cohesion: 0.20
Nodes (21): Deferred from v1, No Free Route to an Exact Spotify Track URL, Research: Personal 'Your Genres' Subgraph, Artist to Genre Reverse Index (artist-index.json), Branch-out Adjacency Scoring, localStorage Persistence, No Accounts, Owner Mode Built Then Removed (status note, 2026-08-12), Spotify GDPR Export Upload (offline fallback) (+13 more)

### Community 14 - "Genre Scrape and Pipeline Guards"
Cohesion: 0.21
Nodes (11): mapWithConcurrency(), emitArtistIndex(), emitDetail(), buildDataset(), buildDetails(), main(), readGraphNodes(), readRefreshTimes() (+3 more)

### Community 15 - "Progress, Hosting and Deploy"
Cohesion: 0.28
Nodes (13): Purge the Poisoned Cache Entry Before Re-Fetching, DeezerSearch, fetchDeezerId(), sleep(), cachedFetch(), cachedPost(), FetchUsableDeps, hostQueues (+5 more)

### Community 16 - "Project Context and Data Model"
Cohesion: 0.05
Nodes (58): Data Model (graph.json + genres/<id>.json), artist-index.json - the personal lens's reverse index, graph.json - everything needed to paint the map, The Dataset (public/data/), The Personal Lens (src/personal/), Spotify Owner Mode Removal, ARTIST_INDEX_PATH, buildArtistIndex() (+50 more)

### Community 17 - "Force Layout"
Cohesion: 0.12
Nodes (23): buildGraph(), BuiltGraph, slugify(), UnplacedNode, GenreRef, MbidEdge, Anchor, computeAnchors() (+15 more)

### Community 18 - "CI Gate and Automation"
Cohesion: 0.40
Nodes (5): ListenBrainz Popularity API, Answer: Release-Group Count Alone (MIN_RELEASE_GROUPS = 50, 912 of 2,184), Answer: Several Floating Family Roots (179 roots, 131 singletons), Answer: Obscure Band Has a Hard Floor (OBSCURE_MIN_LISTENS = 100), Open Questions

### Community 19 - "Deezer Previews and Prior Art"
Cohesion: 0.40
Nodes (4): 2026-08-17, Favicon: give the app a real icon instead of a 404, Genre membership: gate on tag votes instead of search rank, Post-merge chores for PR #45 — graph refresh

### Community 20 - "Found: the Weekly Refresh Is Failing (2026-08-09 run, parked in a new docs/review/)"
Cohesion: 0.26
Nodes (14): Weekly Refresh Live (Sundays 04:00 UTC, cache-as-resume), Stage 2 Is the Fragile One (HTML scraping), First Scheduled Refresh Runs on a Cold Actions Cache, Automation (.github/workflows/), Sharp-Drop Guard, Dataset Refresh Cron Is Live (0 4 * * 0), Deploy Site Workflow (deploy-pages.yml), Deploy job (actions/deploy-pages) (+6 more)

### Community 21 - "fetch-entities.ts"
Cohesion: 0.25
Nodes (12): SPECIAL_PURPOSE_ARTIST_MBIDS, ArtistSearch, CandidateArtist, CandidateRecording, escapeLucene(), fetchEntities(), GenreCandidates, normalizeTagName() (+4 more)

### Community 22 - "Genre Explorer - Claude Project Instructions"
Cohesion: 0.17
Nodes (12): Root CLAUDE.md (pointer to .claude/CLAUDE.md), Genre Explorer - Claude Project Instructions, Change Log (required), Don't Commit Secrets, Genre Explorer (project overview), Git Workflow (required), Tech Stack, Where Things Belong (required) (+4 more)

### Community 23 - "rank.ts"
Cohesion: 0.24
Nodes (11): Popular-Artist Lists Skew to Global Megastars, ArtistPopularity, fetchArtistListens(), fetchRecordingListens(), panelScore(), Ranked, RecordingPopularity, selectEntities() (+3 more)

### Community 24 - "config.ts"
Cohesion: 0.30
Nodes (8): The Build Pipeline (scripts/build-dataset/), emitGraph(), fetchGenres(), GenreListPage, CountResponse, escapeLucene(), fetchPopularity(), buildGraphOnly()

### Community 25 - "Prettier Config"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 26 - "Runbook — the rolling dataset refresh"
Cohesion: 0.22
Nodes (8): History: why it looks like this, It merges itself, Manual control, No post-merge chores, Runbook — the rolling dataset refresh, Setup this depends on, The queue has no cursor, What runs when

### Community 27 - "2026-08-19"
Cohesion: 0.25
Nodes (7): 2026-08-19, Dataset refresh: a daily rotation instead of a weekly job that never finished, Mobile banner: close button inline, and only as tall as its content, Mobile: banner open now really does collapse the sheet, and the empty band is gone, Mobile sheet: drag to collapse, and stop sliding sideways, Mobile: the map is the screen again, Post-merge chores: exempt the automated data refresh

### Community 35 - "Genre Explorer README"
Cohesion: 0.29
Nodes (7): Every Noise at Once (rejected prior art), Every Noise at Once, Genre Explorer README, Commands, Data Sources and Credit, Genre Explorer (README overview), Quick Start

### Community 36 - "fetch-links.ts"
Cohesion: 0.52
Nodes (5): fetchArtistLinks(), linkFromUrl(), pickLinks(), UrlRels, ExternalLink

## Knowledge Gaps
- **168 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `trailingComma`, `name` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Genre Explorer Project Context` connect `Conventions, Testing and ListenBrainz Intake` to `Project Context and Data Model`, `Map Rendering and Visibility Rules`, `Found: the Weekly Refresh Is Failing (2026-08-09 run, parked in a new docs/review/)`, `Runtime Dependencies and Camera`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `Camera Model` connect `Runtime Dependencies and Camera` to `Conventions, Testing and ListenBrainz Intake`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `GraphCanvas()` (e.g. with `child()` and `candidates()`) actually correct?**
  _`GraphCanvas()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell, Panels and Personal Lens` be split into smaller, more focused modules?**
  _Cohesion score 0.10756302521008404 - nodes in this community are weakly interconnected._
- **Should `Map Rendering and Visibility Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.055600106923282544 - nodes in this community are weakly interconnected._
- **Should `Detail Panel, Song Links and Post-v1 Work` be split into smaller, more focused modules?**
  _Cohesion score 0.1402116402116402 - nodes in this community are weakly interconnected._