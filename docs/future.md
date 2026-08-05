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

- 2026-08-04 — `public/data/` holds a hand-written sample dataset, not real data.
  Replaced in milestone 2.
- 2026-08-04 — `scripts/build-dataset/` is a stub. The whole pipeline is milestone 2+.
- 2026-08-04 — The Canvas renderer is a stub. Milestone 3.
- 2026-08-04 — No end-to-end browser tests. Deliberate for v1; revisit if interaction
  bugs start reaching `main`.
- 2026-08-04 — Cloudflare Pages account and repo connection not set up (manual, owner).
- 2026-08-04 — **`main` has no server-side protection.** Both the branch-protection and
  rulesets APIs returned `403 Upgrade to GitHub Pro` — they are paid-plan features on
  private repos. Verified: `branches/main --jq '.protected'` → `false`. The local
  `protect-main` hook still blocks direct commits from Claude Code sessions, and CI still
  runs, but a plain `git push origin main` from a terminal will succeed and a red CI run
  cannot block a merge. Fix by making the repo public (free, and nothing here is secret)
  or upgrading to Pro. See `docs/runbooks/ci-and-branch-protection.md`.

## Decisions still open

- 2026-08-04 — Exact data threshold in pipeline stage 3: release-group count, artist
  count, or both. Decide from real numbers in milestone 2.
- 2026-08-04 — Orphan genres with no `subgenre of` parent: one synthetic root or several
  floating families. Decide once the tree exists.
- 2026-08-04 — Definition of the "obscure" band. The bottom decile of listen counts is
  mostly data artifacts (1 listen, 1 user), not hidden gems. Tune in milestone 4.
- 2026-08-04 — Number of colour families, and whether that many distinct hues stays
  readable. Decide in milestone 3.
- 2026-08-04 — Whether the long tail leaves non-Western genre families looking thin after
  the threshold filter. Review after milestone 2.

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
