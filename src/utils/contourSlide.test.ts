import { describe, expect, it } from 'vitest';
import type { ContourPlanEntry } from './contourPairing';
import {
  SLIDE_DIRECTIONS,
  offscreenOffset,
  oppositeDirection,
  parseViewBox,
  planSlides,
  slideOf,
  slideProgress,
} from './contourSlide';

const bounds = { x: 0, y: 0, width: 100, height: 100 };
const box = { x: 40, y: 30, width: 20, height: 10 };

const swap = (overrides: Partial<ContourPlanEntry> = {}): ContourPlanEntry => ({
  sourceId: 's1',
  targetId: 't1',
  mode: 'swap',
  swapAt: 0.5,
  fadeWindow: 0.2,
  transition: { type: 'slide', direction: 'left', fade: false },
  ...overrides,
});

describe('oppositeDirection', () => {
  it('flips every direction and flips back', () => {
    expect(oppositeDirection('left')).toBe('right');
    expect(oppositeDirection('up')).toBe('down');
    expect(oppositeDirection('up-left')).toBe('down-right');
    expect(oppositeDirection('down-left')).toBe('up-right');
    for (const direction of SLIDE_DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(direction))).toBe(direction);
    }
  });
});

describe('offscreenOffset', () => {
  it('moves a shape past the edge it heads for, plus a margin, and not at all on the other axis', () => {
    const left = offscreenOffset(box, bounds, 'left');
    const down = offscreenOffset(box, bounds, 'down');

    // the right edge of the box (60) has to reach the left edge of the bounds (0), and a bit more
    expect(left.x).toBeLessThan(-60);
    expect(left.y).toBe(0);
    // the top edge (30) has to reach the bottom edge (100)
    expect(down.y).toBeGreaterThan(70);
    expect(down.x).toBe(0);
  });

  it('leaves the shape completely outside the bounds at the end of the move', () => {
    for (const direction of SLIDE_DIRECTIONS) {
      const { x, y } = offscreenOffset(box, bounds, direction);
      const moved = { left: box.x + x, right: box.x + box.width + x, top: box.y + y, bottom: box.y + box.height + y };
      const outside = moved.right <= 0 || moved.left >= 100 || moved.bottom <= 0 || moved.top >= 100;
      expect(outside).toBe(true);
    }
  });

  it('does not move a shape that is already outside the bounds, and never the wrong way', () => {
    const outside = { x: 150, y: 30, width: 20, height: 10 };

    expect(offscreenOffset(outside, bounds, 'right').x).toBe(0);
    expect(offscreenOffset(outside, bounds, 'left').x).toBeLessThan(-170);
  });

  it('combines both axes for a diagonal', () => {
    const { x, y } = offscreenOffset(box, bounds, 'down-right');

    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
  });
});

describe('slideProgress', () => {
  it('ramps over the window centered on the swap point', () => {
    expect(slideProgress(0.3, 0.5, 0.2)).toBe(0);
    expect(slideProgress(0.4, 0.5, 0.2)).toBe(0);
    expect(slideProgress(0.5, 0.5, 0.2)).toBe(0.5);
    expect(slideProgress(0.6, 0.5, 0.2)).toBe(1);
    expect(slideProgress(0.9, 0.5, 0.2)).toBe(1);
  });

  it('is a cut with no window', () => {
    expect(slideProgress(0.49, 0.5, 0)).toBe(0);
    expect(slideProgress(0.5, 0.5, 0)).toBe(1);
  });
});

describe('slideOf', () => {
  it('is the transition of a swap that has a window to move over', () => {
    expect(slideOf(swap())).toEqual({ type: 'slide', direction: 'left', fade: false });
  });

  it('is nothing for a fade, a hard cut, or a contour that does not swap', () => {
    expect(slideOf(swap({ transition: undefined }))).toBeNull();
    expect(slideOf(swap({ fadeWindow: 0 }))).toBeNull();
    expect(slideOf(swap({ mode: 'static' }))).toBeNull();
    expect(slideOf(swap({ mode: 'morph' }))).toBeNull();
  });

  it('tells whether any entry of a plan slides', () => {
    expect(planSlides([swap({ transition: undefined }), swap()])).toBe(true);
    expect(planSlides([swap({ transition: undefined })])).toBe(false);
  });
});

describe('parseViewBox', () => {
  it('reads the viewBox, with spaces or commas', () => {
    expect(parseViewBox('0 0 24 24', 800, 800)).toEqual({ x: 0, y: 0, width: 24, height: 24 });
    expect(parseViewBox('-5,-5,10,20', 1, 1)).toEqual({ x: -5, y: -5, width: 10, height: 20 });
  });

  it('falls back to the size when the viewBox is missing or unusable', () => {
    expect(parseViewBox(undefined, 300, 150)).toEqual({ x: 0, y: 0, width: 300, height: 150 });
    expect(parseViewBox('0 0 0 0', 300, 150)).toEqual({ x: 0, y: 0, width: 300, height: 150 });
  });
});
