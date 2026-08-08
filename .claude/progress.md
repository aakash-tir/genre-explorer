# Progress

**Current milestone: 7 — Keep it alive** (code complete — v1 pending one manual step)

The weekly refresh workflow is live: Sundays 04:00 UTC, `refresh-data.yml` rebuilds
the dataset and opens a PR. Cold runs exceed the 6-hour job limit, so the Actions
cache doubles as cross-run resume, and scheduled runs prune only the volatile cache
(tree, counts, searches, rankings) while keeping stable id mappings (links, Deezer
ids) — steady state ≈ 2.5–3 h. The sharp-drop guard fails the run if the scrape
silently empties.

**v1 ships when the repo owner connects Cloudflare Pages** — a manual dashboard
step, documented in `docs/runbooks/hosting-cloudflare-pages.md`. Everything else in
`plan.md` v1 scope is built and merged.

**After v1:** the owner plans a UI pass. Known UI-adjacent backlog in
`docs/future.md`: megastar skew in popular-artist lists, singleton placement,
non-Western coverage review.

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
