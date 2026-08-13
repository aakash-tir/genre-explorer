# Genre Explorer

An interactive, zoomable map of music genres. Genres are nodes sized by how much music
exists in them, connected to their subgenres. Clicking one opens a panel with popular and
obscure songs and artists, linking out to Spotify/SoundCloud/Bandcamp, with 30-second
previews. Strictly music — nothing else.

See `@.claude/project-context.md` for the full architecture and known gaps.
See `plan.md` for scope, milestones and the tech-stack rationale.

## Tech stack

- **App:** React 19 + TypeScript + Vite 8
- **Rendering:** Canvas 2D drawn by hand, camera via `d3-zoom`. **Not** a graph library —
  per-node radial gradients and zoom level-of-detail are the point, and a library would
  fight them. Sigma.js/react-force-graph were considered and rejected (`docs/research/graph-rendering.md`).
- **Layout:** `d3-force`, run **offline at build time**. Coordinates are baked into
  `graph.json`. The browser never runs a simulation — the map must be identical on every
  visit or spatial memory breaks.
- **Data pipeline:** TypeScript on Node via `tsx`, in `scripts/build-dataset/`
- **Data sources:** MusicBrainz (hierarchy, artists, recordings, streaming links),
  ListenBrainz (listen counts), Deezer (preview MP3s). All free, no API keys.
- **Validation:** Zod, at build time and on load
- **Tests:** Vitest + Testing Library
- **Hosting:** Cloudflare Pages (static)

## Conventions

- **Testing:** `npm test` (watch: `npm run test:watch`). The full local gate — the same
  checks CI runs — is `npm run verify` (lint + typecheck + test + build). Run it before
  opening a PR.
- **Pure logic is tested; rendering is not.** Anything deciding _what_ appears on screen
  (`src/graph/edges.ts`, `lod.ts`, `colors.ts`, `src/lib/deepLink.ts`, the dataset schema)
  is a pure function with unit tests. Canvas drawing code is verified by looking at it.
  Keep new decision logic pure and out of the render loop so it stays testable.
- **Layout:** `src/graph/` rendering and visibility rules · `src/panel/` detail panel ·
  `src/filters/` filter panel · `src/lib/` shared helpers · `scripts/build-dataset/`
  pipeline · `tests/` mirrors the source layout.
- **Types are shared** between the pipeline and the app (`src/types.ts`). A dataset shape
  change must fail `tsc` on both sides. Never redeclare the dataset shape in the pipeline.
- **The dataset is a committed artifact.** `public/data/` is checked in, produced by the
  pipeline, refreshed via PR. Never hand-edit it.
- **Network calls happen at build time only.** Nothing in `src/` may call MusicBrainz
  or Deezer at runtime. The app fetches its own static JSON and nothing else — with
  ONE scoped exception: the personal lens (`src/personal/`) may call
  `api.listenbrainz.org` (public path), user-initiated only, degrading to
  "feature unavailable". The map itself must never depend on it.
- **Respect MusicBrainz's 1 req/s rate limit** and always send the project `User-Agent`
  with contact info. Pipeline responses are disk-cached so reruns don't re-fetch.
- **Edge rule:** only `subgenre of` edges are ever drawn. `fusion of` and `influenced by`
  live in the dataset and affect focus behaviour, never rendering. See `src/graph/edges.ts`.

## Git workflow (required)

This repo has a GitHub remote, so `main` is protected:

- **Never commit directly to `main`** and never merge into it locally. All changes
  land on a branch and reach `main` only through a GitHub pull request.
- Enforced locally by `.claude/hooks/protect-main.sh` (wired as a PreToolUse hook in
  `.claude/settings.json`), which denies `git commit`/`git merge`/`git push` against
  `main`.
- Workflow: branch → commit → push the branch → open a PR → merge the PR → pull `main`.

## After every PR merge (required)

Two artifacts must be kept current, together:

1. **Knowledge graph** — run `graphify update .` and commit the refreshed
   `graphify-out/` (fold it into the next docs-sync commit/PR).
2. **Architecture diagram** — update `docs/architecture/architecture-diagram.html`
   whenever the merged PR changed the architecture: components, stages,
   data stores/collections, external services, flows, schedules, or
   retention rules. Use the `architecture-diagram` skill's MANUAL
   workflow (hand-placed layout per its design system) and verify the
   render with a headless-browser screenshot before committing —
   auto-generated output is a draft scaffold only. Docs-only or purely
   cosmetic merges don't need a diagram update, but say so in the
   changelog entry.

Both artifacts may be empty or absent on a brand-new project. The first merge that
introduces real structure is the one that creates them.

## Backlog (required)

All future work — bugs, known gaps, feature ideas, scaling items — is recorded in
`docs/future.md` (dated bullet under the matching section). When you find or defer an
issue, add it there; when one is COMPLETE, remove it — `logs/` and the PR history are
the record of finished work (no Done section).

`docs/review/` is a staging area for items parked for a single review session: the
full write-up with evidence lives there, and its `docs/future.md` bullet links to it.
`docs/future.md` stays the backlog of record — never park something in `docs/review/`
without leaving a bullet behind. See `docs/review/README.md`.

## Where things belong (required)

- `.claude/` — everything Claude reads: `CLAUDE.md`, `project-context.md`,
  `progress.md`, `rules/`, project agents and skills, settings and hooks.
- `docs/` — everything a person reads: `architecture/`, `future.md`, `plans/`,
  `research/`, `runbooks/`, `history/`.
- `logs/` — the dated record (below).
- The repo root stays clean: only `CLAUDE.md`, `README.md`, `plan.md`, and the
  language's required root files.

If Claude must load it to work correctly it goes in `.claude/`; if a person reads it to
understand or operate the project it goes in `docs/`. When both are true, the full
version lives in `docs/` and `.claude/CLAUDE.md` points at it.

## Change log (required)

Every day that content is added, there is exactly **one** log file: `logs/YYYY-MM-DD.md`.
Check whether today's file exists; create it if missing, append to it otherwise. Never a
file per change, never one growing log. A day with no changes has no file.

Each entry is a `##` heading naming what was done, followed by:
**What we did** · **The reason** (root cause, for fixes) · **How it was solved**.

Write the reasoning, not the diff — git already has the code. For a fix, include the
evidence that identified the root cause (traceback, version pin, timeline). Say
explicitly when a change was docs-only or cosmetic and needed no diagram update.

## Don't commit secrets

Keep `.env`, credentials, and tokens gitignored. Never hardcode API keys in source.
