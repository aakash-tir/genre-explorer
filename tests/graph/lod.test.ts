import { describe, expect, it } from 'vitest';
import {
  FULL_DETAIL_ZOOM,
  MAX_RADIUS,
  MIN_RADIUS,
  isLabelVisible,
  isNodeVisible,
  nodeRadius,
  popularityCutoff,
  resolveFilter,
  visibilityContext,
  visibleNodes,
} from '../../src/graph/lod';
import { EDGES, NODES, nodeById } from '../fixtures';

const ids = (nodes: { id: string }[]) => nodes.map((n) => n.id).sort();

describe('popularityCutoff', () => {
  it('falls as you zoom in', () => {
    expect(popularityCutoff(1)).toBeGreaterThan(popularityCutoff(4));
    expect(popularityCutoff(4)).toBeGreaterThan(popularityCutoff(16));
  });

  it('lets everything through at full detail', () => {
    expect(popularityCutoff(FULL_DETAIL_ZOOM)).toBeCloseTo(1, 5);
  });

  it('clamps below 1 and above the full-detail zoom', () => {
    expect(popularityCutoff(0.01)).toBe(popularityCutoff(1));
    expect(popularityCutoff(9999)).toBe(popularityCutoff(FULL_DETAIL_ZOOM));
  });
});

describe('node visibility by zoom', () => {
  it('shows only the biggest genres when fully zoomed out', () => {
    // "when zoomed out just show the big ones"
    const context = visibilityContext({ zoom: 1, focusId: null, selectedIds: [] }, EDGES);
    expect(ids(visibleNodes(NODES, context))).toEqual(['electronic', 'rock']);
  });

  it('reveals mid-sized genres partway in', () => {
    // At zoom 2 the cutoff is ~14,700: the family roots plus the mid-tier genres, but
    // not grunge (9,412), alternative dance (7,305) or melodic techno (4,210).
    const context = visibilityContext({ zoom: 2, focusId: null, selectedIds: [] }, EDGES);
    expect(ids(visibleNodes(NODES, context))).toEqual([
      'alternative-rock',
      'dance',
      'electronic',
      'rock',
      'techno',
    ]);
  });

  it('shows everything at full detail', () => {
    const context = visibilityContext(
      { zoom: FULL_DETAIL_ZOOM, focusId: null, selectedIds: [] },
      EDGES,
    );
    expect(visibleNodes(NODES, context)).toHaveLength(NODES.length);
  });
});

describe('focus overrides the zoom cutoff', () => {
  const context = visibilityContext(
    { zoom: 1, focusId: 'techno', selectedIds: [] },
    EDGES,
  );

  it('keeps the focused genre visible even though it is below the cutoff', () => {
    expect(isNodeVisible(nodeById('techno'), context)).toBe(true);
  });

  it('keeps its subgenres visible with them', () => {
    // "when a node is clicked and zoom in [...] still show some sub nodes if any"
    expect(isNodeVisible(nodeById('melodic-techno'), context)).toBe(true);
  });

  it('does not resurrect unrelated small genres', () => {
    expect(isNodeVisible(nodeById('grunge'), context)).toBe(false);
  });

  it('reveals a fusion child when either parent is focused', () => {
    for (const parent of ['alternative-rock', 'dance']) {
      const focused = visibilityContext(
        { zoom: 1, focusId: parent, selectedIds: [] },
        EDGES,
      );
      expect(isNodeVisible(nodeById('alternative-dance'), focused)).toBe(true);
    }
  });
});

describe('filter', () => {
  it('returns null when nothing is selected, meaning "no filtering"', () => {
    expect(resolveFilter([], EDGES)).toBeNull();
  });

  it('keeps the selected genre and its subgenres', () => {
    // "hide everything else that is not the the selected genre or sub genre to it"
    expect(resolveFilter(['techno'], EDGES)).toEqual(
      new Set(['techno', 'melodic-techno']),
    );
  });

  it('unions several selections', () => {
    expect(resolveFilter(['techno', 'rock'], EDGES)).toEqual(
      new Set(['techno', 'melodic-techno', 'rock', 'alternative-rock', 'grunge']),
    );
  });

  it('hides everything outside the selection, even at full zoom', () => {
    const context = visibilityContext(
      { zoom: FULL_DETAIL_ZOOM, focusId: null, selectedIds: ['techno'] },
      EDGES,
    );
    expect(ids(visibleNodes(NODES, context))).toEqual(['melodic-techno', 'techno']);
  });

  it('beats focus — the filter is a hard gate', () => {
    const context = visibilityContext(
      { zoom: 1, focusId: 'rock', selectedIds: ['techno'] },
      EDGES,
    );
    expect(isNodeVisible(nodeById('rock'), context)).toBe(false);
  });
});

describe('labels', () => {
  it('are stricter than dots — a node can be a speck before it earns a name', () => {
    // At zoom 1.3 the node cutoff is ~48,400 and the label cutoff twice that. Alternative
    // rock (84,210) is a drawn dot; techno and dance sit above the node cutoff too, but
    // only the two family roots clear the label cutoff.
    const context = visibilityContext(
      { zoom: 1.3, focusId: null, selectedIds: [] },
      EDGES,
    );
    const borderline = NODES.filter(
      (n) => isNodeVisible(n, context) && !isLabelVisible(n, context),
    ).map((n) => n.id);
    expect(borderline).toEqual(['alternative-rock', 'dance', 'techno']);
  });

  it('always label the focused genre and its children', () => {
    const context = visibilityContext(
      { zoom: 1, focusId: 'techno', selectedIds: [] },
      EDGES,
    );
    expect(isLabelVisible(nodeById('techno'), context)).toBe(true);
    expect(isLabelVisible(nodeById('melodic-techno'), context)).toBe(true);
  });

  it('never label a node that is not drawn', () => {
    const context = visibilityContext({ zoom: 1, focusId: null, selectedIds: [] }, EDGES);
    expect(isLabelVisible(nodeById('grunge'), context)).toBe(false);
  });
});

describe('nodeRadius', () => {
  it('is log-scaled, not linear', () => {
    // rock has 65x the popularity of alternative-dance but must not be 65x the radius.
    const ratio = nodeRadius(547091) / nodeRadius(7305);
    expect(ratio).toBeLessThan(2);
    expect(ratio).toBeGreaterThan(1);
  });

  it('is monotonic', () => {
    expect(nodeRadius(1000)).toBeGreaterThan(nodeRadius(100));
    expect(nodeRadius(100)).toBeGreaterThan(nodeRadius(10));
  });

  it('stays inside its bounds, including for a zero-popularity genre', () => {
    expect(nodeRadius(0)).toBeGreaterThanOrEqual(MIN_RADIUS);
    expect(nodeRadius(50_000_000)).toBeLessThanOrEqual(MAX_RADIUS);
  });
});
