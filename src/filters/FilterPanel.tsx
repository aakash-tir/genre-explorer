/**
 * The left filter panel — search, multi-select, hide the rest.
 *
 * From the original plan: "search by genre name, or select several genres and hide
 * everything that isn't them or their descendants."
 *
 * This component only edits `selectedIds`; the consequences happen elsewhere and are
 * already tested: `resolveFilter` in `lod.ts` turns the selection into the allowed
 * set (selection + structural descendants, a HARD gate that overrides focus), the
 * canvas hides everything else, and `deepLink.ts` carries `?filter=` so a filtered
 * view is a shareable URL.
 *
 * Search matches genre names case-insensitively as a substring. Matches are capped
 * and ordered by popularity so "house" leads with the genres someone likely means,
 * not `acholitronix`-tier tail entries.
 */
import { useMemo, useState } from 'react';

import type { GenreNode } from '../types';

/** Search results shown at once. More is scroll noise; refine the query instead. */
export const MAX_MATCHES = 20;

/** Case-insensitive substring match over names, most popular first. */
export function searchGenres(
  nodes: readonly GenreNode[],
  query: string,
  selectedIds: readonly string[],
): GenreNode[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [];
  const selected = new Set(selectedIds);
  return nodes
    .filter((node) => !selected.has(node.id) && node.name.toLowerCase().includes(needle))
    .sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id))
    .slice(0, MAX_MATCHES);
}

interface FilterPanelProps {
  nodes: readonly GenreNode[];
  selectedIds: readonly string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export default function FilterPanel({
  nodes,
  selectedIds,
  onSelectionChange,
}: FilterPanelProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const matches = useMemo(
    () => searchGenres(nodes, query, selectedIds),
    [nodes, query, selectedIds],
  );
  const selectedNodes = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return selectedIds.map((id) => byId.get(id)).filter((node) => node !== undefined);
  }, [nodes, selectedIds]);

  const add = (id: string) => {
    onSelectionChange([...selectedIds, id]);
    setQuery('');
  };
  const remove = (id: string) => {
    onSelectionChange(selectedIds.filter((selected) => selected !== id));
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className="filter-expand"
        onClick={() => setCollapsed(false)}
        aria-expanded="false"
      >
        Filter{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
      </button>
    );
  }

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h2>Filter</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-expanded="true"
          aria-label="Collapse filters"
        >
          ‹
        </button>
      </div>

      <input
        type="search"
        placeholder="Search genres…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search genres"
      />

      {query.trim() !== '' && (
        <ul className="filter-matches" aria-label="Search results">
          {matches.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => add(node.id)}>
                {node.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="stub">No genres match.</li>}
        </ul>
      )}

      {selectedNodes.length > 0 && (
        <>
          <ul className="filter-selected" aria-label="Selected genres">
            {selectedNodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => remove(node.id)}
                  aria-label={`Remove ${node.name}`}
                >
                  {node.name} ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="stub">Showing only these genres and their subgenres.</p>
          <button
            type="button"
            className="filter-clear"
            onClick={() => onSelectionChange([])}
          >
            Clear filter
          </button>
        </>
      )}

      {selectedNodes.length === 0 && query.trim() === '' && (
        <p className="stub">
          Search for genres and select them to hide everything else on the map.
        </p>
      )}
    </div>
  );
}
