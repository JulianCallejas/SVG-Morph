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

const SAMPLE_NUDGE = 1e-3;

// `d` of a closed contour with its trailing Z replaced by a line back to the starting point.
function closeWithLine(d: string, parsed: ReturnType<typeof parsePathString>): string {
  const [, x, y] = parsed[0] as unknown as [string, number, number];
  return d.replace(/[Zz]\s*$/, `L${x} ${y}`);
}

/** `nodeCount + 1` points evenly spaced along a contour; the same points the morph uses. */
export function sampleContour(contour: Contour, nodeCount: number): Point[] {
  let byCount = sampleCache.get(contour);
  if (!byCount) {
    byCount = new Map();
    sampleCache.set(contour, byCount);
  }
  const cached = byCount.get(nodeCount);
  if (cached) return cached;

  // svg-path-commander answers wrongly for the closing segment of a `Z` path (it returns the start
  // point), so a closed contour is sampled with its closing edge written out as a line.
  const first = parsePathString(contour.d);
  const path = contour.closed ? parsePathString(closeWithLine(contour.d, first)) : first;
  const totalLength = getTotalLength(path);
  // ...and when a distance lands exactly on a vertex it returns the end of the next segment, so the
  // inner samples are nudged forward by an amount far below anything visible.
  const nudge = Math.min(SAMPLE_NUDGE, totalLength / (nodeCount * 4));
  const points: Point[] = [];
  for (let i = 0; i <= nodeCount; i++) {
    const distance = i === 0 ? 0 : i === nodeCount ? totalLength : (i / nodeCount) * totalLength + nudge;
    const { x, y } = getPointAtLength(path, distance);
    points.push({ x, y });
  }

  byCount.set(nodeCount, points);
  return points;
}

const squaredDistance = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Reorders the target nodes so node i of the target sits as close as possible to node i of the
// source. Two closed contours may also start anywhere and run either way round; otherwise only
// the direction can flip. Ties keep the original order, so identical contours are not touched.
function alignToSource(from: Point[], to: Point[], bothClosed: boolean): Point[] {
  const n = from.length - 1;

  if (bothClosed && n >= 1) {
    // a closed contour's last sample repeats its first: work on the n distinct nodes
    let best = { cost: Infinity, reversed: false, shift: 0 };
    for (const reversed of [false, true]) {
      for (let shift = 0; shift < n; shift++) {
        let cost = 0;
        for (let i = 0; i < n && cost < best.cost; i++) {
          const j = reversed ? (((shift - i) % n) + n) % n : (shift + i) % n;
          cost += squaredDistance(from[i], to[j]);
        }
        if (cost < best.cost) best = { cost, reversed, shift };
      }
    }
    const aligned = Array.from({ length: n }, (_, i) => {
      const j = best.reversed ? (((best.shift - i) % n) + n) % n : (best.shift + i) % n;
      return to[j];
    });
    return [...aligned, aligned[0]];
  }

  const cost = (candidate: Point[]) =>
    candidate.reduce((sum, point, i) => sum + squaredDistance(from[i], point), 0);
  const reversed = [...to].reverse();
  return cost(reversed) < cost(to) ? reversed : to;
}

const alignCache = new WeakMap<Contour, WeakMap<Contour, Map<number, Point[]>>>();

/**
 * The nodes a pair morphs between: `from` are the source samples, `to` the target samples
 * reordered (reversed and, for closed contours, rotated) to untwist the morph. Cached per pair
 * and node count.
 */
export function pairNodes(
  source: Contour,
  target: Contour,
  nodeCount: number,
): { from: Point[]; to: Point[] } {
  const from = sampleContour(source, nodeCount);

  let byTarget = alignCache.get(source);
  if (!byTarget) {
    byTarget = new WeakMap();
    alignCache.set(source, byTarget);
  }
  let byCount = byTarget.get(target);
  if (!byCount) {
    byCount = new Map();
    byTarget.set(target, byCount);
  }
  let to = byCount.get(nodeCount);
  if (!to) {
    to = alignToSource(from, sampleContour(target, nodeCount), source.closed && target.closed);
    byCount.set(nodeCount, to);
  }
  return { from, to };
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

/** `M x,y L x,y ...` for a list of nodes, closed with `Z` when asked. */
export function pointsToPath(points: Point[], closed: boolean): string {
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
  const { from, to } = pairNodes(source, target, nodeCount);
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
export function sourceOpacityAt(progress: number, swapAt: number, fadeWindow: number): number {
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

/** The contour with this id, undefined for a null id, and an error for an id that does not exist. */
export function findContour<T extends Contour>(contours: T[], id: string | null, side: string): T | undefined {
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
    const from = findContour(source, entry.sourceId, 'source');
    const to = findContour(target, entry.targetId, 'target');
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
