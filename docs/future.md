# Future

Backlog. Dated bullets under the matching section. Remove an item when it's complete —
`logs/` and the PR history are the record of finished work.

## Deferred from v1

- 2026-08-10 — Personal lens, third intake path: a client-side Spotify GDPR-export
  upload (ZIP drag-and-drop, parsed in-browser, name-matched) for visitors who
  won't make a ListenBrainz account. Slots behind the same `ListenedArtist[]`
  interface the matcher uses. Findings: `docs/research/listening-history-personalization.md` §4.
- 2026-08-10 — Artist-index coverage: matching only sees the ~6.5k panel artists
  (top-50 candidates per genre). If personal matching feels thin, emit the index
  from a wider candidate pool (raise `SEARCH_LIMIT` or index all ranked candidates,
  not just the kept 20).
- 2026-08-04 — Genre similarity edges beyond the parent/child tree ("sounds like")
- 2026-08-04 — User accounts, saved exploration paths, favourites
- 2026-08-04 — Playlist export
- 2026-08-04 — Artist-level or track-level nodes (the map is genres only in v1)
- 2026-08-04 — Timeline / decade view of when genres emerged
- 2026-08-04 — `influenced by` edges as a visible, user-toggleable layer

## Known gaps

- 2026-08-12 — Song rows link to Spotify by SEARCH, not to the track's own page,
  because no free route to an exact per-song Spotify URL exists. Probed live:
  MusicBrainz `recording?inc=url-rels` returned zero URL relations for four real
  dataset tracks (artist-level coverage is ~68%; recording-level is ~0), and
  Odesli/song.link resolves a Deezer track to Amazon/Tidal/Napster/Anghami/
  Boomplay/Yandex but omits Spotify from its unauthenticated tier — confirmed
  against a global #1 single. An exact link needs Spotify's authenticated API,
  i.e. a client secret in the pipeline, which the no-keys rule forbids. Revisit
  only if that rule changes. Deezer links ARE exact (stage 6 already has the id).
- 2026-08-07 — 28% of ranked tracks have no Deezer match, so no preview (play
  button absent, links remain). Mostly deep cuts Deezer doesn't carry; acceptable.
- 2026-08-07 — Deezer preview URLs expire in ~12 min (verified live), so previews
  are the widget player embedded by stable track id — remove the old "preview MP3
  in the dataset" wording from research docs if it resurfaces.

- 2026-08-07 — Touch was not exercised on a real device. Mobile layout landed in
  milestone 6 and `d3-zoom` speaks touch via the pointer-events path, but pinch,
  tap-to-focus and the panel on a real phone remain unverified.
- 2026-08-04 — No end-to-end browser tests. Deliberate for v1; revisit if interaction
  bugs start reaching `main`.
- 2026-08-08 — Hosting is GitHub Pages (repo went public, removing its only
  disqualifier). Cloudflare Pages remains the documented fallback if the 100 GB/month
  soft bandwidth cap or the /genre-explorer/ sub-path ever becomes a problem —
  `docs/runbooks/hosting.md`.
- 2026-08-07 — The first scheduled refresh runs with a cold Actions cache and may
  time out once or twice before the cache fills (the run resumes; see
  `refresh-data.yml`). Expect the first automated data PR to take a couple of
  Sundays or a few manual dispatches.

## Decisions still open

- 2026-08-07 — "Obscure" floor set at 100 listens (`OBSCURE_MIN_LISTENS`) in
  milestone 4 — deeper cuts land in the 100–500 listen band, which reads right.
  Revisit only if user feedback says the band is too thin or too noisy.
- 2026-08-07 — Popular-artist lists skew to global megastars: ranking is by TOTAL
  artist listens, so anyone ever tagged `house` (e.g. Britney Spears) can outrank
  genuine house artists. Genre-scoped listen counts don't exist in ListenBrainz's
  API; mitigations would be heuristic (e.g. weight by tag count). Assess after
  living with it.
- 2026-08-04 — Whether the long tail leaves non-Western genre families looking thin after
  the threshold filter. Review now that the filtered dataset exists (912 of 2,184 kept).

## Upstream watch

- 2026-08-04 — ListenBrainz `GET /1/popularity/top-recordings-for-artist/{mbid}` and
  `top-release-groups-for-artist/{mbid}` return **500** despite being documented. The
  pipeline uses the POST endpoints instead. Recheck — fixing this would simplify stage 5.
- 2026-08-04 — MusicBrainz genre relationships are unavailable from the JSON API
  (`inc=genre-rels` is accepted but returns nothing). We scrape the HTML pages. If the
  API ever exposes them, drop the scraper.
- 2026-08-04 — MusicBrainz HTML layout changes will break the stage 2 parser. Fixture
  tests catch it; the 7 GB `mbdump.tar.bz2` import is the documented fallback.

## Scaling

- 2026-08-04 — If the graph ever exceeds ~10k nodes, revisit Canvas 2D vs. Sigma.js
  (WebGL). At 800–1,200 nodes Canvas is comfortably faster to develop against.
- 2026-08-04 — `graph.json` must stay under ~400 KB pre-gzip. If it grows, split by
  genre family and load families on demand.
