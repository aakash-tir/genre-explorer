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
  it('shows only the bigger genres when fully zoomed out', () => {
    // "when zoomed out just show the big ones" — at zoom 1 the cutoff is ~20,000
    // (10^4.3), which admits the roots and the strong mid-tier but not the tail.
    const context = visibilityContext({ zoom: 1, focusId: null, selectedIds: [] }, EDGES);
    expect(ids(visibleNodes(NODES, context))).toEqual([
      'alternative-rock',
      'dance',
      'electronic',
      'rock',
      'techno',
    ]);
    // The tail stays hidden (it renders as dust, but dust is not "visible").
    expect(ids(visibleNodes(NODES, context))).not.toContain('grunge');
  });

  it('reveals the tail as the camera comes in', () => {
    // At zoom 1.5 the cutoff is ~9,500: grunge (9,412) is still out, alternative
    // dance (7,305) and melodic techno (4,210) further out still.
    const at15 = visibilityContext({ zoom: 1.5, focusId: null, selectedIds: [] }, EDGES);
    expect(ids(visibleNodes(NODES, at15))).not.toContain('melodic-techno');
    // By zoom 2 the cutoff is ~3,900 and the whole fixture clears it.
    const at2 = visibilityContext({ zoom: 2, focusId: null, selectedIds: [] }, EDGES);
    expect(visibleNodes(NODES, at2)).toHaveLength(NODES.length);
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
    // At zoom 2.5 the node cutoff is ~2,250 and the label cutoff twice that:
    // melodic techno (4,210) is a drawn dot without a name.
    const context = visibilityContext(
      { zoom: 2.5, focusId: null, selectedIds: [] },
      EDGES,
    );
    const borderline = NODES.filter(
      (n) => isNodeVisible(n, context) && !isLabelVisible(n, context),
    ).map((n) => n.id);
    expect(borderline).toEqual(['melodic-techno']);
  });

  it('always label a visible family root — landmarks need names', () => {
    const context = visibilityContext({ zoom: 1, focusId: null, selectedIds: [] }, EDGES);
    expect(isLabelVisible(nodeById('rock'), context)).toBe(true);
    expect(isLabelVisible(nodeById('electronic'), context)).toBe(true);
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
