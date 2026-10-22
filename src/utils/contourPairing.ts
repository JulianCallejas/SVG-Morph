import type { Contour } from './contours';

/**
 * How a contour behaves during the animation:
 * - `morph`: interpolated between its source and target shape
 * - `swap`: shown as-is and replaced at `swapAt` (a hard cut, or a fade over `fadeWindow`)
 * - `static`: kept unchanged for the whole animation
 */
export type ContourMode = 'morph' | 'swap' | 'static';

/**
 * A hand-made correspondence inside a morphing pair: the point at `source` along the source
 * contour meets the point at `target` along the target contour. Both are fractions (0..1) of the
 * contour's length, so they survive a change of node count.
 */
export interface NodeAnchor {
  source: number;
  target: number;
}

/** Where a sliding contour leaves toward; the one that replaces it comes in from the opposite side. */
export type SlideDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'up-left'
  | 'up-right'
  | 'down-left'
  | 'down-right';

/**
 * A swap that moves instead of only fading: the source slides out toward `direction` while the
 * target slides in from the opposite side, over the entry's `fadeWindow`, around `swapAt`.
 */
export interface SlideTransition {
  type: 'slide';
  direction: SlideDirection;
  /** Also cross-fade the two while they move. */
  fade: boolean;
}

export interface ContourPlanEntry {
  sourceId: string | null;
  targetId: string | null;
  mode: ContourMode;
  /** Animation progress (0..1) at which a `swap` happens. */
  swapAt: number;
  /** Width of the opacity cross-fade around `swapAt`, as a fraction of the animation. 0 = hard cut. */
  fadeWindow: number;
  /** Nodes sampled along a morphing pair. Absent means automatic (see `autoNodeCount`). */
  nodeCount?: number;
  /** How a `swap` changes over. Absent means the opacity fade (a hard cut when `fadeWindow` is 0). */
  transition?: SlideTransition;
  /** Points the user matched by hand, sorted by `source`. Absent or empty means automatic alignment. */
  anchors?: NodeAnchor[];
}

export const DEFAULT_SWAP_AT = 0.5;
export const DEFAULT_FADE_WINDOW = 0;

// Pairs costing more than this are left unpaired. Cost is relative to the drawing size,
// so ~0.6 means "clearly a different place and size".
const MAX_PAIRING_COST = 0.6;
const SIZE_WEIGHT = 0.5;
const CLOSED_MISMATCH_COST = 0.25;

interface Metrics {
  cx: number;
  cy: number;
  diagonal: number;
}

const metricsOf = (contour: Contour): Metrics => ({
  cx: contour.bbox.x + contour.bbox.width / 2,
  cy: contour.bbox.y + contour.bbox.height / 2,
  diagonal: Math.hypot(contour.bbox.width, contour.bbox.height),
});

// Diagonal of the box that holds every contour of both sides; used to make costs scale-free.
const drawingDiagonal = (contours: Contour[]): number => {
  const minX = Math.min(...contours.map((c) => c.bbox.x));
  const minY = Math.min(...contours.map((c) => c.bbox.y));
  const maxX = Math.max(...contours.map((c) => c.bbox.x + c.bbox.width));
  const maxY = Math.max(...contours.map((c) => c.bbox.y + c.bbox.height));
  return Math.hypot(maxX - minX, maxY - minY);
};

/**
 * Suggest which source contour goes with which target contour.
 * Pairs are chosen greedily by lowest cost (distance between centers, size difference,
 * open/closed mismatch), each contour at most once. Paired entries default to `morph`,
 * leftovers to `swap`. Entries follow the source order, then unpaired targets.
 */
export function pairContours(source: Contour[], target: Contour[]): ContourPlanEntry[] {
  const entry = (
    sourceId: string | null,
    targetId: string | null,
    mode: ContourMode,
  ): ContourPlanEntry => ({
    sourceId,
    targetId,
    mode,
    swapAt: DEFAULT_SWAP_AT,
    fadeWindow: DEFAULT_FADE_WINDOW,
  });

  if (source.length === 0 || target.length === 0) {
    return [
      ...source.map((c) => entry(c.id, null, 'swap')),
      ...target.map((c) => entry(null, c.id, 'swap')),
    ];
  }

  const scale = drawingDiagonal([...source, ...target]) || 1;
  const sourceMetrics = source.map(metricsOf);
  const targetMetrics = target.map(metricsOf);

  const candidates: { s: number; t: number; cost: number }[] = [];
  source.forEach((sc, s) => {
    target.forEach((tc, t) => {
      const a = sourceMetrics[s];
      const b = targetMetrics[t];
      const distance = Math.hypot(a.cx - b.cx, a.cy - b.cy) / scale;
      const largest = Math.max(a.diagonal, b.diagonal) || 1;
      const sizeGap = Math.abs(a.diagonal - b.diagonal) / largest;
      const closedGap = sc.closed === tc.closed ? 0 : CLOSED_MISMATCH_COST;
      const cost = distance + SIZE_WEIGHT * sizeGap + closedGap;
      if (cost <= MAX_PAIRING_COST) candidates.push({ s, t, cost });
    });
  });

  // lowest cost first; ties keep document order so the result is deterministic
  candidates.sort((x, y) => x.cost - y.cost || x.s - y.s || x.t - y.t);

  const targetOfSource = new Map<number, number>();
  const usedTargets = new Set<number>();
  for (const { s, t } of candidates) {
    if (targetOfSource.has(s) || usedTargets.has(t)) continue;
    targetOfSource.set(s, t);
    usedTargets.add(t);
  }

  const plan = source.map((sc, s) => {
    const t = targetOfSource.get(s);
    return t === undefined ? entry(sc.id, null, 'swap') : entry(sc.id, target[t].id, 'morph');
  });
  target.forEach((tc, t) => {
    if (!usedTargets.has(t)) plan.push(entry(null, tc.id, 'swap'));
  });

  return plan;
}
