# Genre Explorer — Project Context

Deep context for working in this repo. `plan.md` has the scope and milestones;
`docs/research/` has the evidence behind each decision. This file is the mental model.

---

## The shape of the system

Two halves that never talk to each other at runtime.

**Build time** — a Node/TypeScript pipeline in `scripts/build-dataset/` calls MusicBrainz,
ListenBrainz and Deezer, computes a force layout, and emits static JSON into
`public/data/`. It runs in GitHub Actions weekly (and on demand) and opens a PR with the
result. The emitted dataset is a **committed artifact**.

**Runtime** — a static React app. It loads its own JSON and — one scoped exception
aside — makes no other network calls. There is no server, no database, no API route.
This is deliberate: MusicBrainz's 1 req/s rate limit and Deezer's 50 req/5s make
per-visitor API calls impossible, and it means the site cannot break because an
upstream service is down.

The exception is the personal lens (`src/personal/`): user-initiated calls to
`api.listenbrainz.org` (public path — open, CORS `*`). It degrades to "feature
unavailable"; the map never depends on it. Any other `fetch` to an external host
inside `src/` means the design has gone wrong.

---

## Pipeline stages

`scripts/build-dataset/index.ts` runs these in order. Each stage caches its HTTP
responses to disk so a rerun is cheap and doesn't re-hammer upstream.

| #   | Stage              | Source                                                           | Output                                                      |
| --- | ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `fetch-genres`     | `GET musicbrainz.org/ws/2/genre/all?fmt=txt`                     | 2,184 genre names                                           |
| 2   | `fetch-hierarchy`  | **Scraped genre HTML pages**, 1 req/s                            | `subgenre of` / `fusion of` / `influenced by` edges         |
| 3   | `fetch-popularity` | MusicBrainz release-group tag counts                             | Genre size → **and the threshold filter**                   |
| 4   | `fetch-entities`   | MusicBrainz artist + recording tag search, artist `inc=url-rels` | Candidate artists/tracks + Spotify/SoundCloud/Bandcamp URLs |
| 5   | `rank`             | `POST listenbrainz.org/1/popularity/{artist,recording}`          | Listen counts → popular vs. obscure split                   |
| 6   | `previews`         | Deezer search                                                    | 30s preview MP3 URLs                                        |
| 7   | `layout`           | `d3-force`, fixed tick count, fixed seed                         | Baked `x`/`y` per node                                      |
| 8   | `emit`             | Zod validation + sharp-drop guard                                | `public/data/*.json`                                        |

### Stage 2 is the fragile one

MusicBrainz's genre-to-genre relationships **are not available from the JSON API**.
Verified 2026-08-04:

```
GET /ws/2/genre/{mbid}?inc=genre-rels&fmt=json  → 200 OK, "relations" absent
GET /ws/2/genre?query=rock                       → "This hasn't been implemented yet."
```

The `inc` parameter is accepted and silently returns nothing. That is the dangerous
failure mode: a pipeline that trusts it produces 2,184 orphan nodes, no tree, and no
error. The data only exists on the HTML pages and in the 7 GB `mbdump.tar.bz2` export.

Guardrails, in the code:

- The HTML parser is isolated in one module with **fixture tests over saved real pages**,
  so a MusicBrainz layout change fails a test instead of silently emptying the graph.
- Stage 8 **fails the build** if edge or node counts drop sharply against the committed
  dataset.
- The dump import remains the documented fallback.

### Stage 3 is where the map gets its quality

About 40% of MusicBrainz's genres cannot fill a detail panel — `acholitronix` is a real
genre with **zero** tagged release-groups, while `rock` has 547,091. The threshold filter
here is what keeps the map from being full of nodes that open to nothing. Expect roughly
800–1,200 genres to survive.

Popularity spans five orders of magnitude, so node radius must be scaled
**logarithmically**. Linear scaling makes `rock` a thousand times the diameter of
`vaporwave`.

---

## Data model

Two files, split for payload reasons (see `docs/research/hosting.md`):

- **`public/data/graph.json`** — everything the map needs to paint: node id, name,
  popularity, depth, colour family, baked coordinates, plus all edges. Target **< 400 KB**
  before gzip so first paint isn't blocked.
- **`public/data/genres/<id>.json`** — one file per genre: 5 popular songs, 5 obscure
  songs, 5 popular artists, 5 small artists, their links and preview URLs. **Lazy-loaded**
  when a node is focused, then cached in memory.

Types live in `src/types.ts` and are imported by _both_ the pipeline and the app. A shape
change must break `tsc` on both sides — that is the mechanism keeping them in sync. Never
redeclare the dataset shape inside `scripts/`.

---

## The three rules that define the interaction

These come straight from the original plan and are implemented as **pure, unit-tested
functions**, deliberately kept out of the render loop.

### 1. Edges — `src/graph/edges.ts`

Only `subgenre of` edges are ever drawn, and each genre has at most one drawn parent.
`fusion of` and `influenced by` edges are in the dataset but **never rendered on the map**.
When a genre is focused, its associative children join the focused set — so
`alternative dance` shows up under both `alternative rock` and `dance` when each is
focused in turn, without either edge appearing on the map.

This is the original plan's "an edge may exist in the codebase, don't display it" rule.
MusicBrainz models exactly this structural/associative split already, which is a large
part of why it was chosen over every alternative source.

### 2. Level of detail — `src/graph/lod.ts`

A node is drawn if it clears the popularity cutoff for the current zoom level **or** is
in the focused subtree, **and** it passes the active filter. Labels have a stricter
threshold than dots — a genre can be a visible speck before it earns a name.

### 3. Colour — `src/graph/colors.ts`

Hue comes from the top-level ancestor (the genre "family"). Saturation and lightness
shift with depth, so subgenres are visibly gradient-descended from their family root.

---

## Camera model

Baked `d3-force` positions are the resting state and never change. `d3-zoom` provides
scroll-wheel zoom and panning. Clicking a node animates the camera to it and fans its
direct children onto a ring around it — a **rendering transform only**, not a data or
layout change. Releasing focus animates them back to their resting positions.

The map you learn must be the map you get. That is why layout is offline and why no live
simulation runs in the browser.

---

## Auth model

There are no accounts and no server, and that is intentional.

- No user accounts, no login, no sessions, no cookies. "Who you are" is
  `localStorage` in this browser.
- No API keys in the pipeline. Every upstream source (MusicBrainz, ListenBrainz,
  Deezer) is open and unauthenticated.
- The only credential in the project is the `GITHUB_TOKEN` that GitHub Actions provides
  to the refresh workflow so it can open a PR. Nothing needs to be stored as a secret.
- **Spotify is outbound links only.** The app never calls Spotify's API. (A
  client-side OAuth "owner mode" existed briefly — removed 2026-08-12, the
  Spotify app was never registered; at 2026 API policy there was no
  public-scale path anyway, see
  `docs/research/listening-history-personalization.md`. The personal lens's
  sole intake is a ListenBrainz username.)

If a future feature needs a real secret, it goes in GitHub Actions secrets and is used
only at build time. A static site cannot hold a secret.

---

## Known gaps

v1 is built, merged and live at <https://aakash-tir.github.io/genre-explorer/>
(GitHub Pages; Cloudflare Pages is the documented fallback in
`docs/runbooks/hosting.md`). The dataset is real — 912 of 2,184 genres survived the
threshold filter, orphans stay as floating family roots (no synthetic "music" node),
and the obscure floor is `OBSCURE_MIN_LISTENS = 100`. What remains:

- **ListenBrainz `GET /1/popularity/top-recordings-for-artist/{mbid}` and
  `top-release-groups-for-artist/{mbid}` return 500** as of 2026-08-04, despite being
  documented. The pipeline must use the working POST endpoints. Recheck occasionally —
  they would simplify stage 5.
- **No end-to-end tests.** Deliberate for v1 — they'd mostly assert a canvas painted
  something. Revisit if interaction bugs start reaching `main`.
- **Open product questions** — megastar skew in popular-artist lists, tuning the
  obscure band, non-Western coverage after the threshold filter — are tracked with
  the rest of the backlog in `docs/future.md`.
