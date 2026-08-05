import { describe, expect, it } from 'vitest';
import {
  drawnEdges,
  focusChildren,
  isAssociative,
  isDrawn,
  structuralDescendants,
  structuralParent,
  structuralParentConflicts,
} from '../../src/graph/edges';
import { EDGES } from '../fixtures';
import type { GenreEdge } from '../../src/types';

describe('relation classification', () => {
  it('draws only subgenre relations', () => {
    expect(isDrawn({ source: 'a', target: 'b', kind: 'subgenre' })).toBe(true);
    expect(isDrawn({ source: 'a', target: 'b', kind: 'fusion' })).toBe(false);
    expect(isDrawn({ source: 'a', target: 'b', kind: 'influence' })).toBe(false);
  });

  it('treats fusion and influence as associative', () => {
    expect(isAssociative({ source: 'a', target: 'b', kind: 'fusion' })).toBe(true);
    expect(isAssociative({ source: 'a', target: 'b', kind: 'influence' })).toBe(true);
    expect(isAssociative({ source: 'a', target: 'b', kind: 'subgenre' })).toBe(false);
  });
});

describe('drawnEdges — the core rule', () => {
  const drawn = drawnEdges(EDGES);

  it('keeps every structural edge', () => {
    expect(drawn).toHaveLength(5);
  });

  it('never draws an edge to a fusion genre', () => {
    // The original plan: "If a sub genre is a mix of 2 big genre don't try to connect
    // the 2 with a displayed edge."
    const touchingFusion = drawn.filter(
      (e) => e.target === 'alternative-dance' || e.source === 'alternative-dance',
    );
    expect(touchingFusion).toEqual([]);
  });

  it('never draws an influence edge, even between two drawn nodes', () => {
    // rock -> grunge exists as an influence AND rock -> alternative-rock -> grunge
    // exists structurally. Drawing the influence would imply grunge has two parents.
    const rockToGrunge = drawn.find((e) => e.source === 'rock' && e.target === 'grunge');
    expect(rockToGrunge).toBeUndefined();
  });

  it('deduplicates a pair that has both a structural and an associative relation', () => {
    const withDuplicate: GenreEdge[] = [
      { source: 'rock', target: 'punk', kind: 'subgenre' },
      { source: 'rock', target: 'punk', kind: 'subgenre' },
      { source: 'rock', target: 'punk', kind: 'influence' },
    ];
    expect(drawnEdges(withDuplicate)).toHaveLength(1);
  });
});

describe('structuralParent', () => {
  it('finds the subgenre-of parent', () => {
    expect(structuralParent('grunge', EDGES)).toBe('alternative-rock');
    expect(structuralParent('melodic-techno', EDGES)).toBe('techno');
  });

  it('returns null for a family root', () => {
    expect(structuralParent('rock', EDGES)).toBeNull();
    expect(structuralParent('electronic', EDGES)).toBeNull();
  });

  it('returns null for a pure fusion genre — it has no drawn parent', () => {
    expect(structuralParent('alternative-dance', EDGES)).toBeNull();
  });

  it('flags a genre given two structural parents as a data problem', () => {
    const bad: GenreEdge[] = [
      { source: 'rock', target: 'grunge', kind: 'subgenre' },
      { source: 'metal', target: 'grunge', kind: 'subgenre' },
    ];
    const conflicts = structuralParentConflicts(bad);
    expect(conflicts.get('grunge')).toEqual(['rock', 'metal']);
  });

  it('reports no conflicts for a well-formed graph', () => {
    expect(structuralParentConflicts(EDGES).size).toBe(0);
  });
});

describe('focusChildren — the other half of the rule', () => {
  it('reveals structural children on focus', () => {
    expect(focusChildren('electronic', EDGES)).toEqual(['dance', 'techno']);
  });

  it('reveals a fusion genre under BOTH its parents', () => {
    // "if zoomed into each category 1 at a time show them in both"
    expect(focusChildren('alternative-rock', EDGES)).toContain('alternative-dance');
    expect(focusChildren('dance', EDGES)).toContain('alternative-dance');
  });

  it('puts structural children before associative ones', () => {
    // alternative-rock has grunge structurally and alternative-dance by fusion.
    expect(focusChildren('alternative-rock', EDGES)).toEqual([
      'grunge',
      'alternative-dance',
    ]);
  });

  it('returns an empty list for a leaf', () => {
    expect(focusChildren('melodic-techno', EDGES)).toEqual([]);
  });

  it('does not list a genre twice when two relations connect the same pair', () => {
    const both: GenreEdge[] = [
      { source: 'rock', target: 'grunge', kind: 'subgenre' },
      { source: 'rock', target: 'grunge', kind: 'influence' },
    ];
    expect(focusChildren('rock', both)).toEqual(['grunge']);
  });
});

describe('structuralDescendants', () => {
  it('includes the genre itself', () => {
    expect(structuralDescendants('melodic-techno', EDGES)).toEqual(
      new Set(['melodic-techno']),
    );
  });

  it('walks the whole structural subtree', () => {
    expect(structuralDescendants('electronic', EDGES)).toEqual(
      new Set(['electronic', 'dance', 'techno', 'melodic-techno']),
    );
  });

  it('excludes fusion children — a fused genre is not inside its parents', () => {
    expect(structuralDescendants('dance', EDGES).has('alternative-dance')).toBe(false);
  });

  it('terminates on a cyclic graph instead of hanging', () => {
    const cyclic: GenreEdge[] = [
      { source: 'a', target: 'b', kind: 'subgenre' },
      { source: 'b', target: 'c', kind: 'subgenre' },
      { source: 'c', target: 'a', kind: 'subgenre' },
    ];
    expect(structuralDescendants('a', cyclic)).toEqual(new Set(['a', 'b', 'c']));
  });
});
