/**
 * Label placement — which labels actually get drawn this frame.
 *
 * `lod.ts` decides which nodes have EARNED a label; this module decides which of
 * those fit without piling on top of each other (the image-2 problem from the UI
 * review: a dense neighbourhood turned labels into an unreadable smear). Greedy by
 * priority: higher-priority labels claim their rectangle first, and anything that
 * would overlap a claimed rectangle is dropped. Dropping is fine — a hidden label
 * reappears the moment the camera gives it room.
 *
 * Pure and frame-independent so it stays unit-testable; the canvas measures text
 * and passes screen-space rectangles in.
 */

export interface LabelCandidate {
  id: string;
  /** Screen-space bounding box of the rendered label. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Higher wins. The canvas passes popularity, with focus boosted above everything. */
  priority: number;
}

/** Breathing room enforced between label boxes, in px. */
export const LABEL_GAP = 2;

function overlaps(a: LabelCandidate, b: LabelCandidate): boolean {
  return (
    a.x - LABEL_GAP < b.x + b.width &&
    a.x + a.width + LABEL_GAP > b.x &&
    a.y - LABEL_GAP < b.y + b.height &&
    a.y + a.height + LABEL_GAP > b.y
  );
}

/** Ids of the candidates that get drawn. Deterministic: ties break on id. */
export function placeLabels(candidates: readonly LabelCandidate[]): Set<string> {
  const ranked = [...candidates].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
  const placed: LabelCandidate[] = [];
  const visible = new Set<string>();
  for (const candidate of ranked) {
    if (placed.some((existing) => overlaps(candidate, existing))) continue;
    placed.push(candidate);
    visible.add(candidate.id);
  }
  return visible;
}
