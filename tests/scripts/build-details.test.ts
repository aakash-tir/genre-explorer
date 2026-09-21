/**
 * Partial progress in the daily shard.
 *
 * This is the behaviour the rolling refresh actually runs on: `buildDetails` used to
 * abort the whole shard on the first genre that threw, so a single MusicBrainz 503
 * discarded the 65 genres that had already been written. The network is mocked out
 * entirely — what is under test is the failure POLICY, not any upstream.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GenreNode } from '../../src/types';

const emitDetail = vi.fn(async (_detail: { id: string }) => {});
const emitArtistIndex = vi.fn(async () => {});
const fetchEntities = vi.fn(async (_node: GenreNode) => ({
  artists: [],
  recordings: [],
}));

vi.mock('../../scripts/build-dataset/emit-details', () => ({
  DETAILS_DIR: 'public/data/genres',
  emitDetail: (detail: { id: string }) => emitDetail(detail),
}));
vi.mock('../../scripts/build-dataset/emit-artist-index', () => ({
  emitArtistIndex: () => emitArtistIndex(),
}));
vi.mock('../../scripts/build-dataset/fetch-entities', () => ({
  fetchEntities: (node: GenreNode) => fetchEntities(node),
}));
vi.mock('../../scripts/build-dataset/rank', () => ({
  fetchArtistListens: async () => new Map<string, number>(),
  fetchRecordingListens: async () => new Map<string, number>(),
  selectEntities: () => ({ popular: [], obscure: [] }),
}));
vi.mock('../../scripts/build-dataset/fetch-links', () => ({
  fetchArtistLinks: async () => [],
}));
vi.mock('../../scripts/build-dataset/fetch-previews', () => ({
  fetchDeezerId: async () => null,
}));

const { buildDetails } = await import('../../scripts/build-dataset/index');

function node(id: string): GenreNode {
  return {
    id,
    mbid: '00000000-0000-4000-8000-000000000001',
    name: id,
    popularity: 100,
    depth: 0,
    family: id,
    x: 0,
    y: 0,
  };
}

/** Genres named in `broken` throw the way a 503 does, after the retries are spent. */
function failFor(broken: ReadonlySet<string>): void {
  fetchEntities.mockImplementation(async (node: GenreNode) => {
    if (broken.has(node.id)) {
      throw new Error(`Giving up on https://musicbrainz.org/... after 5 attempts`);
    }
    return { artists: [], recordings: [] };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchEntities.mockImplementation(async () => ({ artists: [], recordings: [] }));
});

describe('buildDetails', () => {
  it('writes every genre when nothing fails', async () => {
    await buildDetails([node('a'), node('b'), node('c')]);
    expect(emitDetail).toHaveBeenCalledTimes(3);
  });

  // THE regression: 2026-09-10, 09-12 and 09-16 each lost a full day to exactly this.
  it('keeps the genres that passed when one genre fails', async () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`g${i}`));
    failFor(new Set(['g7']));

    await expect(buildDetails(nodes)).resolves.toBeUndefined();

    expect(emitDetail).toHaveBeenCalledTimes(19);
    const written = emitDetail.mock.calls.map((call) => call[0].id);
    expect(written).not.toContain('g7');
  });

  // The failed genre is not written, so its old `refreshedAt` survives and
  // `selectShard` puts it back at the head of the queue. That IS the retry.
  it('leaves the failed genre unwritten so the rotation picks it up again', async () => {
    failFor(new Set(['trova']));
    await buildDetails([node('trova'), node('techno')]);

    const written = emitDetail.mock.calls.map((call) => call[0].id);
    expect(written).toEqual(['techno']);
  });

  // Stage 9 reads the detail files back off disk, so skipping it after a partial
  // shard would ship an index that disagrees with the panels beside it.
  it('still rebuilds the artist index after a partial shard', async () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`g${i}`));
    failFor(new Set(['g1']));
    await buildDetails(nodes);
    expect(emitArtistIndex).toHaveBeenCalledTimes(1);
  });

  it('fails the run when most of the shard fails, because that is an outage', async () => {
    const nodes = Array.from({ length: 20 }, (_, i) => node(`g${i}`));
    failFor(new Set(nodes.slice(0, 15).map((n) => n.id)));

    await expect(buildDetails(nodes)).rejects.toThrow(/only 5\/20/);
  });
});
