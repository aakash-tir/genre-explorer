# Genre Explorer — Plan

## What this is

An interactive map of recorded music. Every music genre is a node on a zoomable
constellation, sized by how much music exists in it — `rock` is a giant, `vaporwave` is a
speck. Nodes connect to their subgenres, so you can start at something you know and drift
outward into things you don't. Clicking a genre opens a panel with five popular songs,
five obscure ones, five well-known artists and five small ones, each linking out to
Spotify, SoundCloud or Bandcamp, with a 30-second preview you can play in place.

The point is exploration, not search. You should be able to open it knowing only "I like
techno" and leave forty minutes later having found `melodic techno`, then `dub techno`,
then something you have no name for yet.

Strictly music. Nothing else.

---

## Scope

**v1 (building now):**

- Zoomable, pannable genre constellation — scroll wheel and click-to-zoom
- ~800–1,200 genres, auto-imported from MusicBrainz, filtered to those with real data
- Level of detail: only large genres visible when zoomed out, detail appears as you zoom
- Click a genre → camera focuses it, its subgenres fan out radially with labels
- Right-hand panel: 5 popular songs, 5 lesser-known songs, 5 popular artists, 5 small
  artists, each with outbound streaming links
- 30-second audio previews in the panel (Deezer, no API key needed)
- Left-hand collapsible filter: search by genre name, or select several genres and hide
  everything that isn't them or their descendants
- Per-genre colour, with subgenre fills gradient-shifted by depth from their root family
- Shareable deep links — `/genre/melodic-techno` opens focused on that node
- Touch and mobile support: pinch-zoom, tap-to-drill, panel as a bottom sheet
- Weekly scheduled data refresh that opens a PR with the updated dataset

**Deferred** (also tracked in `docs/future.md`):

- Genre similarity beyond the parent/child tree ("sounds like" edges)
- User accounts, saved paths, favourites
- Playlist export
- Artist-level or track-level nodes — the map is genres only
- Timeline / decade view of when genres emerged
- The `influenced by` edges as a visible, toggleable layer

**Non-goals:**

- Not a streaming service. It links out; it never hosts full audio.
- Not a Spotify client. No Spotify login, no user library access (and, as of 2026, no
  Spotify API at all — see below).
- Nothing outside music. No film, no podcasts, no spoken word.
- No editorial writing. Genre descriptions come from the data source or are absent.

---

## Tech stack

| Layer                  | Choice                                                                  | Why                                                                                                                                             | Rejected                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Genre hierarchy        | **MusicBrainz** `subgenre of` / `fusion of` / `influenced by` relations | The only open source with a real genre _tree_, and its structural/associative split matches this project's edge rules exactly                   | **Every Noise at Once** — frozen since Dec 2023, has similarity coordinates but no hierarchy at all. **Wikidata P279** — hierarchy exists but is inconsistently curated for music and has no popularity signal                                                                                            |
| Popularity + song data | **ListenBrainz** popularity API + MusicBrainz tag search                | Real listen counts, free, unauthenticated, and the spread (5.2M listens down to 1) cleanly separates popular from obscure                       | **Spotify Web API** — not available. Artist-top-tracks removed Feb 2026, dev mode capped at 5 users, extended quota needs 250k MAU. **Last.fm** — works, but needs a key, is non-commercial-only, and its tag data is noisier                                                                             |
| Streaming links        | **MusicBrainz artist URL relationships**                                | Returns canonical `open.spotify.com` and `soundcloud.com` URLs without touching the Spotify API                                                 | Constructing search-query links — fragile, and lands the user on a search page rather than the artist                                                                                                                                                                                                     |
| Audio previews         | **Deezer public API**                                                   | 30s preview MP3s, no API key, no auth, 50 req/5s                                                                                                | Spotify `preview_url` — removed for new apps in Nov 2024                                                                                                                                                                                                                                                  |
| Rendering              | **Canvas 2D + `d3-zoom`**                                               | Per-node radial gradients are one call; level-of-detail is a plain conditional in the draw loop. 1,200 nodes is trivial for Canvas              | **Sigma.js v3** — WebGL, excellent, but per-node gradients need custom GLSL programs, making the signature visual the hardest code in the repo. **react-force-graph** — re-simulates on every load, so the map moves between visits. **Cytoscape.js** — DOM-bound, analysis-oriented, restrictive styling |
| Layout                 | **`d3-force`, run offline at build time**                               | Coordinates baked into the dataset: identical map every visit, no simulation in the browser, instant first paint                                | Live in-browser simulation — layout differs per visit, which destroys the spatial memory the whole product depends on                                                                                                                                                                                     |
| Framework              | **React 19 + TypeScript + Vite 8**                                      | React for the panel/filter chrome; the canvas is a single imperative component that React does not re-render                                    | Svelte/Solid — fine choices, but React has the deepest ecosystem for the UI shell and no meaningful cost here                                                                                                                                                                                             |
| Data pipeline          | **TypeScript scripts on Node, run via `tsx`**                           | One language across pipeline and app; the dataset types are shared between the builder and the loader, so a schema change fails at compile time | Python — better data ergonomics, but duplicating the type definitions across two languages is how the dataset and the app drift apart                                                                                                                                                                     |
| Validation             | **Zod**                                                                 | Dataset is validated at build time _and_ on load, so a malformed refresh fails loudly rather than rendering a broken map                        | Hand-written type guards — more code, worse errors                                                                                                                                                                                                                                                        |
| Tests                  | **Vitest** + Testing Library                                            | Native to Vite, no separate config, fast                                                                                                        | Jest — needs its own transform pipeline alongside Vite                                                                                                                                                                                                                                                    |
| Hosting                | **Cloudflare Pages**                                                    | Unlimited free bandwidth on static assets, and works with a private repo                                                                        | **GitHub Pages** — disqualified, private repos need a paid plan. **Netlify/Vercel** — 100 GB/month caps                                                                                                                                                                                                   |
| CI                     | **GitHub Actions**                                                      | Native to the repo, gates PRs, and runs the weekly data refresh on schedule                                                                     | —                                                                                                                                                                                                                                                                                                         |

---

## Architecture

Two entirely separate halves. Nothing at runtime talks to an external API.

```
BUILD TIME (GitHub Actions, weekly + on demand)
───────────────────────────────────────────────
  scripts/build-dataset/
    1. fetch-genres      MusicBrainz /genre/all           → 2,184 names
    2. fetch-hierarchy   MusicBrainz genre HTML pages     → subgenre/fusion/influence edges
                         (1 req/s, disk-cached)
    3. fetch-popularity  MusicBrainz release-group counts → genre size
       └─ FILTER: drop genres below the data threshold    → ~800–1,200 survive
    4. fetch-entities    MusicBrainz artist + recording tag search
                         MusicBrainz artist url-rels      → Spotify/SoundCloud/Bandcamp
    5. rank              ListenBrainz POST /popularity/*   → popular vs. obscure split
    6. previews          Deezer search                     → 30s preview MP3 urls
    7. layout            d3-force, 300 ticks               → baked x/y per node
    8. emit              validate with Zod, write JSON

                              ↓ committed to the repo

  public/data/graph.json          nodes + structural edges + coords   (<400 KB)
  public/data/genres/<id>.json    songs, artists, links, previews     (lazy)

RUNTIME (browser, static)
─────────────────────────
  App
   ├── FilterPanel (left, collapsible)   search · multi-select · hide the rest
   ├── GraphCanvas (centre)              Canvas 2D + d3-zoom
   │     ├── lod.ts       what is visible at this zoom / focus / filter
   │     ├── edges.ts     which edges are drawn (structural only)
   │     ├── colors.ts    family hue + depth gradient
   │     └── camera.ts    scroll zoom, click-to-focus, radial fan
   ├── DetailPanel (right)               lazy-loads genres/<id>.json, audio player
   └── deepLink.ts                       URL ⇄ {focus, filters, zoom}
```

### Edge rules

Every genre has at most **one drawn parent edge** — its `subgenre of` relation. The
`fusion of` and `influenced by` relations are kept in `graph.json` but are **never drawn
on the map**. When a genre is focused, its associative children join the focused set, so
`alternative dance` appears under both `alternative rock` and `dance` when each is
focused in turn, without either edge ever being rendered. This is `plan.md`'s original
"an edge may exist in the codebase, don't display it" rule, and MusicBrainz happens to
model exactly that distinction already.

### Level of detail

A node is drawn if: its popularity clears the cutoff for the current zoom level, **or**
it is in the focused subtree, **and** it passes the active filter. Labels have a stricter
threshold than dots — a genre can be a visible speck before it earns a name.

---

## The hard part

**Getting the genre hierarchy out of MusicBrainz.**

MusicBrainz has the tree — 2,184 genres with `subgenre of`, `fusion of` and
`influenced by` relations, which is the reason this project is buildable at all. But
those relations are **not exposed by the JSON API**. Verified 2026-08-04:

```
GET /ws/2/genre/{mbid}?inc=genre-rels&fmt=json   → 200 OK, relations absent
GET /ws/2/genre?query=rock                        → "This hasn't been implemented yet."
```

The `inc` parameter is accepted and silently returns nothing, which is worse than an
error — a naive pipeline would produce 2,184 orphan nodes and no tree, and nothing would
look broken until the map rendered as dust.

Two routes exist. The 7 GB `mbdump.tar.bz2` full export contains the `l_genre_genre`
table and is authoritative, but requires a Postgres import in CI for a few thousand rows.
The chosen route is to **scrape the 2,184 genre HTML pages** at MusicBrainz's stated
1 req/s limit — about 37 minutes, once, cached to disk and refreshed weekly.

Consequences designed for:

- The scraper is the most fragile part of the codebase. It is isolated in one module,
  with fixture-based tests over saved HTML so a MusicBrainz layout change fails a test
  rather than silently emptying the graph.
- The build **fails loudly** if the parsed edge count drops sharply against the last
  committed dataset. Silent degradation is the failure mode that matters here.
- The dump import stays documented as the fallback if scraping stops working.

The second-hardest part is the **empty long tail**: `acholitronix` is a real MusicBrainz
genre with zero tagged releases. Roughly 40% of the 2,184 genres cannot fill a panel.
The data threshold in step 3 exists specifically to keep those off the map.

---

## External dependencies

All free, none requiring an account or API key.

| Service                                                                                 | Used for                                                    | Limits                                                                 | Cost |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API)                              | Genre list, hierarchy, artists, recordings, streaming links | **1 req/s**, `User-Agent` with contact info required. Core data is CC0 | Free |
| [ListenBrainz](https://listenbrainz.readthedocs.io/en/latest/users/api/popularity.html) | Listen counts for the popular/obscure split                 | Unauthenticated, no published hard cap                                 | Free |
| [Deezer](https://publicapi.dev/deezer-api)                                              | 30-second preview MP3s                                      | 50 req / 5s, no key                                                    | Free |
| [Cloudflare Pages](https://pages.cloudflare.com/)                                       | Hosting                                                     | Unlimited static bandwidth, 500 builds/month                           | Free |
| GitHub Actions                                                                          | CI + weekly refresh                                         | 2,000 min/month on free private repos                                  | Free |

Not used, deliberately: **Spotify Web API**. As of February 2026 artist-top-tracks,
browse and batch endpoints are removed, search `limit` is capped at 10, the app owner
must hold Premium, dev mode allows 5 users, and extended quota requires a registered
organisation with 250k+ monthly active users. Spotify appears in this project only as an
outbound link. Full detail in `docs/research/music-data-sources.md`.

### Known upstream breakage

`GET /1/popularity/top-recordings-for-artist/{mbid}` and
`top-release-groups-for-artist/{mbid}` are documented but returned **500** on 2026-08-04.
The pipeline uses the working POST endpoints instead. Recheck periodically.

---

## Testing strategy

The rule: **pure logic is unit-tested, rendering is not.** Anything that decides _what_
is on screen is a pure function with tests. The code that puts pixels on a canvas is
verified by looking at it.

| Level                           | Covers                                                                                                                          | Gate                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Unit** (Vitest)               | `edges.ts` fusion rule · `lod.ts` visibility · `colors.ts` depth gradients · `deepLink.ts` URL round-trips · Zod dataset schema | Must pass to merge   |
| **Fixture** (Vitest)            | The MusicBrainz HTML parser, against saved real pages                                                                           | Must pass to merge   |
| **Component** (Testing Library) | Filter panel selection, detail panel rendering + loading/empty states                                                           | Must pass to merge   |
| **Build validation**            | Zod-validate the emitted dataset; fail if node or edge count drops sharply vs. the committed dataset                            | Fails the refresh PR |
| **Type check**                  | `tsc --noEmit` across app, tests and pipeline                                                                                   | Must pass to merge   |
| **Lint**                        | ESLint + Prettier                                                                                                               | Must pass to merge   |

Command: `npm test`. Full gate locally: `npm run verify`.

No end-to-end browser tests in v1. They would mostly assert that a canvas painted
something, which is expensive to maintain and proves little. Revisit if interaction bugs
start reaching `main`.

---

## Milestones

Each one ends with something you can run and look at.

1. **Skeleton + gate** _(done — this scaffold)_
   Vite/React/TS project, dataset types, pure logic modules with real tests, CI that
   fails on a broken test, private repo with `main` protected.

2. **The hierarchy**
   `scripts/build-dataset` steps 1–3: fetch the genre list, scrape and parse the
   hierarchy, count release-groups, apply the threshold. Ends with a committed
   `graph.json` of ~1,000 genres with a real tree, and fixture tests over the parser.

3. **The map renders**
   `d3-force` layout baked at build time; Canvas renderer drawing nodes, structural
   edges, colours and depth gradients; `d3-zoom` scroll and pan; level of detail.
   Ends with a map you can actually fly around.

4. **Focus and the panel**
   Click-to-focus with the radial fan, then pipeline steps 4–5 (artists, recordings,
   links, popular/obscure ranking) and the right-hand panel that reads them.
   Ends with the core loop working end to end.

5. **Find your way around**
   Left filter panel: search, multi-select, hide-the-rest. Deep links, so a focused
   genre is a shareable URL.

6. **Make it enjoyable**
   Deezer previews and the audio player. Touch and mobile: pinch-zoom, tap-to-drill,
   bottom-sheet panel. Motion and polish pass.

7. **Keep it alive**
   Weekly refresh workflow opening a PR with the new dataset, with the
   sharp-drop guard. Cloudflare Pages connected. Ship it.

---

## Open questions

| Question                                                                                                                     | Who answers                                       | When it blocks  |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------- |
| What exactly is the data threshold — release-group count, artist count, or both?                                             | Decide from real numbers during milestone 2       | Milestone 2     |
| MusicBrainz genres with no `subgenre of` parent — one synthetic root, or several floating families?                          | Decide once we can see how many orphans there are | Milestone 2     |
| How is the "obscure" band defined? Bottom decile is mostly data artifacts (1 listen, 1 user)                                 | Tune against real distributions                   | Milestone 4     |
| Colour families — assign by top-level ancestor, but how many top-level genres are there, and is that too many distinct hues? | Decide when the tree exists                       | Milestone 3     |
| Cloudflare Pages account + repo connection                                                                                   | **Repo owner** — manual, one-time                 | Milestone 7     |
| Does the 40%-empty long tail leave the map feeling thin in some regions (e.g. non-Western genres)?                           | Review after milestone 2                          | Before shipping |
