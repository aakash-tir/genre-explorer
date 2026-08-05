# Genre Explorer

An interactive map of recorded music. Every genre is a node on a zoomable constellation,
sized by how much music exists in it. Nodes connect to their subgenres, so you can start
at something you know and drift outward into things you don't. Click a genre and a panel
opens with five popular songs, five obscure ones, five well-known artists and five small
ones — each linking out to Spotify, SoundCloud or Bandcamp, with a 30-second preview you
can play in place.

Strictly music. Nothing else.

> **Status: milestone 1 — skeleton.** The plan, the data pipeline design, the rules that
> govern the map, and the test suite are real. The canvas renderer, the panels and the
> pipeline itself are stubs. See `plan.md` for the milestones.

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
| `npm run build:dataset` | Rebuild `public/data/` from upstream (milestone 2)               |

Run `npm run verify` before opening a PR — it is exactly what CI checks.

## How it works

Two halves that never talk to each other at runtime.

**Build time.** A TypeScript pipeline in `scripts/build-dataset/` pulls from MusicBrainz
(the genre hierarchy, artists, recordings and streaming links), ListenBrainz (listen
counts, which give the popular-versus-obscure split) and Deezer (30-second previews). It
runs a `d3-force` layout, bakes the coordinates in, and writes static JSON to
`public/data/`. It runs weekly in GitHub Actions and opens a PR with the result.

**Runtime.** A static React app that loads its own JSON and makes no other network calls,
ever. No server, no database, no API keys. The map cannot break because an upstream
service is down, and the layout is identical on every visit — which matters, because the
whole product depends on you learning where things are.

### Notable constraint: Spotify is a link target, not a data source

As of February 2026 the Spotify Web API removed artist-top-tracks, browse and batch
endpoints, capped search results at 10, requires the app owner to hold Premium, allows
five users in development mode, and only grants extended quota to organisations with
250k+ monthly active users. None of that is available to a project like this. Spotify
appears here purely as an outbound link — sourced, ironically, from MusicBrainz.

The full write-up, with every claim verified against a live request, is in
[`docs/research/music-data-sources.md`](docs/research/music-data-sources.md).

## Layout

```
src/graph/        the rules that decide what is on screen (pure, tested)
  edges.ts          which edges are drawn — fusion genres are never connected
  lod.ts            level of detail: zoom, focus, filter
  colors.ts         family hue, depth gradient
src/lib/          dataset loading, deep links
scripts/build-dataset/   the pipeline (milestone 2)
public/data/      the committed dataset artifact — never hand-edit
tests/            mirrors src/
docs/research/    why each decision beat the alternatives
docs/future.md    the backlog
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
