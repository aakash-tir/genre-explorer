# Progress

**Current milestone: 7 — Keep it alive** (complete — v1 is live)

The refresh is a DAILY rolling rotation (PR #47, 2026-08-19), not the weekly job this
file used to describe: `refresh-data.yml` rebuilds the 66 least-recently-refreshed
genres at 04:00 UTC and auto-merges the PR once `verify` is green, turning the whole
map over in a fortnight. Sundays also rebuild the graph, which cannot be sharded. It
works — PRs #52–#70 merged unattended through September. The sharp-drop guard still
fails the run if the scrape silently empties.

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

**Refresh reliability (2026-09-21):** the rotation was losing ~1 day in 3 — always one
transient upstream error aborting the whole shard. A failed genre now fails only itself
and is retried by the queue next day; see `docs/runbooks/dataset-refresh.md`.

**Next:** the owner plans a UI pass. Known UI-adjacent backlog in `docs/future.md`:
megastar skew in popular-artist lists, singleton placement, non-Western coverage review.

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
