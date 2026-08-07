# Progress

**Current milestone: 4 — Focus and the panel** (complete)

The core loop works end to end: click a genre (or open `/genre/<id>`) → camera flies
to it, focus ring, children fan onto a ring (pure `fan.ts`, rendering transform
only) → the right-hand panel lazy-loads `public/data/genres/<id>.json` and shows
5 popular + 5 obscure songs and 5 popular + 5 small artists with outbound links.
Pipeline stages 4–5 are real (tag search → ListenBrainz bulk ranking → url-rels for
chosen artists); the committed dataset covers all 912 genres with zero thin panels.
Obscure floor: 100 listens. Track links and previews are milestone 6 (Deezer).

**Next: milestone 5 — Find your way around.** Left filter panel: search by name,
multi-select, hide-everything-else (the pure `resolveFilter` logic already exists in
`lod.ts`); deep links already carry `?filter=`. Then milestone 6: Deezer previews +
audio player, touch/mobile, motion polish.

Milestones are listed in `plan.md`. Open work is in `docs/future.md`.
