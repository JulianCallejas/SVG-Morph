import { getPointAtLength, getTotalLength, parsePathString } from 'svg-path-commander';
import type { Contour } from './contours';
import type { ContourPlanEntry } from './contourPairing';

export interface InterpolateContoursOptions {
  /** Nodes for every morphing pair that does not set its own. Absent means automatic. */
  nodeCount?: number;
}

// Bounds of a manual node count, and of the automatic one (a straight line still needs enough
// nodes to bend into a curve).
export const MIN_NODE_COUNT = 8;
export const MAX_NODE_COUNT = 300;
export const MIN_AUTO_NODE_COUNT = 32;
const NODES_PER_SEGMENT = 8;

/** One shape to draw for the current frame. */
export interface RenderedContour {
  /** `s~t` for a morphing pair, otherwise the id of the single contour shown. */
  id: string;
  /** Source contour this shape comes from, so callers can look up its style. */
  sourceId: string | null;
  targetId: string | null;
  d: string;
  opacity: number;
}

export interface Point {
  x: number;
  y: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

// Sampling a contour is the expensive part and the animation re-renders every frame,
// so samples are cached per contour object and node count.
const sampleCache = new WeakMap<Contour, Map<number, Point[]>>();

/** `nodeCount + 1` points evenly spaced along a contour; the same points the morph uses. */
export function sampleContour(contour: Contour, nodeCount: number): Point[] {
  let byCount = sampleCache.get(contour);
  if (!byCount) {
    byCount = new Map();
    sampleCache.set(contour, byCount);
  }
  const cached = byCount.get(nodeCount);
  if (cached) return cached;

  const path = parsePathString(contour.d);
  const totalLength = getTotalLength(path);
  const points: Point[] = [];
  for (let i = 0; i <= nodeCount; i++) {
    const { x, y } = getPointAtLength(path, (i / nodeCount) * totalLength);
    points.push({ x, y });
  }

  byCount.set(nodeCount, points);
  return points;
}

const segmentCache = new WeakMap<Contour, number>();

function segmentCount(contour: Contour): number {
  let count = segmentCache.get(contour);
  if (count === undefined) {
    count = parsePathString(contour.d).length;
    segmentCache.set(contour, count);
  }
  return count;
}

/** Automatic node count for a pair: enough for the more complex of the two sides. */
export function autoNodeCount(source: Contour, target: Contour): number {
  const wanted = Math.max(segmentCount(source), segmentCount(target)) * NODES_PER_SEGMENT;
  return Math.min(MAX_NODE_COUNT, Math.max(MIN_AUTO_NODE_COUNT, wanted));
}

/** Node count of a morphing pair: the entry's own, else the option, else automatic. */
export function resolveNodeCount(
  entry: ContourPlanEntry,
  source: Contour,
  target: Contour,
  options: InterpolateContoursOptions = {},
): number {
  const nodeCount = entry.nodeCount ?? options.nodeCount ?? autoNodeCount(source, target);
  if (!Number.isInteger(nodeCount) || nodeCount < 1) {
    throw new RangeError(`nodeCount must be an integer of at least 1, got ${nodeCount}`);
  }
  return nodeCount;
}

function pointsToPath(points: Point[], closed: boolean): string {
  const [first, ...rest] = points;
  const fmt = (p: Point) => `${roundTo(p.x, 3)},${roundTo(p.y, 3)}`;
  const d = `M${fmt(first)} ${rest.map((p) => `L${fmt(p)}`).join(' ')}`;
  return closed ? `${d} Z` : d;
}

function morphContour(
  source: Contour,
  target: Contour,
  progress: number,
  nodeCount: number,
): RenderedContour {
  const from = sampleContour(source, nodeCount);
  const to = sampleContour(target, nodeCount);
  const points = from.map((p, i) => ({
    x: p.x + (to[i].x - p.x) * progress,
    y: p.y + (to[i].y - p.y) * progress,
  }));
  // the open/closed state flips halfway when the two sides disagree
  const closed = progress < 0.5 ? source.closed : target.closed;

  return {
    id: `${source.id}~${target.id}`,
    sourceId: source.id,
    targetId: target.id,
    d: pointsToPath(points, closed),
    opacity: 1,
  };
}

// Opacity of the source side of a swap: 1 before the swap, 0 after, linear across the fade window.
function sourceOpacityAt(progress: number, swapAt: number, fadeWindow: number): number {
  const window = clamp01(fadeWindow);
  if (window === 0) return progress < swapAt ? 1 : 0;
  return roundTo(clamp01((swapAt + window / 2 - progress) / window), 4);
}

function swapContours(
  source: Contour | undefined,
  target: Contour | undefined,
  entry: ContourPlanEntry,
  progress: number,
): RenderedContour[] {
  const fromOpacity = sourceOpacityAt(progress, clamp01(entry.swapAt), entry.fadeWindow);
  const toOpacity = roundTo(1 - fromOpacity, 4);

  const items: RenderedContour[] = [];
  if (source && fromOpacity > 0) {
    items.push({ id: source.id, sourceId: source.id, targetId: null, d: source.d, opacity: fromOpacity });
  }
  if (target && toOpacity > 0) {
    items.push({ id: target.id, sourceId: null, targetId: target.id, d: target.d, opacity: toOpacity });
  }
  return items;
}

function lookup(contours: Contour[], id: string | null, side: string): Contour | undefined {
  if (id === null) return undefined;
  const contour = contours.find((c) => c.id === id);
  if (!contour) throw new Error(`Unknown ${side} contour "${id}" in the contour plan`);
  return contour;
}

/**
 * Resolve a contour plan at `progress` (0..1) into the shapes to draw for that frame.
 * Pure: no DOM, no worker, so the worker, the synchronous fallback and the exports share it.
 * Throws if the plan references a contour that does not exist.
 */
export function interpolateContours(
  plan: ContourPlanEntry[],
  source: Contour[],
  target: Contour[],
  progress: number,
  options: InterpolateContoursOptions = {},
): RenderedContour[] {
  const t = clamp01(progress);

  return plan.flatMap((entry): RenderedContour[] => {
    const from = lookup(source, entry.sourceId, 'source');
    const to = lookup(target, entry.targetId, 'target');
    if (!from && !to) throw new Error('A contour plan entry needs a source or a target contour');

    if (entry.mode === 'static') {
      const shown = (from ?? to) as Contour;
      return [
        { id: shown.id, sourceId: from?.id ?? null, targetId: from ? null : shown.id, d: shown.d, opacity: 1 },
      ];
    }
    if (entry.mode === 'morph' && from && to) {
      return [morphContour(from, to, t, resolveNodeCount(entry, from, to, options))];
    }
    // a swap, or a morph that lost one of its sides
    return swapContours(from, to, entry, t);
  });
}
