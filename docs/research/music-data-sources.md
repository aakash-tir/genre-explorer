# Research — Where the genre, song and artist data comes from

**Date:** 2026-08-04
**Decision it supports:** MusicBrainz + ListenBrainz as the data backbone; Deezer for
previews; Spotify and SoundCloud as _link targets only_.

Every claim below was verified by an actual HTTP call on 2026-08-04, not from memory.
The raw responses are quoted.

---

## 1. Spotify is no longer a viable data source (this is the finding that shapes the project)

The original `plan.md` assumed Spotify could supply popular songs and artists per genre.
It cannot — not for a project started in 2026.

### What was removed

Two waves of deprecation:

**November 27, 2024** — apps _created or approved after_ this date lost:
`GET /recommendations`, `GET /audio-features`, `GET /audio-analysis`,
`GET /artists/{id}/related-artists`, featured playlists, category playlists, and
30-second `preview_url` values. Apps approved before that date were grandfathered;
a new project gets none of it.

**February 2026** — removed for _everyone_, per the
[official changelog](https://developer.spotify.com/documentation/web-api/references/changes/february-2026):

- `GET /artists/{id}/top-tracks` — **this was the endpoint the plan needed**
- `GET /browse/categories`, `GET /browse/categories/{id}`, `GET /browse/new-releases`
- `GET /artists`, `GET /tracks`, `GET /albums` (all batch-fetch endpoints)
- `GET /users/{id}`, `GET /users/{id}/playlists`
- `GET /markets`

Search survived but was crippled: the `limit` parameter maximum dropped **from 50 to 10**
and the default from 20 to 5, quoted verbatim from the changelog.

### What happened to access itself

- The Spotify account that owns a developer app must hold an **active Premium
  subscription** or the app stops working (Feb 2026).
- Development mode is capped at **one client ID per developer and five users**.
- **Extended quota mode** has, since May 2025, only accepted applications from
  registered organizations with an active service of **250k+ monthly active users**.
  A hobby project has no path to it. This is the door closing, not narrowing.

### Conclusion

Spotify cannot be queried at build time or at runtime. It can only appear as an outbound
`https://open.spotify.com/artist/...` link, which requires no API and no agreement.

Sources:

- [Spotify Web API Changelog — February 2026](https://developer.spotify.com/documentation/web-api/references/changes/february-2026)
- [Spotify API access in 2026: dev mode limits and the February migration](https://vorplabs.com/agent-tools/spotify-cli)
- [Spotify API Changes: What's Deprecated, What Still Works](https://developers.brizm.dev/blog/spotify-api-changes-2026/)

---

## 2. Every Noise at Once is not a maintainable source either

The obvious prior art. Glenn McDonald's [everynoise.com](https://everynoise.com/) is the
canonical genre map — a scatter-plot of ~6,000 Spotify genres.

It is **frozen**. McDonald was laid off from Spotify in December 2023 and has been unable
to update the data since; in May 2024 he said the site's "future, in its current form, is
probably short."

Community archives exist ([MusicGenreDB](https://github.com/ThatSINEWAVE/MusicGenreDB),
6,291 genres; [EveryNoise-Genre-JSON](https://github.com/Geeoon/EveryNoise-Genre-JSON)),
but they have two disqualifying problems for this project:

1. **No hierarchy.** Every Noise positions genres on a 2D similarity plane. There is no
   "alt rock is a subgenre of rock" edge anywhere in it. Our entire product is the tree.
2. **Derived from scraped Spotify data**, frozen at 2023, and of murky licensing.

Useful as _inspiration and a cross-check on genre naming_. Not as a data source.

Sources:

- [Every Noise at Once — Wikipedia](https://en.wikipedia.org/wiki/Every_Noise_at_Once)
- [Every Noise at Once Engineer Impacted by Spotify Layoffs](https://www.digitalmusicnews.com/2024/02/14/every-noise-at-once-engineer-impacted-by-spotify-layoffs/)

---

## 3. MusicBrainz has the genre hierarchy — and it matches the plan exactly

This is the discovery that makes the project buildable.

### The genre list

```
GET https://musicbrainz.org/ws/2/genre/all?fmt=txt
→ 2,184 genres, newline separated, alphabetical
```

Verified 2026-08-04. Sample: `2 tone, 2-step, 3-step, aak, abhang, aboio,
abstract hip hop, acholitronix, acid breaks, acid house, acid jazz, acid rock,
acid techno, acid trance, acidcore, ...`

### The genre-to-genre relationships

[MusicBrainz models three relationship types between genres](https://musicbrainz.org/relationships/genre-genre):

| Type              | Meaning (MusicBrainz's own words)                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **subgenre of**   | "This links a genre to its subgenres."                                                         |
| **influenced by** | "A genre has influences of another, but is not connected to it enough to be a subgenre of it." |
| **fusion of**     | "This genre originated as a hybrid of two or more other genres." A subtype of _influenced by_. |

Real data, fetched from the `alternative rock` genre page:

```
Subgenre of:      rock
Subgenres:        britpop, dream pop, emo, geek rock, grebo, grunge,
                  indie rock, j-rock, lo-fi, post-britpop, post-grunge, shoegaze
Has fusion genres: alternative dance
Influenced genres: garage rock revival, mangue beat, pop screamo
```

**This is precisely the model `plan.md` asked for.** The plan says: _"If a sub genre is a
mix of 2 big genre don't try to connect the 2 with a displayed edge although an edge may
exist in the codebase."_ MusicBrainz already separates the structural `subgenre of` edge
from the associative `fusion of` / `influenced by` edges. We draw the first and keep the
other two in the data for the "show it under both parents when focused" behaviour.

### ⚠️ The catch: relationships are not in the JSON API

```
GET /ws/2/genre/{mbid}?inc=genre-rels&fmt=json
→ 200 OK, but "relations" is absent — relations count = 0
GET /ws/2/genre?query=...
→ {"error": "This hasn't been implemented yet."}
```

The `inc` parameter is _accepted_ and silently returns nothing. The relationships exist
only on the HTML pages and in the database dump. Two ways to get them:

| Route                                 | Cost                                             | Notes                                                                                              |
| ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Scrape the 2,184 genre HTML pages** | ~37 min one-time at MusicBrainz's 1 req/s policy | Simple, no infra. Must send a real `User-Agent` with contact info.                                 |
| **`mbdump.tar.bz2` full export**      | **7 GB** download + Postgres import              | Contains `genre`, `l_genre_genre`, `link`, `link_type`. Correct but heavy for a static site build. |

**Chosen: scrape the HTML pages**, cached to disk, refreshed weekly. 2,184 requests at
1/sec is well inside MusicBrainz's stated rate limit and the data is CC0. The dump is the
fallback if the HTML layout ever changes.

Sources:

- [MusicBrainz Genre-Genre relationship types](https://musicbrainz.org/relationships/genre-genre)
- [MusicBrainz API docs](https://musicbrainz.org/doc/MusicBrainz_API)
- [MusicBrainz data dumps](https://data.metabrainz.org/pub/musicbrainz/data/fullexport/)

---

## 4. Artists per genre, with real streaming links

MusicBrainz's tag search returns artists by genre, and artist URL relationships carry the
actual streaming links the plan wants.

```
GET /ws/2/artist?query=tag:"acid house"&fmt=json
→ count = 88
  Ceephax Acid Crew (100), DMX Krew (94), Humanoid (90), Wink (88), Drexciya (88)
```

```
GET /ws/2/artist/f22942a1-.../?inc=url-rels&fmt=json   (Aphex Twin)
→ bandcamp        https://aphextwin.bandcamp.com/
  discogs         https://www.discogs.com/artist/45
  free streaming  https://open.spotify.com/artist/6kBDZFXuLrZgHnvmPu9NsG
  free streaming  https://music.youtube.com/channel/UCWmnkYUzoOiOztmPBhIlZjg
  soundcloud      https://soundcloud.com/aphex-twin-official
  youtube         https://www.youtube.com/channel/UC4hfA78X-lqiRERBZLTnLBw
```

**MusicBrainz hands us canonical Spotify and SoundCloud URLs without ever touching the
Spotify API.** This is the single most important finding for the right-hand panel: the
plan's "these can be linked to spotify/soundcloud pages" requirement is satisfied by an
open CC0 database.

---

## 5. Popularity — the popular / obscure split

[ListenBrainz's popularity API](https://listenbrainz.readthedocs.io/en/latest/users/api/popularity.html)
gives real listen counts, free and unauthenticated.

```
POST https://api.listenbrainz.org/1/popularity/artist
{"artist_mbids": ["f22942a1-6f70-4f48-866e-238cb2308fbd"]}
→ [{"artist_mbid": "f22942a1-...", "total_listen_count": 14807187,
    "total_user_count": 194728}]
```

```
POST https://api.listenbrainz.org/1/popularity/recording
→ per-recording total_listen_count / total_user_count
  e.g. 5286 listens / 1264 users … down to 1 listen / 1 user
```

That spread is exactly what the plan's "5 popular / 5 not-as-popular" split needs: rank
the genre's candidates by `total_listen_count`, take the top 5, then take 5 from a
defined band in the tail (not the absolute bottom — a 1-listen recording is usually a
data artifact, not a hidden gem).

### ⚠️ Two documented GET endpoints are currently broken

```
GET /1/popularity/top-recordings-for-artist/{mbid}     → 500 INTERNAL SERVER ERROR
GET /1/popularity/top-release-groups-for-artist/{mbid} → 500 INTERNAL SERVER ERROR
```

Both are documented and both 500'd on 2026-08-04. The POST endpoints work fine, so the
build pipeline must use the **MusicBrainz recording tag search → ListenBrainz POST
`/popularity/recording`** path rather than the convenience GETs. Verified working:

```
GET /ws/2/recording?query=tag:"acid house"&fmt=json → count = 1461
```

Recheck the GET endpoints periodically; they would simplify the pipeline if fixed.

---

## 6. Genre popularity for node size

Node size needs a per-genre popularity number. The proxy: count of MusicBrainz
release-groups tagged with that genre.

```
rock          → 547,091 release-groups
techno        →  70,770
vaporwave     →  15,981
acholitronix  →       0
```

Two things follow:

1. The numbers span **five orders of magnitude**, so node radius must be scaled
   logarithmically or `rock` will be a thousand times the diameter of `vaporwave`.
2. **The long tail is genuinely empty.** `acholitronix` is a real MusicBrainz genre with
   zero tagged releases. This is the direct evidence behind the decision to filter the
   2,184 genres down to those clearing a data threshold — a node that opens an empty
   panel breaks the core promise of the product.

---

## 7. Deezer — audio previews, no key required

The [Deezer public API](https://publicapi.dev/deezer-api) needs no API key and no auth.
It serves 30-second preview MP3s, artist and track search, and top tracks. Rate limit is
**50 requests per 5 seconds**.

Used for one job only: resolving a preview MP3 URL per track for the in-app player.
If a track has no Deezer match, the preview button is simply absent — previews degrade,
they don't break the panel.

---

## Summary of the chosen pipeline

```
MusicBrainz /genre/all           → 2,184 genre names
MusicBrainz genre HTML pages     → subgenre-of / fusion-of / influenced-by edges
MusicBrainz release-group tags   → genre popularity (node size)   [filter threshold here]
MusicBrainz artist tag search    → candidate artists per genre
MusicBrainz artist url-rels      → Spotify / SoundCloud / Bandcamp / YouTube links
MusicBrainz recording tag search → candidate tracks per genre
ListenBrainz POST /popularity/*  → listen counts → popular vs. obscure split
Deezer search                    → 30s preview MP3 URLs
```

No API keys. No paid tiers. No account required by the user. Every source is either CC0
(MusicBrainz core data) or open and unauthenticated.
