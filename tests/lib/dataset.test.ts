import { describe, expect, it, vi } from 'vitest';
import {
  DatasetError,
  createDetailCache,
  genreDetailUrl,
  indexNodes,
  loadGraph,
} from '../../src/lib/dataset';
import { GraphDataset } from '../../src/types';
import { DATASET } from '../fixtures';
import graphJson from '../../public/data/graph.json';
import technoJson from '../../public/data/genres/techno.json';
import { GenreDetail } from '../../src/types';

function fakeFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.fn(async () =>
    Promise.resolve({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    } as Response),
  ) as unknown as typeof fetch;
}

describe('the committed dataset', () => {
  it('validates against the schema', () => {
    // The dataset is a build artifact refreshed by an automated weekly PR. If it stops
    // matching the schema, that must fail here rather than in a browser.
    expect(() => GraphDataset.parse(graphJson)).not.toThrow();
  });

  it('has a detail file matching the detail schema', () => {
    expect(() => GenreDetail.parse(technoJson)).not.toThrow();
  });

  it('has no edge pointing at a genre that is not in the graph', () => {
    const parsed = GraphDataset.parse(graphJson);
    const known = new Set(parsed.nodes.map((n) => n.id));
    const dangling = parsed.edges.filter(
      (e) => !known.has(e.source) || !known.has(e.target),
    );
    expect(dangling).toEqual([]);
  });
});

describe('loadGraph', () => {
  it('returns a validated dataset', async () => {
    await expect(loadGraph(fakeFetch(DATASET))).resolves.toEqual(DATASET);
  });

  it('throws a DatasetError naming the field when the shape is wrong', async () => {
    const broken = { ...DATASET, nodes: [{ id: 'rock' }] };
    await expect(loadGraph(fakeFetch(broken))).rejects.toBeInstanceOf(DatasetError);
  });

  it('throws on a non-ok response', async () => {
    await expect(loadGraph(fakeFetch(null, { ok: false, status: 404 }))).rejects.toThrow(
      /404/,
    );
  });

  it('throws a clear error when the network is unreachable', async () => {
    const dead = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(loadGraph(dead)).rejects.toThrow(/Could not reach/);
  });

  it('rejects an id that is not kebab-case, which would break its detail URL', async () => {
    const badId = {
      ...DATASET,
      nodes: [{ ...DATASET.nodes[0], id: 'Melodic Techno' }],
    };
    await expect(loadGraph(fakeFetch(badId))).rejects.toBeInstanceOf(DatasetError);
  });
});

describe('genreDetailUrl', () => {
  it('points at the per-genre file', () => {
    expect(genreDetailUrl('melodic-techno')).toBe('/data/genres/melodic-techno.json');
  });
});

describe('createDetailCache', () => {
  const detail = {
    id: 'techno',
    popularArtists: [],
    smallArtists: [],
    popularTracks: [],
    obscureTracks: [],
  };

  it('fetches once and serves the rest from memory', async () => {
    const fetcher = fakeFetch(detail);
    const cache = createDetailCache(fetcher);
    await cache.get('techno');
    await cache.get('techno');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not fire twice for a double click before the first resolves', async () => {
    const fetcher = fakeFetch(detail);
    const cache = createDetailCache(fetcher);
    await Promise.all([cache.get('techno'), cache.get('techno')]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failure — a blip must not make a genre permanently unopenable', async () => {
    let attempts = 0;
    const flaky = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError('Failed to fetch');
      return { ok: true, status: 200, json: async () => detail } as Response;
    }) as unknown as typeof fetch;

    const cache = createDetailCache(flaky);
    await expect(cache.get('techno')).rejects.toThrow();
    await expect(cache.get('techno')).resolves.toMatchObject({ id: 'techno' });
    expect(attempts).toBe(2);
  });
});

describe('indexNodes', () => {
  it('makes every node reachable by id', () => {
    const index = indexNodes(DATASET);
    expect(index.size).toBe(DATASET.nodes.length);
    expect(index.get('melodic-techno')?.name).toBe('melodic techno');
  });
});
