# Open items — found 2026-08-12

**Trigger for this review:** the owner is waiting for their ListenBrainz account to
finish importing from Spotify, then intends to work through everything below in one
pass. Nothing here has been acted on.

Ordered by what actually costs something if left alone. Item 1 is a live bug and is
likely to recur **this Sunday**; the rest are quality and verification work.

---

## 1. The weekly dataset refresh is broken, and its failure mode will recur

**Status:** live bug. No automated data PR has ever been opened.

### What happened

The scheduled refresh ran for the first time on **2026-08-09 05:07 UTC** (run
`31296016002`) and failed after **33 minutes**. It has not run since; the next scheduled
attempt is Sunday 2026-08-16.

It died at page **1400 of 2184** in the stage-2 hierarchy scrape:

```
Error: Page for nu disco (351424dd-91a3-4cf2-9edb-5df647743ec0) does not look like a
genre page — MusicBrainz layout change or error page. Delete it from the cache and
rerun; if it persists, the parser fixtures need re-saving.
    at fetchHierarchy (scripts/build-dataset/fetch-hierarchy.ts:48)
```

### Why it is not what the backlog predicts

`docs/future.md` warns that early runs may "time out once or twice before the cache
fills." That is not this. A timeout would burn the full 350-minute budget; this failed in
33 minutes with a thrown error.

Nor is it the layout change the error suggests. The page was re-fetched on 2026-08-12 and
is healthy — HTTP 200, title `nu disco - Genre information - MusicBrainz`, which is
exactly what `looksLikeGenrePage()` tests for. **MusicBrainz served a transient error page
mid-scrape**, `cachedFetch` wrote it to disk, and the guard correctly refused to parse it.

### The real problem

Every scheduled run re-scrapes all 2,184 genre pages (the prune step deletes
`genre-pages/` on `schedule` events, by design — a refresh reusing last week's scrape
refreshes nothing). One bad response anywhere in those 2,184 sequential requests aborts a
~3-hour job. That is a weekly lottery, and it lost on the first ticket.

Manual dispatch is worse. The prune step is `if: github.event_name == 'schedule'`, so a
`workflow_dispatch` re-run **reuses the poisoned cache entry** and fails at the same page
every time until someone deletes it by hand — which is awkward inside Actions, since the
cache lives in the Actions cache rather than the working tree.

### Proposed fix

The pattern already exists one stage over. `fetch-previews.ts` handles exactly this class
of bug for Deezer, whose rate limit arrives as an HTTP 200 with an error body:

> Rate limiting is HTTP 200 with `{"error":{"code":4}}` — must not be cached, or the slot
> is poisoned forever. Detected, cache entry deleted, retried.

It unlinks the cache entry and retries with backoff (`QUOTA_RETRIES = 5`,
`QUOTA_BACKOFF_MS = 6000`). Stage 2 lacks the equivalent: it caches first, validates
second, and throws.

Port that shape to `fetchHierarchy` — validate with `looksLikeGenrePage()` _before_
trusting the cached body, and on failure delete the entry and retry a few times with
backoff, only throwing if it persists. The existing error message already tells the
operator to "delete it from the cache and rerun"; this just does it automatically.

Worth deciding at the same time: should a handful of unparseable pages out of 2,184 fail
the whole run at all, or be collected and reported while the run completes? The
sharp-drop guard in stage 8 already catches the case that actually matters (the scrape
silently emptying), so aborting on the first bad page may be stricter than it needs to be.

**Effort:** small — one function, mirroring code that already exists.

---

## 2. Touch and mobile have never been tested on a real device

**Status:** shipped but unverified.

Mobile layout landed in milestone 6 and `d3-zoom` speaks touch through its pointer-events
path, so it is _expected_ to work. Nobody has confirmed it. Pinch-zoom, tap-to-focus and
the panel as a bottom sheet are all unexercised on actual hardware.

This is the only user-facing feature in the project shipped without verification. Ten
minutes on a phone either closes it or finds something real.

**Effort:** minutes to check; unknown to fix if it is broken.

---

## 3. Popular-artist lists skew to global megastars

**Status:** open product decision, already recorded — the one that changes what users see.

Ranking is by **total** artist listens, so anyone ever tagged with a genre can outrank its
genuine artists. The example in the existing note: Britney Spears surfacing under `house`.

ListenBrainz exposes no genre-scoped listen counts, so every fix is heuristic — weighting
by tag count, capping the contribution of artists whose top genre is elsewhere, or
blending listens with tag strength. Each risks making other genres worse, which is why
this is a judgement call rather than a bug.

Suggest picking three or four genres you know well, looking at their current popular
lists, and deciding whether the skew is actually bothering you before engineering against
it.

**Effort:** small to try a heuristic; the hard part is deciding it is an improvement.

---

## 4. Non-Western coverage after the threshold filter was never reviewed

**Status:** the review the backlog asks for has not happened.

`MIN_RELEASE_GROUPS = 50` keeps 912 of 2,184 genres. The note dates from before the
filtered dataset existed and says to review "now that the filtered dataset exists" — it
does, and the review is still outstanding.

The question is whether the threshold disproportionately thins non-Western genre families,
since MusicBrainz release-group tagging is itself uneven by region. If it does, the fix is
not necessarily a lower global threshold (that readmits empty panels everywhere) but
possibly a per-family floor.

**Effort:** an afternoon of looking at what survived, per family.

---

## 5. Straggler: stale Deezer wording in the research doc

**Status:** trivial, and already flagged by the backlog itself.

`docs/research/music-data-sources.md` §7 still describes Deezer as supplying "a preview
MP3 URL per track" (three places, around lines 289, 292 and 308). The pipeline stores a
track **id**; preview URLs carry an `hdnea` token that expires in ~12 minutes, which is
the entire reason the panel embeds the widget player instead.

The 2026-08-12 docs sweep missed this because it grepped for Spotify and milestone
markers, not Deezer ones.

**Effort:** one edit.

---

## Not included, and why

- **Exact per-song Spotify links** — blocked on a decision, not on work. It requires
  registering a Spotify app and putting a client secret in the pipeline, which the
  no-keys rule forbids. Evidence that both free routes are dead is in
  `docs/research/music-data-sources.md` §4. Reopen only if the no-keys rule changes.
- **Upstream watch** (ListenBrainz `GET /popularity/*` 500s, MusicBrainz `inc=genre-rels`)
  — passive rechecks, nothing to build.
- **Scaling** (Canvas vs WebGL above ~10k nodes, the 400 KB `graph.json` budget) — not
  close. Currently 912 nodes and 243 KB.
- **Deferred v1 features** (accounts, playlist export, timeline view, similarity edges,
  Spotify export upload) — deliberate non-goals, tracked in `docs/future.md`.
