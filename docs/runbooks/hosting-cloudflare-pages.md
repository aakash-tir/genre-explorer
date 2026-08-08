# Hosting: Cloudflare Pages

The app is a fully static site (`npm run build` → `dist/`). Cloudflare Pages was
chosen for unlimited free static bandwidth on a private repo
(`docs/research/hosting.md` has the comparison).

## One-time setup (repo owner, manual — cannot be automated from here)

1. Log in at <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Authorize the GitHub app for `aakash-tir/genre-explorer` and select the repo.
3. Build settings:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** none. The app has no secrets — a static site cannot
     hold one.
4. Save and deploy. Every merge to `main` (including the weekly dataset PR, once
   merged) redeploys automatically; PRs get preview URLs.

## Things to check on first deploy

- Deep links: open `/genre/techno` directly — Pages serves `index.html` for unknown
  paths on single-page apps by default; if it 404s instead, add a `_redirects` file
  with `/* /index.html 200` to `public/`.
- `data/graph.json` loads (Network tab: one fetch, ~240 KB) and the map paints.
- A `/genre/<id>` click loads exactly one `data/genres/<id>.json`.

## Costs and limits

Free plan: unlimited static requests/bandwidth, 500 builds/month — a weekly data
PR plus normal development is nowhere near that.
