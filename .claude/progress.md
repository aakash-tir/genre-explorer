# Progress

**Current milestone: 6 — Make it enjoyable** (complete)

Previews play: stage 6 resolves each ranked track to a stable Deezer track id (72%
coverage — preview URLs themselves expire in ~12 min and can't be baked), and the
panel embeds Deezer's widget player on demand. Mobile works: full-bleed map,
overlay filter, bottom-sheet panel; pinch/tap via d3-zoom. Colour families are
popularity-ranked around the golden angle (rock/electronic collision fixed) and
the 131 singleton roots share a muted neutral.

**Next: milestone 7 — Keep it alive.** The weekly refresh GitHub Actions workflow
(build:dataset on schedule → PR with the refreshed dataset, sharp-drop guard as the
gate) and Cloudflare Pages hosting. NOTE: connecting the Cloudflare Pages account to
the repo is a manual, owner-only step (`docs/future.md`).

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
