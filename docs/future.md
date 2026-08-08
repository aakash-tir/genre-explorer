# Future

Backlog. Dated bullets under the matching section. Remove an item when it's complete —
`logs/` and the PR history are the record of finished work.

## Deferred from v1

- 2026-08-04 — Genre similarity edges beyond the parent/child tree ("sounds like")
- 2026-08-04 — User accounts, saved exploration paths, favourites
- 2026-08-04 — Playlist export
- 2026-08-04 — Artist-level or track-level nodes (the map is genres only in v1)
- 2026-08-04 — Timeline / decade view of when genres emerged
- 2026-08-04 — `influenced by` edges as a visible, user-toggleable layer

## Known gaps

- 2026-08-07 — 28% of ranked tracks have no Deezer match, so no preview (play
  button absent, links remain). Mostly deep cuts Deezer doesn't carry; acceptable.
- 2026-08-07 — Deezer preview URLs expire in ~12 min (verified live), so previews
  are the widget player embedded by stable track id — remove the old "preview MP3
  in the dataset" wording from research docs if it resurfaces.

- 2026-08-06 — `public/data/genres/` still holds only the hand-written `techno.json`
  sample. The real detail files come from pipeline stages 4–6 (milestone 4); until
  then every other node would open to a 404. `graph.json` itself is real as of
  milestone 2.
- 2026-08-07 — Click-to-focus and the radial child fan are not built (milestone 4);
  the canvas ignores clicks entirely. Touch was not exercised on a real device —
  `d3-zoom` pinch should work via the pointer-events path, verify in milestone 6.
- 2026-08-04 — No end-to-end browser tests. Deliberate for v1; revisit if interaction
  bugs start reaching `main`.
- 2026-08-07 — **Cloudflare Pages connection is the only thing between here and a
  shipped v1.** Manual, owner-only: follow `docs/runbooks/hosting-cloudflare-pages.md`.
- 2026-08-07 — The first scheduled refresh runs with a cold Actions cache and may
  time out once or twice before the cache fills (the run resumes; see
  `refresh-data.yml`). Expect the first automated data PR to take a couple of
  Sundays or a few manual dispatches.
- 2026-08-04 — **`main` has no server-side protection.** Both the branch-protection and
  rulesets APIs returned `403 Upgrade to GitHub Pro` — they are paid-plan features on
  private repos. Verified: `branches/main --jq '.protected'` → `false`. The local
  `protect-main` hook still blocks direct commits from Claude Code sessions, and CI still
  runs, but a plain `git push origin main` from a terminal will succeed and a red CI run
  cannot block a merge. Fix by making the repo public (free, and nothing here is secret)
  or upgrading to Pro. See `docs/runbooks/ci-and-branch-protection.md`.

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
