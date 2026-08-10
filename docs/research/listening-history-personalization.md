# Research — A personal "your genres" subgraph from listening history

**Date:** 2026-08-10
**Question it answers:** Can users connect their Spotify listening history and see a
subgraph of the genres they listen to, plus similar genres to branch out into?

Claims marked **verified** were checked with an actual HTTP call on 2026-08-10, same as
`music-data-sources.md`. The rest cites the official changelogs or our earlier verified
research.

---

## Verdict

**Yes — but not in the form "create an account and connect Spotify."** Both halves of
that phrasing hit a wall, and both walls have good ways around:

1. **Spotify OAuth is effectively closed to the public.** The user-history endpoints
   still exist, but a 2026-registered app is capped at **5 manually-allowlisted users**,
   and the only escape hatch (extended quota mode) requires a registered organization
   with 250k+ MAU (`music-data-sources.md`, verified 2026-08-04). A "Connect Spotify"
   button on a public site cannot work. What does work: **ListenBrainz as the bridge**
   (users link Spotify there once; we read their history from ListenBrainz's open API —
   verified below), or a **fully offline Spotify data-export upload**.
2. **Accounts are unnecessary.** The site is static and should stay that way. The
   personal subgraph can live entirely in `localStorage` — no login, no server, no
   secrets. Nothing about the feature needs an identity beyond "this browser."

Everything else the feature needs — mapping artists to our genre nodes, lighting up the
listened subgraph, suggesting adjacent genres — runs on data we already have or can bake
at build time. **No part of the feature requires a backend.**

---

## 1. What the feature decomposes into

| Piece                             | Needs                                       | Status                     |
| --------------------------------- | ------------------------------------------- | -------------------------- |
| Get the user's listening history  | Some intake path (§2–4)                     | Solvable, three ways       |
| Map listened artists → our genres | A reverse index artist → genre ids (§5)     | New build-time artifact    |
| Show the listened subgraph        | Highlight/dim pass in the existing renderer | Straightforward            |
| Suggest genres to branch out into | Adjacency scoring over existing edges (§6)  | Data already in graph.json |
| Remember it between visits        | `localStorage` (§7)                         | No accounts needed         |

---

## 2. Spotify OAuth — technically alive, practically closed

The February 2026 purge did **not** remove the user-history endpoints. Per the
[official changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026),
`GET /me/top/{type}` (top artists/tracks, scope `user-top-read`) and
`GET /me/player/recently-played` are both listed under _endpoints still available_.
The Authorization-Code-with-PKCE flow needs no client secret, so a static site could
run the whole OAuth dance client-side — no backend required.

What kills it is access, not endpoints (all from `music-data-sources.md`, verified
2026-08-04):

- Development mode: **one client ID per developer, five users**, each manually added in
  the dashboard, and the app owner must hold an active Premium subscription.
- Extended quota mode: since May 2025, granted only to **registered organizations with
  an active 250k+ MAU service**. A hobby project has no path to it.

**Conclusion:** Spotify OAuth is viable only as a hidden "personal mode" for the owner
and ≤4 friends. It cannot be the public story. Worth keeping in mind as a dev
convenience; not worth building UI around.

---

## 3. ListenBrainz — the recommended bridge (verified)

ListenBrainz (already this project's popularity source) has a built-in
[Spotify import](https://blog.metabrainz.org/2018/10/30/import-your-listens-to-listenbrainz-from-spotify/):
a user links Spotify once in their ListenBrainz settings and their listens flow in
automatically from then on. It likewise imports from Last.fm/Libre.fm, so non-Spotify
listeners get the same feature for free.

Their stats API then hands us exactly what the feature needs. **Verified 2026-08-10:**

```
GET https://api.listenbrainz.org/1/stats/user/rob/artists?count=2&range=year
→ 200 OK
{"payload":{"artists":[
  {"artist_mbid":"8229a8f1-b315-4fae-af57-b3eb71efdaf4",
   "artist_name":"Carbon Based Lifeforms","listen_count":1569},
  {"artist_mbid":"1c70a3fc-fa3c-4be1-8b55-c3192db8a884",
   "artist_name":"Röyksopp","listen_count":859}], ... "total_artist_count":1439}}
```

- **No authentication, no API key** — public stats by MusicBrainz username.
- **CORS is open** — verified: `Access-Control-Allow-Origin: *`, so the browser can
  call it directly from the static site.
- **`artist_mbid` is included** — this maps _exactly_ onto the `Artist.mbid` values our
  pipeline already stores. No fuzzy name matching on this path.
- `range` supports `week/month/quarter/year/all_time` etc., `count` up to 100 per page
  with `offset` paging.

Caveats, also observed live:

- **Stats are precomputed and can be absent.** `mayhem` and `iliekcomputers` both
  returned `204 NO CONTENT` — a fresh account shows nothing until ListenBrainz's stats
  job runs (typically within a day). The UI must handle 204 as "come back tomorrow,"
  not as an error.
- `artist_mbid` is documented as optional; unmatched artists need a name fallback or
  get skipped.
- The user's UX is "make a free ListenBrainz account and link Spotify there" — one-time
  friction, but it's the honest trade for a keyless, serverless, ToS-clean pipeline,
  and it aligns with the MetaBrainz ecosystem the project already sits in.

---

## 4. Spotify data export — the zero-network fallback

Spotify's GDPR export (Account → Privacy → _Download your data_) includes
**extended streaming history**: a ZIP of ~12 MB JSON files, one object per playback,
with `master_metadata_album_artist_name`, `master_metadata_track_name`,
`spotify_track_uri`, `ms_played` and `ts`
([format reference](https://blog.ortham.net/posts/2024-12-21-spotify-streaming-history-part-1/)).

The app could accept that ZIP via drag-and-drop and parse it **entirely in the
browser** — no network call, nothing uploaded anywhere, works even for users who will
never make a ListenBrainz account. Caveats: Spotify takes up to ~30 days to deliver the
extended export (the basic export is faster but only covers the last year); the export
carries **no genre data and no MBIDs**, so matching is by normalized artist name
against our index — lossier than the MBID path but fine for "which genres do I listen
to." Aggregate by `ms_played` so one skipped track doesn't count like an anthem.

A good v1 ships ListenBrainz intake; the export drop is a natural v2 addition behind
the same internal interface (`(artistKey, weight)[]` in, regardless of source).

---

## 5. The missing artifact: an artist → genre reverse index

The runtime dataset can't answer "which genres does this artist belong to" today —
`GenreDetail` files are keyed genre → artists and only load one genre at a time. The
pipeline, however, already fetches **50 candidate artists per genre** in stage 4
(`SEARCH_LIMIT` in `scripts/build-dataset/config.ts`) before ranking down to 10. A new
emit in stage 8 can invert what stage 4 already has on disk:

```
public/data/artist-index.json
{ "<artist mbid>": { "n": "normalized name", "g": ["genre-id", ...] }, ... }
```

- **Size:** ≤ 912 × 50 = ~45k (artist, genre) pairs, fewer unique artists. Roughly
  2–3 MB raw, well under 1 MB gzipped. **Lazy-loaded only when the user activates the
  feature**, so `graph.json` stays under its 400 KB budget and cold first paint is
  untouched.
- MBID keys serve the ListenBrainz path exactly; the normalized name serves the export
  path. Trim to artists above a small listen floor if size ever matters.
- Coverage is honest by construction: an artist outside every genre's top-50 candidates
  simply doesn't light anything up. Expect the user's head and torso to match and the
  deep tail to miss — acceptable, and improvable later by raising `SEARCH_LIMIT`.

Types go in `src/types.ts` as always, so the shape binds pipeline and app.

---

## 6. "Genres to branch out into" needs no external API at all

This is the part that looked hardest and is actually already solved. `graph.json`
carries every `subgenre`, `fusion` and `influence` edge (drawn or not). Given the set
of listened genres with weights, a pure function can score every _unlistened_ genre by
adjacency: parents, children and siblings of listened genres, `fusion`/`influence`
neighbours (arguably the strongest "sounds adjacent" signal — it's literally what those
edges mean), boosted when multiple listened genres point at the same candidate.

Spotify's `/recommendations` and `/related-artists` endpoints — the API answer to this
question — were removed for new apps in Nov 2024 anyway. Our edge data is the
replacement, it's already shipped to every visitor, and the scorer is a pure,
unit-testable function per the project's testing convention.

---

## 7. No accounts, no backend

- **Persistence:** `localStorage` — the ListenBrainz username and/or parsed listening
  weights. Clearable with one button. A static site cannot hold a secret, and this
  design never asks it to.
- **Sharing** (optional, later): the personal state is small enough to encode in a URL
  the same way deep links already work.
- If cross-device sync ever becomes a real demand, that's the moment a Cloudflare
  Worker + KV enters the picture — not before, and not for v1 of this feature.

---

## 8. What this changes architecturally

One deliberate carve-out: **"network calls happen at build time only" gains a single
scoped exception** — `api.listenbrainz.org`, called from the browser, only on explicit
user action, with the 204/failure path degrading to "feature unavailable" (the map
itself never depends on it). The export-upload path needs no exception at all. Every
other principle survives untouched: the map stays identical for everyone (personal data
is a highlight/dim _lens_, exactly like the existing filter panel — never a layout
change), the dataset stays a committed artifact, and there are still no keys, no
accounts and no server.

Rough build order when picked up: artist-index emit in the pipeline → pure
match/suggest modules with tests → ListenBrainz intake UI → highlight lens in the
renderer → (later) export-ZIP drop.

---

## Sources

- [Spotify Web API Changelog — February 2026](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [Get User's Top Items — Spotify Web API](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks)
- `docs/research/music-data-sources.md` §1 — access-tier findings, verified 2026-08-04
- [ListenBrainz statistics API](https://listenbrainz.readthedocs.io/en/latest/users/api/statistics.html) — live-verified 2026-08-10 (CORS `*`, `artist_mbid` present, 204 behaviour)
- [Import your listens to ListenBrainz from Spotify — MetaBrainz blog](https://blog.metabrainz.org/2018/10/30/import-your-listens-to-listenbrainz-from-spotify/)
- [Spotify extended streaming history format](https://blog.ortham.net/posts/2024-12-21-spotify-streaming-history-part-1/)
