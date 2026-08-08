import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { DATASET } from './fixtures';

function mockFetch(body: unknown, ok = true) {
  return vi.fn(async () =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body } as Response),
  );
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loading state before the dataset arrives', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    render(<App />);
    expect(screen.getByText(/Loading the genre map/i)).toBeInTheDocument();
  });

  it('renders the map counts once the dataset loads', async () => {
    vi.stubGlobal('fetch', mockFetch(DATASET));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('node-count')).toHaveTextContent('8');
    });
    // The roots and the strong mid-tier clear the ~20k cutoff at zoom 1.
    expect(screen.getByTestId('visible-count')).toHaveTextContent('5');
    // Five structural edges; the two fusion edges and the influence edge are not drawn.
    expect(screen.getByTestId('edge-count')).toHaveTextContent('5');
  });

  it('surfaces a load failure instead of rendering an empty map', async () => {
    vi.stubGlobal('fetch', mockFetch(null, false));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load the genre map/i)).toBeInTheDocument();
    });
  });

  it('picks up the focused genre from a deep link', async () => {
    window.history.replaceState(null, '', '/genre/techno');
    vi.stubGlobal('fetch', mockFetch(DATASET));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'techno' })).toBeInTheDocument();
    });
  });
});
