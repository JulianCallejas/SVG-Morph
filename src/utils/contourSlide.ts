import type { ContourBBox } from './contours';
import type { ContourPlanEntry, SlideDirection, SlideTransition } from './contourPairing';

/** A rectangle in the SVG's own units: the area a slide has to leave or enter. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SLIDE_DIRECTIONS: SlideDirection[] = [
  'left',
  'right',
  'up',
  'down',
  'up-left',
  'up-right',
  'down-left',
  'down-right',
];

// unit step of each direction, y growing downwards like SVG
const STEP: Record<SlideDirection, [x: number, y: number]> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
  'up-left': [-1, -1],
  'up-right': [1, -1],
  'down-left': [-1, 1],
  'down-right': [1, 1],
};

const BY_STEP = new Map(SLIDE_DIRECTIONS.map((d) => [STEP[d].join(','), d]));

export const oppositeDirection = (direction: SlideDirection): SlideDirection => {
  const [x, y] = STEP[direction];
  return BY_STEP.get([-x, -y].join(',')) as SlideDirection;
};

// Extra travel past the edge, as a fraction of the larger side of the bounds, so a thick stroke
// is gone too when the slide ends.
const EDGE_MARGIN = 0.05;

const round4 = (value: number): number => Math.round(value * 1e4) / 1e4;

/**
 * How far a shape with this box has to move toward `direction` to be completely outside `bounds`.
 * An axis the direction does not use stays at 0.
 */
export function offscreenOffset(
  bbox: ContourBBox,
  bounds: Bounds,
  direction: SlideDirection,
): { x: number; y: number } {
  const [stepX, stepY] = STEP[direction];
  const margin = Math.max(bounds.width, bounds.height) * EDGE_MARGIN;
  const x =
    stepX < 0
      ? -(bbox.x + bbox.width - bounds.x + margin)
      : stepX > 0
        ? bounds.x + bounds.width - bbox.x + margin
        : 0;
  const y =
    stepY < 0
      ? -(bbox.y + bbox.height - bounds.y + margin)
      : stepY > 0
        ? bounds.y + bounds.height - bbox.y + margin
        : 0;
  return { x: round4(x), y: round4(y) };
}

/**
 * How far a swap has moved, from 0 (the source in place) to 1 (the target in place), at this
 * progress: a ramp of `window` centered on `swapAt`. With no window it is a cut at `swapAt`.
 */
export function slideProgress(progress: number, swapAt: number, window: number): number {
  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
  const w = clamp01(window);
  if (w === 0) return progress < swapAt ? 0 : 1;
  return round4(clamp01((progress - (swapAt - w / 2)) / w));
}

/** The slide of a swap entry, when it has one: a slide needs a transition length to move over. */
export function slideOf(entry: ContourPlanEntry): SlideTransition | null {
  return entry.mode === 'swap' && entry.transition?.type === 'slide' && entry.fadeWindow > 0
    ? entry.transition
    : null;
}

/** Whether any entry of the plan slides, which is when the drawing needs clipping to its box. */
export const planSlides = (plan: ContourPlanEntry[]): boolean => plan.some((entry) => slideOf(entry) !== null);

/** The viewBox as bounds, or the size of the SVG when the viewBox is missing or unusable. */
export function parseViewBox(viewBox: string | undefined, width: number, height: number): Bounds {
  const parts = (viewBox ?? '').trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0
    ? { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
    : { x: 0, y: 0, width: width || 100, height: height || 100 };
}

export const VIEW_CLIP_ID = 'svgmorph-view';

/** `<clipPath>` that keeps the drawing inside its box, for plans that slide. Numbers only, nothing to escape. */
export const clipPathTag = (bounds: Bounds): string =>
  `<clipPath id="${VIEW_CLIP_ID}"><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" /></clipPath>`;
