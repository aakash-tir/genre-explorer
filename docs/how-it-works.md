# How Genre Explorer works

A walkthrough of the whole system, end to end, at the level of the actual code. For
scope and history see `plan.md`; for the mental model in brief see
`.claude/project-context.md`; for evidence behind decisions see `docs/research/`.

Live site: <https://aakash-tir.github.io/genre-explorer/>

---

## The big picture

Genre Explorer is an interactive, zoomable map of music genres. Every genre is a node
sized by how much music exists in it, connected to its subgenres. Clicking one opens a
panel of popular and obscure songs and artists with outbound streaming links and
playable previews.

The system is **two halves that never talk to each other at runtime**:

```
BUILD TIME (GitHub Actions, weekly + on demand)
  scripts/build-dataset/  → calls MusicBrainz, ListenBrainz, Deezer
                          → computes a force layout offline
                          → emits static JSON into public/data/  (committed artifact)

RUNTIME (browser, static site on GitHub Pages)
  src/                    → loads its own JSON, draws a canvas, plays previews
                          → NO external API calls, with one scoped exception:
                            the personal lens (src/personal/), user-initiated only
```

This split is forced by the upstream services themselves: MusicBrainz allows 1
request/second and Deezer 50 per 5 seconds — per-visitor API calls are impossible. It
also means the site cannot go down because an upstream API did.

---

## The dataset (`public/data/`)

Three files, all Zod-validated **twice** — once when the pipeline emits them, again when
the browser loads them — so a corrupted weekly refresh fails loudly instead of rendering
a subtly wrong map. The schemas live in `src/types.ts` and are imported by **both** the
pipeline and the app: a shape change breaks `tsc` on both sides at once, which is the
mechanism that keeps them in sync.

### `graph.json` — everything needed to paint the map

Kept under **~400 KB pre-gzip** so it never blocks first paint. Contains `builtAt` plus:

- **`nodes`** — one `GenreNode` per surviving genre:
  - `id` — lowercase kebab-case slug (`melodic-techno`), used in URLs and as the
    detail file name
  - `mbid` — the MusicBrainz genre id
  - `popularity` — MusicBrainz release-groups tagged with the genre. Spans five
    orders of magnitude (rock: 547,091 · vaporwave: 15,981), which is why every
    visual scale in the app is logarithmic
  - `depth` — hops from the family root (0 = a root), drives the colour ramp
  - `family` — id of the top-level ancestor, drives the hue
  - `x`, `y` — **baked** `d3-force` coordinates. The browser never runs a layout
    simulation; the map is pixel-identical on every visit so spatial memory works
- **`edges`** — `{source, target, kind}` where `kind` is `subgenre`, `fusion` or
  `influence` (MusicBrainz's own relationship vocabulary)

### `genres/<id>.json` — what a genre sounds like

One file per genre, **lazy-loaded** the first time that genre is focused, then cached
for the session. Contains four lists of five: `popularArtists`, `smallArtists`,
`popularTracks`, `obscureTracks`. Each artist/track carries its ListenBrainz listen
count, outbound links (Spotify/SoundCloud/Bandcamp/YouTube/Discogs, from MusicBrainz
URL relationships), and for tracks an optional `deezerId`.

`deezerId` is a stable Deezer track id, **not** a preview URL — Deezer preview MP3
links carry an auth token that expires in ~12 minutes, so a URL baked into a committed
dataset would be dead before it merged. The panel embeds Deezer's widget player by id
on demand instead.

### `artist-index.json` — the personal lens's reverse index

Artist → genres, inverted from the detail files at build time
(`scripts/build-dataset/emit-artist-index.ts`). Each entry has the artist's `mbid`
(always), `spotifyId` (extracted from their Spotify link, ~68% coverage), normalized
`name`, and genre references as integer indexes into a shared `genreIds` table to keep
the payload small. Loaded **only** when a listening profile exists, so visitors who
never touch the personal lens never pay for it.

---

## The build pipeline (`scripts/build-dataset/`)

Run with `npm run build:dataset`. Every HTTP response is disk-cached under
`.cache/build-dataset/`, so a cold run is hours but a rerun is seconds and an
interrupted run **resumes** where it stopped. The knobs live in `config.ts` — rate
delays (MusicBrainz 1.1 s, ListenBrainz 300 ms, Deezer 110 ms), the project
`User-Agent` with contact info, and the thresholds described below.

**Stage 1 — genre list** (`fetch-genres.ts`). `GET /ws/2/genre/all`, paged → 2,184
`{mbid, name}` pairs.

**Stage 2 — hierarchy** (`fetch-hierarchy.ts` + `parse-genre-page.ts`). The
genre-to-genre relations are **not available from the MusicBrainz JSON API** —
`inc=genre-rels` is accepted and silently returns nothing (verified 2026-08-04). The
data exists only on the genre HTML pages and in the 7 GB database dump. So this stage
**scrapes the 2,184 HTML pages** at 1 req/s (~40 minutes cold, cached thereafter). The
parser is isolated in one module with fixture tests over saved real pages, so a
MusicBrainz layout change fails a test instead of silently emptying the graph. The dump
import stays documented as the fallback.

**Stage 3 — popularity + threshold** (`fetch-popularity.ts`). Release-group counts per
genre. Roughly 40% of MusicBrainz genres cannot fill a panel (`acholitronix`: zero
tagged releases), so genres below `MIN_RELEASE_GROUPS = 50` are dropped. **912 of
2,184 survive** in the current dataset.

**Graph assembly** (`build-graph.ts`). Slugs, one drawn parent per node (multi-parent
children are demoted to a single structural parent, conflicts reported), cycles broken,
`depth` and `family` computed. Orphan genres stay as floating family roots — there is
no synthetic "music" node.

**Stages 4–5 — entities and ranking** (`fetch-entities.ts`, `rank.ts`,
`fetch-links.ts`). Per surviving genre: MusicBrainz artist and recording tag search
(over-fetched at `SEARCH_LIMIT = 50` because many recordings have no ListenBrainz data
at all), then ListenBrainz **POST** popularity endpoints for listen counts (the
documented GET endpoints return 500 — see `docs/future.md`, upstream watch). Ranked
into popular vs. obscure, where obscure means the 100+ listen band
(`OBSCURE_MIN_LISTENS` — below that is data artifacts, not hidden gems). Streaming
links come from artist `inc=url-rels`.

**Stage 6 — previews** (`fetch-previews.ts`). Deezer search resolves each ranked track
to a stable Deezer id. ~28% of tracks have no Deezer match; those keep their links and
simply have no play button.

**Stage 7 — layout** (`layout.ts`). `d3-force` with a fixed seed and fixed tick count,
run offline. Deterministic: the same input produces the same map.

**Stage 8 — emit** (`emit.ts`, `emit-details.ts`, `emit-artist-index.ts`). Zod
validation plus the **sharp-drop guard**: the build fails if node or edge counts fall
more than `MAX_SHRINK_RATIO = 0.2` against the committed dataset. This guard exists
because the scariest failure is silent — a MusicBrainz HTML change that empties the
scraper still emits a _valid_ (nearly treeless) dataset; validation alone would pass it.

---

## The runtime app (`src/`)

### Shell and state (`App.tsx`, `src/lib/deepLink.ts`)

The app state is exactly three fields — `{focusId, selectedIds, zoom}` — and **the URL
is that state**: `/genre/melodic-techno?filter=techno,house&zoom=8` opens focused on
melodic techno, filtered, at zoom 8. `deepLink.ts` does the pure string ⇄ object
conversion (sanitised, never throws — a mangled URL degrades to the overview).
`App.tsx` parses the URL on load and rewrites it via `history.replaceState` on every
change, so every view is shareable. All URLs resolve against Vite's `BASE_URL` because
GitHub Pages serves the site under `/genre-explorer/`.

One extra bit of ephemeral state, `fanOpen`, is deliberately **not** in the URL: the
selection is sticky (the panel and any playing preview stay on the selected genre), and
clicking empty map space merely collapses the focus fan so the map is browsable
mid-listen. Clicking the selected genre again toggles its fan; only clicking a
_different_ genre switches the selection.

### Loading (`src/lib/dataset.ts`)

`loadGraph` / `loadGenreDetail` / `loadArtistIndex` fetch and Zod-validate the three
dataset files. Detail files go through `createDetailCache`, which caches **in-flight
promises**, not just results (double-clicking a node must not fire two requests) and
evicts failures (a transient network blip must not make a genre permanently
unopenable). `indexNodes` builds the id → node map everything else uses.

### Camera (`src/graph/camera.ts`)

Two transforms compose over the baked coordinates:

1. **FIT** — computed once per canvas size: scales the world bounding box (plus
   padding) into the viewport. Zoom 1 always means "the whole map", on any screen.
2. **ZOOM** — the live `d3-zoom` transform (scroll/pinch/pan) on top.

Keeping them separate is why `?zoom=8` in a shared URL means the same thing on a phone
and a desktop: the URL stores the user's zoom factor, never pixel offsets.

### Level of detail (`src/graph/lod.ts`)

What is on screen is decided by three inputs, all pure functions:

- **Zoom** — a node must clear a popularity cutoff that falls as you zoom in. The
  cutoff works in log10 space: at zoom 1 only genres with ~10^4.3 releases are drawn (a
  handful of family roots); the exponent falls linearly with log2(zoom) and reaches 0
  at `FULL_DETAIL_ZOOM = 64`, where all 912 genres are visible.
  `MIN_VISIBLE_EXPONENT` and `FULL_DETAIL_ZOOM` are the two knobs that tune how the
  map "feels".
- **Focus** — the focused genre and its children are always visible regardless of
  zoom.
- **Filter** — a hard gate that overrides everything, including focus: with a
  selection active, everything outside the selected genres and their structural
  descendants is hidden.

Labels are stricter than dots (`LABEL_ZOOM_MULTIPLIER = 2`) — a genre can be a visible
speck before it earns a name — with two exceptions: focused nodes and their children
are always labelled, and family roots (depth 0) are always labelled while visible,
because they are the landmarks the map is navigated by.

Node radius is log-scaled (`nodeRadius`): rock and vaporwave differ 34× in popularity
but roughly 2× on screen.

### The edge rule (`src/graph/edges.ts`)

The single most distinctive behaviour. The dataset carries three relation kinds; **only
`subgenre` is ever drawn**, and each genre has at most one drawn parent (the map is a
tree). `fusion` and `influence` are **associative**: never rendered, but when a genre
is focused, `focusChildren` includes its associative children — so `alternative dance`
(a MusicBrainz fusion of `alternative rock` and `dance`) appears under **both** parents
when each is focused in turn, without an edge between the two families ever appearing.
`structuralDescendants` (used by the filter) follows drawn edges only and is
cycle-safe, because MusicBrainz is user-edited.

### Colour (`src/graph/colors.ts`)

Hue by family, gradient by depth, in HSL:

- Family hues are assigned by **popularity rank around the golden-angle sequence**
  (137.508°), not by name hash — hashing put rock and electronic on nearly the same
  magenta. Ranking guarantees the biggest families sit far apart on the wheel, and ties
  break on id so a refresh keeps its colours.
- 131 of the 179 family roots are **singletons** (no tree connections); they share one
  muted slate-violet neutral instead of burning 131 indistinguishable hues.
- Depth desaturates and lightens (vivid root → pale fourth-generation leaf, floored at
  `MAX_RAMP_DEPTH = 4`), so distance from the root is readable without labels.
- Each node renders as a radial gradient (brighter core → its own colour at the rim);
  edges are drawn in the child's colour at 28% alpha, so lines read as lineage.

### Focus fan and labels (`src/graph/fan.ts`, `labels.ts`)

Clicking a node animates the camera to it and fans its children onto a ring around it.
This is a **rendering transform only** — an override map of positions, never a mutation
of the layout; releasing focus animates everything back. The ring radius is whichever
is larger: clearance around the focused node, or the circumference the children need
without overlapping. Unrelated nodes that happen to sit inside the ring are displaced
just outside it while focus is held, for the same reason.

`labels.ts` then decides which of the _earned_ labels actually fit: greedy placement by
priority (popularity, focus boosted above all), dropping any label that would overlap a
claimed rectangle. A dropped label reappears as soon as the camera gives it room.

### Rendering (`src/graph/GraphCanvas.tsx`)

A single imperative Canvas 2D component that React does not re-render per frame. It
subscribes to `d3-zoom` once, calls the pure modules above each frame, and draws.
Deliberately not a graph library: per-node radial gradients and zoom LOD are the
signature visuals, and Sigma.js (WebGL/GLSL) or react-force-graph (re-simulates every
load) would fight exactly those (see `docs/research/graph-rendering.md`). By
convention, everything that decides _what_ appears is pure and unit-tested; the canvas
only puts pixels where told.

### Detail panel (`src/panel/DetailPanel.tsx`)

Lazy-loads the focused genre's detail file through the session cache. Four lists with
listen counts (formatted as magnitude signals — "1.2M", "90k") and outbound links. One
preview plays at a time via Deezer's widget player, embedded on demand by track id.
Explicit states: idle, loading, error, and loaded-but-thin (a real condition — a genre
can clear the release-group threshold yet have no ranked listens).

### Filter panel (`src/filters/FilterPanel.tsx`)

Search by name, multi-select. The selection feeds `resolveFilter`: the map keeps the
selected genres plus their structural descendants and hides everything else.

### The personal lens (`src/personal/`)

The one scoped exception to "no runtime network calls" — user-initiated, degrades to
"feature unavailable", and the map never depends on it. One intake path, reducing
to the `ListenedArtist[]` shape (`{mbid?, spotifyId?, name, rank}`):

- **ListenBrainz username (public path, `listenbrainz.ts`)** — no key, no OAuth; the
  stats API is public with CORS `*`. Fetches top artists for `range=year`, falling back
  to `all_time`. Because ListenBrainz's stats batch pipeline can lag **weeks** (observed
  2026-08-12: an account with 74k listens and every range returning 204), a second
  fallback pages the raw listens feed (up to 3 × 1000 newest listens via `max_ts`) and
  ranks artists by play count client-side. Mapped listens carry
  `mbid_mapping.artists[].artist_mbid` — the dataset's own primary key — so matching
  stays exact; an id is kept only when all of an artist's listens agree on it, so a
  name collision degrades to name matching instead of crediting the wrong artist.

(A second path — "Spotify owner mode", client-side OAuth PKCE against a dev-mode
Spotify app — shipped in PR #28 and was removed 2026-08-12: the Spotify app was never
registered, and at 2026 API policy it could never serve more than 5 allowlisted users.)

**Matching (`match.ts`, pure)** — each listened artist is looked up in the reverse
index by MBID (exact), then Spotify id (exact), then normalized name — but name-matching
only when the name is unique in the index, because crediting the wrong "Bush" is worse
than missing one. Matched artists contribute `1/√(rank+1)` to each of their genres'
weights (top of the list dominates without the tail vanishing; a versatile artist
credits every genre in full). Weights are normalized so the strongest genre is 1.

**Suggestions (`suggest.ts`, pure)** — "genres to branch out into", computed entirely
from edges already in `graph.json`: fusion/influence edges contribute at factor 1
(MusicBrainz's own "sounds adjacent" statements), parent/child tree edges at 0.7,
siblings at 0.35. Candidates several listened genres point at outrank one strong
neighbour. No external recommendation API involved.

**State (`usePersonal.ts`, `storage.ts`)** — the connect → fetch → match → suggest
sequence, persisted in `localStorage`. The map draws the lens (when toggled on) as
highlight rings on matched genres and markers on suggested ones; lens genres are always
visible regardless of zoom, but labels follow normal rules and the filter still gates
them.

---

## Automation (`.github/workflows/`)

- **`ci.yml`** — on every PR and push to main: lint, format check, typecheck, tests,
  build, plus a payload-size report. Wired as a required status check; a red run blocks
  the merge button. Locally the same gate is `npm run verify`.
- **`deploy-pages.yml`** — on every merge to main: builds with `--base=/genre-explorer/`,
  copies `index.html` to `404.html` (the SPA fallback that makes deep links work on
  GitHub Pages), deploys. Cloudflare Pages is the documented fallback host
  (`docs/runbooks/hosting.md`).
- **`refresh-data.yml`** — Sundays 04:00 UTC (and on demand): rebuilds the dataset and
  **opens a PR** — never pushes to main, so the sharp-drop guard and CI review every
  refresh. A fully cold build (~9 h) exceeds the 6-hour job limit, so the pipeline's
  disk cache doubles as a cross-run resume mechanism (saved even on failure), and
  scheduled runs prune only the volatile cache (tree, counts, searches, rankings) while
  keeping stable id mappings (streaming links, Deezer ids). Steady state ≈ 2.5–3 h.

The dataset is a **committed artifact**: `public/data/` is checked in, produced only by
the pipeline, refreshed only via PR, never hand-edited.

---

## Testing

The rule: **pure logic is unit-tested; rendering is not.** Anything deciding _what_
appears on screen — `edges.ts`, `lod.ts`, `colors.ts`, `fan.ts`, `labels.ts`,
`deepLink.ts`, `match.ts`, `suggest.ts`, `listenbrainz.ts`, the Zod schemas — is a pure
function with tests. The canvas drawing code is verified by looking at it. The
MusicBrainz HTML parser has fixture tests over saved real pages. Panels have
Testing Library component tests. `tests/` mirrors `src/`. There are deliberately no
end-to-end browser tests in v1 — they would mostly assert that a canvas painted
something.

---

## Status

v1 is complete and live: all seven milestones in `plan.md` are done, the repo is
public, and the site deploys automatically. Open work — deferred features, known gaps
(unverified real-device touch, megastar skew in popular-artist lists, the ~28% of
tracks without previews), and upstream watches — lives in `docs/future.md`.
