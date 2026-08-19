# Runbook — the rolling dataset refresh

`public/data/` is rebuilt from MusicBrainz, ListenBrainz and Deezer by
`.github/workflows/refresh-data.yml`. It runs **every day at 04:00 UTC** and lands its
work the same day.

## What runs when

| When      | What                                                                       | Cost                |
| --------- | -------------------------------------------------------------------------- | ------------------- |
| Every day | The **66 least-recently-refreshed genres'** detail panels                  | ~5 min steady state |
| Sundays   | The above, plus the **graph** (stages 1–3: which genres exist, node sizes) | ~80 min             |

912 genres ÷ 66 = a **14-day rotation**, so no genre is ever more than a fortnight stale.

Every run leaves `public/data/` complete and valid. Only the _age_ of a genre varies,
never whether it is there — which is the point. A design that accumulated a fortnight of
work on a branch would have meant the live site serving stale data for that fortnight.

## The queue has no cursor

"Which genres are due" is `refreshedAt` in each detail file, sorted ascending. That is
the whole mechanism, and it is deliberately derived rather than stored:

- a genre new to the map has no file, so it sorts first and is built immediately
- a genre dropped from the map leaves the queue by disappearing
- a day that fails corrupts nothing — those genres are still the oldest tomorrow
- a corrupt detail file fails validation, counts as never-refreshed, and repairs itself

There is no state to reconcile and nothing to reset by hand.

## It merges itself

The daily PR auto-merges once `verify` is green. This is the one place in the project
where data reaches `main` without a human reading it, and it is deliberate: a day spent
waiting for review is a day the rotation stalls. The gate is the pipeline's sharp-drop
guard plus the full test suite, and a bad slice can only reach the ~66 genres it touched.

## No post-merge chores

The project's post-PR-merge rule (refresh the knowledge graph, update the architecture
diagram) does **not** apply to these PRs. They touch only `public/data/**`, which
`graphify` reports as producing zero nodes — a data refresh cannot move the code graph —
and they are the same pipeline on its schedule writing its usual output, so the
architecture is unchanged. They also merge unattended, so there would be no session in
which to do the chore. See `.claude/CLAUDE.md`.

This covers the daily rotation only. Changing the pipeline itself is a normal merge.

## Setup this depends on

- **`REFRESH_PAT`** — a fine-grained PAT with `Contents: write` and
  `Pull requests: write` on this repo, saved as a repository secret.

  This is not optional, and the workflow fails loudly on day one without it. A PR opened
  with the default `GITHUB_TOKEN` does **not** trigger other workflows — GitHub suppresses
  that to prevent recursion — so `verify`, which is a _required_ check on `main`, would
  never run. The PR would be permanently unmergeable and the rotation would stall
  immediately. A PAT makes the PR author an identity whose events do start workflows.

- **Auto-merge enabled on the repository** (`allow_auto_merge`). Enabled 2026-08-19.

## Manual control

`workflow_dispatch` takes two inputs:

- `mode` — `details` (default), `graph`, or `both`
- `shard_size` — override the number of genres; blank uses `SHARD_SIZE`

A manual dispatch does **not** prune the volatile cache, so it can reuse what is already
there — that is what makes it useful for repairing a bad day rather than re-fetching
everything.

To rebuild everything locally, `npm run build:dataset` with no flags still does the full
job, graph included.

## History: why it looks like this

The refresh used to be a single weekly job that rebuilt all 912 genres, and it **never
once succeeded**.

A cold build is ~14,010 MusicBrainz requests. At the 1 req/s this project is bound to,
that alone is 4.3 h — and the pipeline then awaited Deezer's 6–30 s over-quota backoffs
in series with it, so MusicBrainz sat idle through every one. Measured on the 2026-08-16
run: 325 of 913 genres in 5 h 50 m, then cancelled at the job ceiling.

The cancellation is what made it unrecoverable. The workflow's own comment claimed the
pipeline cache "is saved to the Actions cache even when the job fails or times out, so a
rerun continues where the last one stopped." That is not true of a **cancelled** job: the
`actions/cache` post-step is killed with everything else. `gh cache list` showed no
`build-dataset-*` entry at all. So every week started cold, reached about a third, and
saved nothing — and the documented remedy, a manual re-dispatch, could not help either,
because there was never anything to resume from.

Two changes fixed it: work in daily slices small enough that no run is ever near a
ceiling, and overlap the three upstreams (their per-host queues in `http.ts` keep each
service's own rate limit intact regardless) so Deezer's backoffs no longer idle
MusicBrainz.
