/**
 * Panel states: loading, loaded, thin-but-real, failed. Each test uses a distinct
 * genre id — the panel's session cache is module-level by design (re-focusing must
 * not re-fetch), so ids must not leak between tests.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import DetailPanel, { formatListens } from '../../src/panel/DetailPanel';
import type { GenreDetail, GenreNode } from '../../src/types';

const M = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function node(id: string): GenreNode {
  return {
    id,
    mbid: M(1),
    name: id.replace(/-/g, ' '),
    popularity: 7352,
    depth: 1,
    family: 'rock',
    x: 0,
    y: 0,
  };
}

function detail(id: string, overrides: Partial<GenreDetail> = {}): GenreDetail {
  return {
    id,
    popularArtists: [
      {
        mbid: M(2),
        name: 'Pearl Jam',
        listens: 76601554,
        tagVotes: 20,
        links: [
          { kind: 'spotify', url: 'https://open.spotify.com/artist/1w5K' },
          { kind: 'discogs', url: 'https://www.discogs.com/artist/175395' },
        ],
      },
    ],
    smallArtists: [
      { mbid: M(3), name: 'Deep Cut Band', listens: 4300, tagVotes: 2, links: [] },
    ],
    popularTracks: [
      {
        mbid: M(4),
        title: 'Daughter',
        artistName: 'Pearl Jam',
        listens: 1200000,
        links: [],
      },
    ],
    obscureTracks: [],
    ...overrides,
  };
}

function mockFetch(body: unknown, ok = true) {
  return vi.fn(async () =>
    Promise.resolve({ ok, status: ok ? 200 : 404, json: async () => body } as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('formatListens', () => {
  it('renders magnitudes, not accounting figures', () => {
    expect(formatListens(76601554)).toBe('76.6M');
    expect(formatListens(4300)).toBe('4k');
    expect(formatListens(230)).toBe('230');
  });
});

describe('DetailPanel', () => {
  it('prompts when nothing is focused', () => {
    render(<DetailPanel node={null} />);
    expect(screen.getByText(/No genre selected/)).toBeInTheDocument();
  });

  it('shows loading, then the four lists with outbound links', async () => {
    vi.stubGlobal('fetch', mockFetch(detail('grunge-a')));
    render(<DetailPanel node={node('grunge-a')} />);
    expect(screen.getByTestId('panel-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('panel-loaded')).toBeInTheDocument();
    });
    expect(screen.getByText('Daughter')).toBeInTheDocument();
    // Pearl Jam appears twice by design: as the track's artist line and as an artist.
    expect(screen.getAllByText('Pearl Jam', { exact: false }).length).toBeGreaterThan(1);
    expect(screen.getByText('Deep Cut Band')).toBeInTheDocument();
    // Two Spotify links now: the artist's real one from the dataset, and the
    // track's derived search link (tracks never carry links — see trackLinks.ts).
    const spotify = screen.getAllByRole('link', { name: 'Spotify' });
    const hrefs = spotify.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('https://open.spotify.com/artist/1w5K');
    expect(hrefs).toContain('https://open.spotify.com/search/Pearl%20Jam%20Daughter');
    spotify.forEach((link) => expect(link).toHaveAttribute('target', '_blank'));
    // Empty sections disappear rather than rendering empty headings.
    expect(screen.queryByText('Deeper cuts')).not.toBeInTheDocument();
  });

  it('links a track to its own Deezer page when a preview id exists', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        detail('grunge-d', {
          popularArtists: [],
          smallArtists: [],
          popularTracks: [
            {
              mbid: M(4),
              title: 'Daughter',
              artistName: 'Pearl Jam',
              listens: 1200000,
              links: [],
              deezerId: 7173551,
            },
          ],
        }),
      ),
    );
    render(<DetailPanel node={node('grunge-d')} />);
    await waitFor(() => {
      expect(screen.getByTestId('panel-loaded')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Deezer' })).toHaveAttribute(
      'href',
      'https://www.deezer.com/track/7173551',
    );
  });

  it('says so when a genre has no ranked entities at all', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch(
        detail('acholitronix-b', {
          popularArtists: [],
          smallArtists: [],
          popularTracks: [],
          obscureTracks: [],
        }),
      ),
    );
    render(<DetailPanel node={node('acholitronix-b')} />);
    await waitFor(() => {
      expect(screen.getByText(/nothing is filed under it/)).toBeInTheDocument();
    });
  });

  it('surfaces a failed detail fetch', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    render(<DetailPanel node={node('failing-c')} />);
    await waitFor(() => {
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
    });
  });
});
