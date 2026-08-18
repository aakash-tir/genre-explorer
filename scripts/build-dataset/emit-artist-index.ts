/**
 * Artist → genre reverse index for the personal lens.
 *
 * Inverts the committed genre detail files (`public/data/genres/*.json`) into
 * `public/data/artist-index.json`: every panel artist, keyed for matching by
 * Spotify artist id (exact) and normalized name (fallback). Pure inversion of
 * data the pipeline already emitted — NO network calls, so it can rerun any time
 * with `npm run build:artist-index` and is also invoked at the end of the full
 * pipeline run.
 *
 * Output is deterministically ordered (genre ids as given; artists by name, then
 * spotify id) so weekly refresh diffs stay reviewable.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ArtistIndex, GenreDetail, type ArtistIndexEntry } from '../../src/types';
import { normalizeArtistName, spotifyArtistIdFromUrl } from '../../src/lib/artistNames';

export const DATA_DIR = path.join('public', 'data');
export const ARTIST_INDEX_PATH = path.join(DATA_DIR, 'artist-index.json');

/** Pure core, exported for tests: detail files in, index out. */
export function buildArtistIndex(
  details: readonly GenreDetail[],
  builtAt: string,
): ArtistIndex {
  const genreIds = details.map((detail) => detail.id);
  const byMbid = new Map<
    string,
    { spotifyId?: string; name: string; votesByGenre: Map<number, number> }
  >();

  details.forEach((detail, genreIndex) => {
    for (const artist of [...detail.popularArtists, ...detail.smallArtists]) {
      let entry = byMbid.get(artist.mbid);
      if (!entry) {
        const spotifyLink = artist.links.find((link) => link.kind === 'spotify');
        const spotifyId = spotifyLink ? spotifyArtistIdFromUrl(spotifyLink.url) : null;
        entry = {
          ...(spotifyId ? { spotifyId } : {}),
          name: normalizeArtistName(artist.name),
          votesByGenre: new Map(),
        };
        byMbid.set(artist.mbid, entry);
      }
      // An artist can reach one genre through both the popular and obscure lists;
      // the vote count is a property of the (artist, genre) pair, so it is identical
      // either way and the max is just a belt-and-braces against a future change
      // that lets the two lists disagree.
      const seen = entry.votesByGenre.get(genreIndex);
      entry.votesByGenre.set(
        genreIndex,
        seen === undefined ? artist.tagVotes : Math.max(seen, artist.tagVotes),
      );
    }
  });

  const artists: ArtistIndexEntry[] = [...byMbid.entries()]
    .map(([mbid, entry]) => {
      // Sort the pairs together so `genres` and `votes` stay positionally aligned.
      const pairs = [...entry.votesByGenre.entries()].sort((a, b) => a[0] - b[0]);
      return {
        mbid,
        ...(entry.spotifyId ? { spotifyId: entry.spotifyId } : {}),
        name: entry.name,
        genres: pairs.map(([genreIndex]) => genreIndex),
        votes: pairs.map(([, votes]) => votes),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.mbid.localeCompare(b.mbid));

  return ArtistIndex.parse({ builtAt, genreIds, artists });
}

export async function emitArtistIndex(): Promise<void> {
  const genresDir = path.join(DATA_DIR, 'genres');
  const files = (await readdir(genresDir))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const details: GenreDetail[] = [];
  for (const file of files) {
    const raw: unknown = JSON.parse(await readFile(path.join(genresDir, file), 'utf8'));
    details.push(GenreDetail.parse(raw));
  }
  const index = buildArtistIndex(details, new Date().toISOString());
  await writeFile(ARTIST_INDEX_PATH, `${JSON.stringify(index)}\n`);
  console.log(
    `  artist index: ${index.artists.length} artists across ${index.genreIds.length} genres → ${ARTIST_INDEX_PATH}`,
  );
}

// Same run-guard pattern as index.ts: importing this in a test must not execute it.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  await emitArtistIndex();
}
