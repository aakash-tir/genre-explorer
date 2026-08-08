# Hosting

**Live site: <https://aakash-tir.github.io/genre-explorer/>** — GitHub Pages,
deployed by `.github/workflows/deploy-pages.yml` on every merge to `main`.

## How the GitHub Pages deploy works

- The repo went public on 2026-08-08, which removed GitHub Pages' only
  disqualifier from `docs/research/hosting.md` (private repos need a paid plan).
- The workflow builds with `--base=/genre-explorer/`; the app resolves data URLs
  (`src/lib/dataset.ts`) and deep links (`stripBase`/`withBase` in
  `src/lib/deepLink.ts`) against `import.meta.env.BASE_URL`, so the same code runs
  at the domain root in dev.
- `404.html` is a copy of `index.html` — GitHub Pages serves it for unknown paths,
  which is what makes `/genre-explorer/genre/house` deep links load the SPA.
- Nothing to configure: Pages is set to `build_type: workflow`, and the deploy runs
  on the repo's own `GITHUB_TOKEN`. No secrets.

## Limits worth knowing

GitHub Pages has a ~100 GB/month soft bandwidth guideline and 1 GB site size. The
site is ~4.5 MB fully cold (graph.json 243 KB gzipped smaller; detail files are
lazy). If traffic ever threatens the cap, switch to Cloudflare Pages below.

## Fallback: Cloudflare Pages (unlimited static bandwidth)

One-time manual setup by the repo owner:

1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to
   Git** → select the repo.
2. Build settings: production branch `main`, build command `npm run build`, output
   `dist`, no environment variables.
3. Deep links work at the domain root out of the box; if Cloudflare ever serves a
   404 for `/genre/<id>`, add `public/_redirects` with `/* /index.html 200`.

Both hosts redeploy on every merge to `main`, including the weekly dataset PR.
