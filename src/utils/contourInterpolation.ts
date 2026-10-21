import { getPointAtLength, getTotalLength, parsePathString } from 'svg-path-commander';
import type { Contour } from './contours';
import type { ContourPlanEntry } from './contourPairing';

export interface InterpolateContoursOptions {
  /** Nodes sampled along each morphing contour. Defaults to the 100 the worker already uses. */
  nodeCount?: number;
}

/** One shape to draw for the current frame. */
export interface RenderedContour {
  /** `s~t` for a morphing pair, otherwise the id of the single contour shown. */
  id: string;
  d: string;
  opacity: number;
}

export const DEFAULT_NODE_COUNT = 100;

interface Point {
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

function sampleContour(contour: Contour, nodeCount: number): Point[] {
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

  return { id: `${source.id}~${target.id}`, d: pointsToPath(points, closed), opacity: 1 };
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
  if (source && fromOpacity > 0) items.push({ id: source.id, d: source.d, opacity: fromOpacity });
  if (target && toOpacity > 0) items.push({ id: target.id, d: target.d, opacity: toOpacity });
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
  const nodeCount = options.nodeCount ?? DEFAULT_NODE_COUNT;
  if (!Number.isInteger(nodeCount) || nodeCount < 1) {
    throw new RangeError(`nodeCount must be an integer of at least 1, got ${nodeCount}`);
  }
  const t = clamp01(progress);

  return plan.flatMap((entry): RenderedContour[] => {
    const from = lookup(source, entry.sourceId, 'source');
    const to = lookup(target, entry.targetId, 'target');
    if (!from && !to) throw new Error('A contour plan entry needs a source or a target contour');

    if (entry.mode === 'static') {
      const shown = (from ?? to) as Contour;
      return [{ id: shown.id, d: shown.d, opacity: 1 }];
    }
    if (entry.mode === 'morph' && from && to) {
      return [morphContour(from, to, t, nodeCount)];
    }
    // a swap, or a morph that lost one of its sides
    return swapContours(from, to, entry, t);
  });
}
