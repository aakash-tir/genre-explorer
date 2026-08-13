# Genre Explorer

An interactive map of recorded music. Every genre is a node on a zoomable constellation,
sized by how much music exists in it. Nodes connect to their subgenres, so you can start
at something you know and drift outward into things you don't. Click a genre and a panel
opens with five popular songs, five obscure ones, five well-known artists and five small
ones — each linking out to where the music lives, with a 30-second preview you can play
in place.

Optionally, type a ListenBrainz username and the map lights up the genres you already
listen to, plus the ones next door worth trying.

Strictly music. Nothing else.

> **Status: v1 shipped and live** at <https://aakash-tir.github.io/genre-explorer/>.
> All seven milestones in `plan.md` are built and merged: 912 genres survive the
> threshold filter, the dataset rebuilds itself weekly by PR, and the personal lens
> is in. Open work lives in [`docs/future.md`](docs/future.md).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Commands

| Command                 | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Vite dev server                                                  |
| `npm test`              | Run the test suite once                                          |
| `npm run test:watch`    | Tests in watch mode                                              |
| `npm run typecheck`     | `tsc --noEmit` across app, tests and pipeline                    |
| `npm run lint`          | ESLint                                                           |
| `npm run format`        | Prettier, writing changes                                        |
| `npm run verify`        | **The full gate CI runs** — lint, format, typecheck, test, build |
| `npm run build`         | Production build to `dist/`                                      |
| `npm run build:dataset` | Rebuild `public/data/` from upstream (~3 h warm, disk-cached)    |

`build:artist-index` re-runs pipeline stage 9 alone — it inverts the committed detail
files into the personal lens's reverse index and touches no network.

Run `npm run verify` before opening a PR — it is exactly what CI checks.

## How it works

Two halves that never talk to each other at runtime.

**Build time.** A TypeScript pipeline in `scripts/build-dataset/` pulls from MusicBrainz
(the genre hierarchy, artists, recordings and streaming links), ListenBrainz (listen
counts, which give the popular-versus-obscure split) and Deezer (30-second previews). It
runs a `d3-force` layout, bakes the coordinates in, and writes static JSON to
`public/data/`. It runs weekly in GitHub Actions and opens a PR with the result.

**Runtime.** A static React app that loads its own JSON. No server, no database, no API
keys. The map cannot break because an upstream service is down, and the layout is
identical on every visit — which matters, because the whole product depends on you
learning where things are.

There is exactly one exception to "no other network calls": the personal lens
(`src/personal/`) fetches a ListenBrainz user's top artists when you ask it to, matches
them against a baked artist→genre index, and highlights your genres. It is
user-initiated, it degrades to "feature unavailable", and the map never depends on it.

A full code-level walkthrough is in
[`docs/how-it-works.md`](docs/how-it-works.md); the architecture diagram is in
[`docs/architecture/`](docs/architecture/).

### Notable constraint: Spotify is a link target, not a data source

As of February 2026 the Spotify Web API removed artist-top-tracks, browse and batch
endpoints, capped search results at 10, requires the app owner to hold Premium, allows
five users in development mode, and only grants extended quota to organisations with
250k+ monthly active users. None of that is available to a project like this. Spotify
appears here purely as an outbound link — sourced, ironically, from MusicBrainz.

That constraint has a visible consequence. **Artist** links are canonical URLs from
MusicBrainz. **Song** links are not: MusicBrainz records streaming URLs on artists but
effectively never on recordings, so each song gets a Spotify _search_ link plus its exact
Deezer page. Both free routes to an exact per-song Spotify URL were probed and failed —
the evidence is in
[`docs/research/music-data-sources.md`](docs/research/music-data-sources.md) §4.

The full write-up, with every claim verified against a live request, is in
[`docs/research/music-data-sources.md`](docs/research/music-data-sources.md).

## Layout

```
src/graph/        the rules that decide what is on screen (pure, tested)
  edges.ts          which edges are drawn — fusion genres are never connected
  lod.ts            level of detail: zoom, focus, filter
  colors.ts         family hue, depth gradient
src/panel/        the detail panel — songs, artists, links, previews
src/filters/      the filter panel — search, chips, hide-the-rest
src/personal/     the personal lens — ListenBrainz intake, matching, suggestions
src/lib/          dataset loading, deep links, derived song links
scripts/build-dataset/   the pipeline — nine stages, disk-cached
public/data/      the committed dataset artifact — never hand-edit
tests/            mirrors src/
docs/how-it-works.md     end-to-end walkthrough of the whole system
docs/architecture/       the architecture diagram
docs/research/    why each decision beat the alternatives
docs/runbooks/    operational procedures (hosting, CI, branch protection)
docs/future.md    the backlog
logs/             dated record of what changed and why
```

## Contributing

`main` is protected — everything lands through a green PR. See `.claude/CLAUDE.md` for
the full working agreement.

## Data sources and credit

- [MusicBrainz](https://musicbrainz.org/) — genre hierarchy, artists, recordings,
  streaming links. Core data is CC0. Requests respect the 1 req/s rate limit.
- [ListenBrainz](https://listenbrainz.org/) — listen counts.
- [Deezer](https://developers.deezer.com/) — 30-second previews.
- [Every Noise at Once](https://everynoise.com/) — not used as a source, but the
  inspiration for the whole idea.
