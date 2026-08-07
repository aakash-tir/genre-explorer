# Progress

**Current milestone: 2 — The hierarchy** (complete)

`scripts/build-dataset/` stages 1–3 are real: genre list, HTML hierarchy scrape
(fixture-tested parser), release-group counts, threshold filter, deterministic seeded
layout, guarded emit. `public/data/graph.json` now holds the real MusicBrainz tree:
912 genres, 733 drawn edges, 179 family roots, 242.8 KB. Threshold decided at 50
release-groups; multi-parent children keep their most popular parent (extras demoted to
associative `influence`); orphans stay floating family roots.

**Next: milestone 3 — The map renders.** Canvas renderer drawing nodes, structural
edges, colours and depth gradients; `d3-zoom` scroll and pan; level of detail. Start at
`src/graph/` — the pure rules (`lod.ts`, `colors.ts`, `edges.ts`) are already tested;
the canvas component is the stub. Open question for this milestone: 179 families is too
many hues — 131 of them are isolated singletons (see `docs/future.md`).

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
