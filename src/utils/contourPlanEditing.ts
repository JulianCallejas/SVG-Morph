import type { ContourBBox } from './contours';
import {
  DEFAULT_FADE_WINDOW,
  DEFAULT_SWAP_AT,
  type ContourPlanEntry,
  type NodeAnchor,
  type SlideTransition,
} from './contourPairing';
import { SLIDE_DIRECTIONS } from './contourSlide';
import { MAX_NODE_COUNT, MIN_NODE_COUNT, anchorsRealizable } from './contourInterpolation';
import type { StyledContour } from './contourSvg';

/** Human label of a contour: `P2` for a path with one contour, `P2.1` when it has several. */
export function contourLabel(id: string, contours: StyledContour[]): string {
  const contour = contours.find((c) => c.id === id);
  if (!contour) throw new Error(`Unknown contour "${id}"`);

  const siblings = contours.filter((c) => c.pathIndex === contour.pathIndex).length;
  const path = `P${contour.pathIndex + 1}`;
  return siblings === 1 ? path : `${path}.${id.split('.').pop()}`;
}

/** Color slot of every contour: both halves of a pair share the slot of their plan entry. */
export function colorIndexByContour(plan: ContourPlanEntry[]): Map<string, number> {
  const colors = new Map<string, number>();
  plan.forEach((entry, index) => {
    if (entry.sourceId) colors.set(entry.sourceId, index);
    if (entry.targetId) colors.set(entry.targetId, index);
  });
  return colors;
}

export interface PathBox {
  pathIndex: number;
  label: string;
  bbox: ContourBBox;
}

/** The box that holds every contour of each `<path>`, in path order. */
export function pathBoxes(contours: StyledContour[]): PathBox[] {
  const byPath = new Map<number, StyledContour[]>();
  for (const contour of contours) {
    byPath.set(contour.pathIndex, [...(byPath.get(contour.pathIndex) ?? []), contour]);
  }

  return [...byPath.entries()].map(([pathIndex, members]) => {
    const minX = Math.min(...members.map((c) => c.bbox.x));
    const minY = Math.min(...members.map((c) => c.bbox.y));
    const maxX = Math.max(...members.map((c) => c.bbox.x + c.bbox.width));
    const maxY = Math.max(...members.map((c) => c.bbox.y + c.bbox.height));
    return {
      pathIndex,
      label: `P${pathIndex + 1}`,
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    };
  });
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// Source order first, then the target-only entries in target order: the same order pairContours uses.
function sortPlan(
  plan: ContourPlanEntry[],
  source: StyledContour[],
  target: StyledContour[],
): ContourPlanEntry[] {
  const sourceOrder = new Map(source.map((c, i) => [c.id, i]));
  const targetOrder = new Map(target.map((c, i) => [c.id, i]));
  const rank = (entry: ContourPlanEntry): number =>
    entry.sourceId !== null
      ? (sourceOrder.get(entry.sourceId) ?? 0)
      : source.length + (targetOrder.get(entry.targetId as string) ?? 0);

  return [...plan].sort((a, b) => rank(a) - rank(b));
}

const requireContour = (contours: StyledContour[], id: string): void => {
  if (!contours.some((c) => c.id === id)) throw new Error(`Unknown contour "${id}"`);
};

/**
 * Pair a source contour with a target contour as a morph. Each contour belongs to one entry
 * only, so whatever they were paired with before is kept as an unpaired swap, never dropped.
 */
export function pairManually(
  plan: ContourPlanEntry[],
  sourceId: string,
  targetId: string,
  source: StyledContour[],
  target: StyledContour[],
): ContourPlanEntry[] {
  requireContour(source, sourceId);
  requireContour(target, targetId);

  if (plan.some((e) => e.sourceId === sourceId && e.targetId === targetId)) return plan;

  const detached = plan.flatMap((entry): ContourPlanEntry[] => {
    const nextSource = entry.sourceId === sourceId ? null : entry.sourceId;
    const nextTarget = entry.targetId === targetId ? null : entry.targetId;
    if (nextSource === entry.sourceId && nextTarget === entry.targetId) return [entry];
    if (nextSource === null && nextTarget === null) return [];
    // a morph needs both sides, so a half-left entry becomes a swap
    return [
      {
        ...entry,
        sourceId: nextSource,
        targetId: nextTarget,
        mode: entry.mode === 'morph' ? 'swap' : entry.mode,
      },
    ];
  });

  const pair: ContourPlanEntry = {
    sourceId,
    targetId,
    mode: 'morph',
    swapAt: DEFAULT_SWAP_AT,
    fadeWindow: DEFAULT_FADE_WINDOW,
  };
  return sortPlan([...detached, pair], source, target);
}

/** Split a pair into its two contours, each an unpaired swap that keeps the pair's settings. */
export function unpairEntry(
  plan: ContourPlanEntry[],
  index: number,
  source: StyledContour[],
  target: StyledContour[],
): ContourPlanEntry[] {
  if (index < 0 || index >= plan.length) throw new RangeError(`No plan entry at index ${index}`);

  const entry = plan[index];
  if (entry.sourceId === null || entry.targetId === null) return plan;

  // the matched points only mean something while the two contours are together
  const settings = { ...entry };
  delete settings.anchors;
  const halves: ContourPlanEntry[] = [
    { ...settings, targetId: null, mode: 'swap' },
    { ...settings, sourceId: null, mode: 'swap' },
  ];
  return sortPlan([...plan.slice(0, index), ...halves, ...plan.slice(index + 1)], source, target);
}

function pairedEntry(plan: ContourPlanEntry[], index: number): ContourPlanEntry {
  if (index < 0 || index >= plan.length) throw new RangeError(`No plan entry at index ${index}`);
  const entry = plan[index];
  if (entry.sourceId === null || entry.targetId === null) {
    throw new Error('Only a pair of contours has points to match');
  }
  return entry;
}

const withAnchors = (
  plan: ContourPlanEntry[],
  index: number,
  anchors: NodeAnchor[],
): ContourPlanEntry[] =>
  plan.map((entry, i) => {
    if (i !== index) return entry;
    const next: ContourPlanEntry = { ...entry, anchors };
    if (anchors.length === 0) delete next.anchors;
    return next;
  });

/**
 * Match a point of the source contour with a point of the target contour inside one pair. Matching
 * a source point again replaces its partner. Throws when the points would cross the ones already
 * matched (the plan is left as it was).
 */
export function setAnchor(
  plan: ContourPlanEntry[],
  index: number,
  anchor: NodeAnchor,
  source: StyledContour[],
  target: StyledContour[],
): ContourPlanEntry[] {
  const entry = pairedEntry(plan, index);
  if (![anchor.source, anchor.target].every((f) => Number.isFinite(f) && f >= 0 && f <= 1)) {
    throw new RangeError('A matched point must sit between 0 and 1 along its contour');
  }

  const from = source.find((c) => c.id === entry.sourceId);
  const to = target.find((c) => c.id === entry.targetId);
  if (!from || !to) throw new Error('The pair refers to a contour that does not exist');

  const kept = (entry.anchors ?? []).filter((a) => Math.abs(a.source - anchor.source) > 1e-9);
  const anchors = [...kept, anchor].sort((a, b) => a.source - b.source);
  if (!anchorsRealizable(from, to, anchors)) {
    throw new Error('Those points cross points that are already matched; remove one of them first');
  }
  return withAnchors(plan, index, anchors);
}

/** Drop one matched point of a pair. */
export function removeAnchor(plan: ContourPlanEntry[], index: number, anchorIndex: number): ContourPlanEntry[] {
  const entry = pairedEntry(plan, index);
  const anchors = entry.anchors ?? [];
  if (anchorIndex < 0 || anchorIndex >= anchors.length) {
    throw new RangeError(`No matched point at index ${anchorIndex}`);
  }
  return withAnchors(plan, index, anchors.filter((_, i) => i !== anchorIndex));
}

/** Back to the automatic alignment of a pair. */
export function clearAnchors(plan: ContourPlanEntry[], index: number): ContourPlanEntry[] {
  pairedEntry(plan, index);
  return withAnchors(plan, index, []);
}

/** `nodeCount: null` goes back to automatic, `transition: null` back to the plain fade. */
export type EntryPatch = Partial<Pick<ContourPlanEntry, 'mode' | 'swapAt' | 'fadeWindow'>> & {
  nodeCount?: number | null;
  transition?: SlideTransition | null;
};

/**
 * Change the mode, swap point, fade window, slide or node count of one entry. swapAt and fadeWindow are
 * clamped to 0..1, a manual node count to a whole number within the allowed range.
 */
export function updateEntry(
  plan: ContourPlanEntry[],
  index: number,
  patch: EntryPatch,
): ContourPlanEntry[] {
  if (index < 0 || index >= plan.length) throw new RangeError(`No plan entry at index ${index}`);

  const entry = plan[index];
  if (patch.mode === 'morph' && (entry.sourceId === null || entry.targetId === null)) {
    throw new Error('A contour needs both a source and a target to morph');
  }

  const next: ContourPlanEntry = {
    ...entry,
    ...(patch.mode !== undefined && { mode: patch.mode }),
    ...(patch.swapAt !== undefined && { swapAt: clamp01(patch.swapAt) }),
    ...(patch.fadeWindow !== undefined && { fadeWindow: clamp01(patch.fadeWindow) }),
  };
  if (patch.transition === null) {
    delete next.transition;
  } else if (patch.transition !== undefined) {
    if (patch.transition.type !== 'slide' || !SLIDE_DIRECTIONS.includes(patch.transition.direction)) {
      throw new RangeError('A slide goes left, right, up, down or along a diagonal');
    }
    next.transition = { type: 'slide', direction: patch.transition.direction, fade: patch.transition.fade === true };
  }
  if (patch.nodeCount === null) {
    delete next.nodeCount;
  } else if (patch.nodeCount !== undefined) {
    next.nodeCount = Math.min(MAX_NODE_COUNT, Math.max(MIN_NODE_COUNT, Math.round(patch.nodeCount)));
  }
  return plan.map((e, i) => (i === index ? next : e));
}
