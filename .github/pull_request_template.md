## What changed

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- The reason, not the diff. For a fix: what was the root cause, and what evidence
     identified it (traceback, version pin, timeline)? -->

## How it was tested

<!-- The actual commands and what they showed. `npm run verify` output is fine.
     If something could not be tested, say so here rather than leaving it implied. -->

---

## Before merging

- [ ] `npm run verify` passes locally (lint, format, typecheck, test, build)
- [ ] New decision logic is a pure function with tests — not buried in the render loop
- [ ] No external API call was added anywhere under `src/` (upstream work belongs in
      `scripts/build-dataset/`). The ONE sanctioned exception is the personal lens
      calling `api.listenbrainz.org`, user-initiated — extending it needs a decision,
      not a checkbox
- [ ] `docs/future.md` updated if anything was deferred or discovered
- [ ] Today's `logs/YYYY-MM-DD.md` entry written (what · why · how)

## After merging — required artifacts

Both are kept current together, per `.claude/CLAUDE.md`:

- [ ] **Knowledge graph** — `graphify update .`, commit the refreshed `graphify-out/`
- [ ] **Architecture diagram** — update `docs/architecture/architecture-diagram.html` if
      this PR changed components, pipeline stages, data stores, external services, flows,
      schedules or retention. Use the `architecture-diagram` skill's MANUAL workflow and
      verify the render with a headless-browser screenshot before committing.
- [ ] Docs-only or purely cosmetic? Tick this instead and say so in the changelog entry.
