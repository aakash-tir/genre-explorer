/**
 * Stage 8 — validate and write `public/data/graph.json`.
 *
 * Two gates, for two different failure modes:
 *
 *   - Zod validation catches MALFORMED output (a shape bug in the pipeline).
 *   - The sharp-drop guard catches PLAUSIBLE-BUT-EMPTY output — the failure that
 *     actually matters here. A MusicBrainz HTML change silently empties the scraper and
 *     yields a perfectly valid dataset of orphan dust; only comparing against the last
 *     committed dataset notices.
 */
import { readFile, writeFile } from 'node:fs/promises';

import { GraphDataset } from '../../src/types';

import { MAX_SHRINK_RATIO } from './config';

export const GRAPH_PATH = 'public/data/graph.json';

/**
 * Counts below this are treated as "no meaningful previous dataset" — the hand-written
 * sample the repo started with must not anchor the guard.
 */
const GUARD_FLOOR = 100;

export async function emitGraph(dataset: GraphDataset): Promise<void> {
  const parsed = GraphDataset.parse(dataset);

  let previous: GraphDataset | null = null;
  try {
    previous = GraphDataset.parse(JSON.parse(await readFile(GRAPH_PATH, 'utf8')));
  } catch {
    // No committed dataset (or an invalid one) — nothing to guard against.
  }

  if (previous) {
    const check = (label: string, before: number, after: number) => {
      if (before < GUARD_FLOOR) return;
      const floor = before * (1 - MAX_SHRINK_RATIO);
      if (after < floor) {
        throw new Error(
          `Sharp-drop guard: ${label} fell from ${before} to ${after} ` +
            `(> ${MAX_SHRINK_RATIO * 100}% shrink). If MusicBrainz genuinely removed ` +
            'this much, raise MAX_SHRINK_RATIO for one run; otherwise the scraper is ' +
            'broken — check the parser fixtures.',
        );
      }
    };
    check('node count', previous.nodes.length, parsed.nodes.length);
    check('edge count', previous.edges.length, parsed.edges.length);
  }

  // Compact JSON: at ~1,000 nodes pretty-printing costs ~3× the bytes, and the 400 KB
  // pre-gzip budget for first paint outranks diff readability on a generated artifact.
  const body = JSON.stringify(parsed);
  await writeFile(GRAPH_PATH, body + '\n', 'utf8');

  const kb = Math.round((body.length / 1024) * 10) / 10;
  console.log(
    `  emitted ${GRAPH_PATH}: ${parsed.nodes.length} nodes, ` +
      `${parsed.edges.length} edges, ${kb} KB`,
  );
  if (kb > 400) {
    console.warn(
      `  WARNING: graph.json is ${kb} KB, over the 400 KB pre-gzip budget ` +
        '(docs/research/hosting.md). Consider raising MIN_RELEASE_GROUPS.',
    );
  }
}
