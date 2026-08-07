/**
 * Stage 2's parser — the most fragile module in the repo, kept pure and alone so it can
 * be pinned down by fixture tests over saved real pages (`tests/fixtures/genre-*.html`).
 *
 * Why scraping exists at all: MusicBrainz's genre-genre relationships are NOT exposed by
 * the JSON API. `inc=genre-rels` is accepted and silently returns nothing (verified
 * 2026-08-04), so the HTML sidebar is the only free source of the tree. If MusicBrainz
 * changes this markup, these tests fail — which is the designed alternative to the
 * pipeline silently emitting 2,184 orphan nodes.
 *
 * The markup being parsed (one `<table class="details">` row per relationship type):
 *
 *   <tr><th>subgenre of:</th><td>
 *     <span class="genrelink"></span>
 *     <a class="wrap-anywhere" href="/genre/{mbid}"><bdi>{name}</bdi></a><br/>
 *     ...
 *   </td></tr>
 *
 * Each label is parsed from the page it appears on in BOTH directions ("subgenre of" on
 * the child, "subgenres" on the parent), so a single malformed page cannot lose an edge —
 * the counterpart page supplies it and the pipeline deduplicates.
 */

export interface GenrePageRef {
  mbid: string;
  name: string;
}

export interface GenrePageRelations {
  /** `subgenre of:` — genres this one is a subgenre of (its parents). */
  parents: GenrePageRef[];
  /** `subgenres:` — genres that are subgenres of this one (its children). */
  children: GenrePageRef[];
  /** `fusion of:` — genres this one is a fusion of. */
  fusionOf: GenrePageRef[];
  /** `has fusion genres:` — fusions built on this genre. */
  fusionGenres: GenrePageRef[];
  /** `influenced by:` — genres that influenced this one. */
  influencedBy: GenrePageRef[];
  /** `influenced genres:` — genres this one influenced. */
  influencedGenres: GenrePageRef[];
}

const LABELS: Record<string, keyof GenrePageRelations> = {
  'subgenre of': 'parents',
  subgenres: 'children',
  'fusion of': 'fusionOf',
  'has fusion genres': 'fusionGenres',
  'influenced by': 'influencedBy',
  'influenced genres': 'influencedGenres',
};

const ROW = /<th>([^<]+):<\/th><td[^>]*>(.*?)<\/td>/gs;
const GENRE_LINK =
  /href="\/genre\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"[^>]*>(?:<bdi>)?([^<]+)/g;

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * True when the page looks like a genre page at all. A CDN error page or a redesign
 * that drops the sidebar must be distinguishable from "this genre has no relations" —
 * both would otherwise parse to six empty arrays.
 */
export function looksLikeGenrePage(html: string): boolean {
  return /Genre information - MusicBrainz<\/title>/.test(html);
}

export function parseGenrePage(html: string): GenrePageRelations {
  const relations: GenrePageRelations = {
    parents: [],
    children: [],
    fusionOf: [],
    fusionGenres: [],
    influencedBy: [],
    influencedGenres: [],
  };

  for (const row of html.matchAll(ROW)) {
    const key = LABELS[row[1].trim()];
    if (!key) continue;
    for (const link of row[2].matchAll(GENRE_LINK)) {
      relations[key].push({ mbid: link[1], name: decodeEntities(link[2].trim()) });
    }
  }
  return relations;
}
