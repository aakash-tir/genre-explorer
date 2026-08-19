# Open items — found 2026-08-12

**Trigger for this review:** the owner is waiting for their ListenBrainz account to
finish importing from Spotify, then intends to work through everything below in one
pass. Nothing here has been acted on.

Ordered by what actually costs something if left alone. All three are quality and
verification work — nothing here is currently breaking.

The original item 2 — popular-artist lists skewing to global megastars — was settled
on 2026-08-17 and removed; see that day's log entry.

---

## 1. Touch and mobile have never been tested on a real device

**Status:** shipped but unverified.

Mobile layout landed in milestone 6 and `d3-zoom` speaks touch through its pointer-events
path, so it is _expected_ to work. Nobody has confirmed it. Pinch-zoom, tap-to-focus and
the panel as a bottom sheet are all unexercised on actual hardware.

This is the only user-facing feature in the project shipped without verification. Ten
minutes on a phone either closes it or finds something real.

**Effort:** minutes to check; unknown to fix if it is broken.

---

## 2. Non-Western coverage after the threshold filter was never reviewed

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

## 3. Straggler: stale Deezer wording in the research doc

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
