/**
 * The filter panel edits ONLY `selectedIds` — the hiding itself is `resolveFilter`
 * in lod.ts, tested separately. These tests pin the selection UX: search narrows by
 * popularity, selecting adds and clears the query, chips remove, clear empties.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FilterPanel, { MAX_MATCHES, searchGenres } from '../../src/filters/FilterPanel';
import type { GenreNode } from '../../src/types';

const M = (n: number) =>
  `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;

function node(id: string, name: string, popularity: number): GenreNode {
  return { id, mbid: M(1), name, popularity, depth: 0, family: id, x: 0, y: 0 };
}

const NODES = [
  node('house', 'house', 108000),
  node('deep-house', 'deep house', 21000),
  node('acid-house', 'acid house', 3000),
  node('techno', 'techno', 66000),
];

describe('searchGenres', () => {
  it('matches substrings case-insensitively, most popular first', () => {
    const found = searchGenres(NODES, 'HOUSE', []);
    expect(found.map((n) => n.id)).toEqual(['house', 'deep-house', 'acid-house']);
  });

  it('excludes already-selected genres and caps the list', () => {
    expect(searchGenres(NODES, 'house', ['house']).map((n) => n.id)).toEqual([
      'deep-house',
      'acid-house',
    ]);
    const many = Array.from({ length: 40 }, (_, i) => node(`g${i}`, `genre ${i}`, i));
    expect(searchGenres(many, 'genre', []).length).toBe(MAX_MATCHES);
  });

  it('returns nothing for a blank query', () => {
    expect(searchGenres(NODES, '   ', [])).toEqual([]);
  });
});

describe('FilterPanel', () => {
  it('selects a search result and clears the query', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterPanel nodes={NODES} selectedIds={[]} onSelectionChange={onChange} />);

    await user.type(screen.getByLabelText('Search genres'), 'tech');
    await user.click(screen.getByRole('button', { name: 'techno' }));
    expect(onChange).toHaveBeenCalledWith(['techno']);
    expect(screen.getByLabelText('Search genres')).toHaveValue('');
  });

  it('removes a selected genre via its chip', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterPanel
        nodes={NODES}
        selectedIds={['techno', 'house']}
        onSelectionChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove techno' }));
    expect(onChange).toHaveBeenCalledWith(['house']);
  });

  it('clears the whole selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterPanel nodes={NODES} selectedIds={['techno']} onSelectionChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('collapses to a compact toggle that shows the selection count', async () => {
    const user = userEvent.setup();
    render(
      <FilterPanel nodes={NODES} selectedIds={['techno']} onSelectionChange={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Collapse filters' }));
    const expand = screen.getByRole('button', { name: 'Filter (1)' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    await user.click(expand);
    expect(screen.getByLabelText('Search genres')).toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    const user = userEvent.setup();
    render(<FilterPanel nodes={NODES} selectedIds={[]} onSelectionChange={vi.fn()} />);
    await user.type(screen.getByLabelText('Search genres'), 'zzz');
    expect(screen.getByText('No genres match.')).toBeInTheDocument();
  });
});
