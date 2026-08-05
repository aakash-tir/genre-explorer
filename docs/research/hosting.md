# Research — Hosting the site

**Date:** 2026-08-04
**Decision it supports:** Cloudflare Pages, free tier, deployed from the private GitHub repo.

---

## What we need to host

After the build-time data pipeline runs, the deployable artifact is **entirely static**:
HTML, JS, CSS, and a set of JSON files. There is no server, no database, and no API route
— every external call (MusicBrainz, ListenBrainz, Deezer) happens in CI during the data
build, never at request time.

That means the only things that matter are: bandwidth, whether the free tier supports
deploying from a **private** repo, and build minutes.

## Options

|                      | Free bandwidth                  | Builds            | Private repo                                | Notes                             |
| -------------------- | ------------------------------- | ----------------- | ------------------------------------------- | --------------------------------- |
| **Cloudflare Pages** | **Unlimited** for static assets | 500/month         | Yes                                         | 300+ edge locations               |
| Netlify              | 100 GB/month                    | 300 build minutes | Yes                                         | Widest feature set                |
| Vercel               | 100 GB/month                    | —                 | Yes                                         | ToS caveats around commercial use |
| GitHub Pages         | 100 GB/month soft               | —                 | **No** — needs GitHub Pro for private repos | Free only for public repos        |

**GitHub Pages is disqualified outright**: the repo is private, and serving Pages from a
private repo requires a paid GitHub plan. That is the deciding constraint, before any
performance comparison.

**Cloudflare Pages wins on the remaining axis.** It is the only one of the three offering
unlimited free bandwidth on static assets, which matters here because the dataset JSON is
the bulk of the payload and is served to every visitor. Netlify's and Vercel's 100 GB caps
are generous but finite, and a graph explorer that gets shared could plausibly move real
traffic.

Sources:

- [Cloudflare Pages Pricing & Bandwidth Limits 2026](https://www.devtoolreviews.com/reviews/cloudflare-pages-pricing-bandwidth-limits-2026)
- [Vercel vs Netlify vs Cloudflare Pages Pricing 2026](https://www.devtoolreviews.com/reviews/vercel-vs-netlify-vs-cloudflare-pages-pricing-comparison-2026)
- [Best Free Static Site Hosting: 8 Options Compared (2026)](https://htmlpub.com/blog/static-site-hosting-comparison-2026)

---

## Payload budget

The dataset ships to the browser, so its size is a hosting concern as much as a data one.

At ~1,000 genres with 20 entries each (5 popular songs, 5 obscure songs, 5 popular
artists, 5 small artists), plus names, links and coordinates, an uncompressed estimate is
roughly **3–6 MB**. That is too much to block first paint on.

The mitigation, which shapes the data format:

- **`graph.json`** — nodes (id, name, coordinates, popularity, colour family, depth) and
  structural edges only. This is what the map needs to render. Target: **under 400 KB**
  before gzip.
- **`genres/<id>.json`** — one file per genre holding its songs, artists and links.
  Fetched lazily when a node is focused, then cached in memory.

The map paints from one small file; the panel content arrives on demand. Cloudflare's
edge cache makes the per-genre fetches effectively free after the first request.

This split is a hosting-driven constraint on the data pipeline, so it is recorded in the
plan as part of the architecture rather than left as an optimisation for later —
retrofitting it would mean rewriting both the build script and the loader.

---

## Deployment

Cloudflare Pages connects directly to the GitHub repo and builds on push. Configuration:

- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main` (which is protected, so deploys only follow merged PRs)
- Preview deployments on PR branches — useful, since a visual change is hard to review
  from a diff

The Cloudflare account and the repo connection are a manual, one-time setup step by the
repo owner. It is recorded as an open item in `plan.md` rather than something this
scaffold can do.
