# Progress

**Current milestone: 7 — Keep it alive** (complete — v1 is live)

The weekly refresh workflow is live: Sundays 04:00 UTC, `refresh-data.yml` rebuilds
the dataset and opens a PR. Cold runs exceed the 6-hour job limit, so the Actions
cache doubles as cross-run resume, and scheduled runs prune only the volatile cache
(tree, counts, searches, rankings) while keeping stable id mappings (links, Deezer
ids) — steady state ≈ 2.5–3 h. The sharp-drop guard fails the run if the scrape
silently empties.

**v1 is shipped**: the repo went public on 2026-08-08 and the site deploys
automatically to GitHub Pages at <https://aakash-tir.github.io/genre-explorer/>.
Cloudflare Pages was not connected and is now the documented fallback
(`docs/runbooks/hosting.md`). Everything in `plan.md` v1 scope is built and merged.

**Shipped after v1:**

- **Personal lens** (`src/personal/`, PRs #28–#32) — a ListenBrainz username lights up
  the genres you listen to and suggests adjacent ones. Falls back to counting raw
  listens when ListenBrainz's stats pipeline lags, which it can do by weeks.
- **Spotify owner mode removed** (PR #35) — the OAuth intake was built, then deleted
  when the owner decided against registering a Spotify app. ListenBrainz is now the
  lens's only intake. Do not reinstate it.
- **Song links** (PR #37) — every track row links to Spotify (by search) and to its
  exact Deezer page. An exact per-song Spotify URL is impossible without API keys;
  evidence in `docs/research/music-data-sources.md` §4.

**Next:** the owner plans a UI pass. Known UI-adjacent backlog in `docs/future.md`:
megastar skew in popular-artist lists, singleton placement, non-Western coverage review.

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
