import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import { contoursFromSVGData, planContours } from './contourSvg';
import {
  DEFAULT_FADE_WINDOW,
  DEFAULT_SWAP_AT,
  type ContourPlanEntry,
} from './contourPairing';
import { MAX_NODE_COUNT, MIN_NODE_COUNT } from './contourInterpolation';
import {
  colorIndexByContour,
  contourLabel,
  pairManually,
  clearAnchors,
  pathBoxes,
  removeAnchor,
  setAnchor,
  unpairEntry,
  updateEntry,
} from './contourPlanEditing';

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const svg = (...ds: string[]): SVGData => ({
  paths: ds.map((d) => ({ d })),
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
});

const arrow = svg(CLOUD_ARROW_D);
const bolt = svg(CLOUD_BOLT_D);
const source = contoursFromSVGData(arrow, 'source');
const target = contoursFromSVGData(bolt, 'target');
const suggested = planContours(arrow, bolt)!.plan;

const ids = (plan: ContourPlanEntry[]) => plan.map((e) => [e.sourceId, e.targetId, e.mode]);

describe('contourLabel', () => {
  it('labels a contour of a multi-subpath path as P<path>.<contour>', () => {
    expect(contourLabel('s1.2', source)).toBe('P1.2');
    expect(contourLabel('t1.1', target)).toBe('P1.1');
  });

  it('labels the only contour of a path as just P<path>', () => {
    const two = contoursFromSVGData(svg('M0 0 L1 1', 'M2 2 L3 3'), 'source');

    expect(contourLabel('s1.1', two)).toBe('P1');
    expect(contourLabel('s2.1', two)).toBe('P2');
  });

  it('throws for an unknown contour', () => {
    expect(() => contourLabel('nope', source)).toThrow(/nope/);
  });
});

describe('colorIndexByContour', () => {
  it('gives both halves of a pair the same color index, and unpaired ones their own', () => {
    const colors = colorIndexByContour(suggested);

    expect(colors.get('s1.1')).toBe(colors.get('t1.2'));
    expect(colors.get('s1.2')).toBe(colors.get('t1.1'));
    expect(new Set([colors.get('s1.1'), colors.get('s1.2'), colors.get('s1.3'), colors.get('s1.4')]).size).toBe(4);
  });
});

describe('pathBoxes', () => {
  it('returns the union box of each path', () => {
    const [box] = pathBoxes(source);

    expect(box.label).toBe('P1');
    expect(box.pathIndex).toBe(0);
    expect(box.bbox.x).toBeLessThanOrEqual(3);
    expect(box.bbox.y).toBeLessThanOrEqual(3);
    expect(box.bbox.x + box.bbox.width).toBeGreaterThanOrEqual(21);
    expect(box.bbox.y + box.bbox.height).toBeGreaterThanOrEqual(21);
  });

  it('returns one box per path', () => {
    const two = contoursFromSVGData(svg('M0 0 L10 10', 'M20 20 L30 40'), 'source');

    expect(pathBoxes(two).map((b) => [b.label, b.bbox])).toEqual([
      ['P1', { x: 0, y: 0, width: 10, height: 10 }],
      ['P2', { x: 20, y: 20, width: 10, height: 20 }],
    ]);
  });
});

describe('pairManually', () => {
  it('pairs two unpaired contours as a morph', () => {
    // arrowhead s1.3 is unpaired; t1.1 (bolt) is taken by the shaft
    const plan = pairManually(suggested, 's1.3', 't1.1', source, target);

    expect(ids(plan)).toEqual([
      ['s1.1', 't1.2', 'morph'],
      ['s1.2', null, 'swap'],
      ['s1.3', 't1.1', 'morph'],
      ['s1.4', null, 'swap'],
    ]);
  });

  it('turns the former partners into unpaired swaps instead of losing them', () => {
    const plan = pairManually(suggested, 's1.1', 't1.1', source, target);

    expect(ids(plan)).toEqual([
      ['s1.1', 't1.1', 'morph'],
      ['s1.2', null, 'swap'],
      ['s1.3', null, 'swap'],
      ['s1.4', null, 'swap'],
      [null, 't1.2', 'swap'],
    ]);
  });

  it('uses every contour at most once', () => {
    const plan = pairManually(suggested, 's1.4', 't1.2', source, target);

    const sources = plan.flatMap((e) => (e.sourceId ? [e.sourceId] : []));
    const targets = plan.flatMap((e) => (e.targetId ? [e.targetId] : []));
    expect(new Set(sources).size).toBe(sources.length);
    expect(new Set(targets).size).toBe(targets.length);
    expect(sources).toHaveLength(4);
    expect(targets).toHaveLength(2);
  });

  it('keeps source order first and unpaired targets last', () => {
    const plan = pairManually(suggested, 's1.1', 't1.1', source, target);

    expect(plan[plan.length - 1].sourceId).toBeNull();
  });

  it('leaves an already paired couple untouched', () => {
    const custom = suggested.map((e, i) => (i === 0 ? { ...e, mode: 'static' as const } : e));

    expect(pairManually(custom, 's1.1', 't1.2', source, target)).toEqual(custom);
  });

  it('does not mutate the original plan', () => {
    const before = JSON.stringify(suggested);

    pairManually(suggested, 's1.1', 't1.1', source, target);

    expect(JSON.stringify(suggested)).toBe(before);
  });

  it('throws for an unknown contour id', () => {
    expect(() => pairManually(suggested, 'nope', 't1.1', source, target)).toThrow(/nope/);
    expect(() => pairManually(suggested, 's1.1', 'nope', source, target)).toThrow(/nope/);
  });
});

describe('unpairEntry', () => {
  it('splits a pair into two unpaired swaps, keeping source order', () => {
    const plan = unpairEntry(suggested, 0, source, target);

    expect(ids(plan)).toEqual([
      ['s1.1', null, 'swap'],
      ['s1.2', 't1.1', 'morph'],
      ['s1.3', null, 'swap'],
      ['s1.4', null, 'swap'],
      [null, 't1.2', 'swap'],
    ]);
  });

  it('keeps the swap settings of the pair on both halves', () => {
    const tuned = suggested.map((e, i) => (i === 0 ? { ...e, swapAt: 0.8, fadeWindow: 0.2 } : e));

    const plan = unpairEntry(tuned, 0, source, target);

    expect(plan[0]).toMatchObject({ sourceId: 's1.1', swapAt: 0.8, fadeWindow: 0.2 });
    expect(plan[plan.length - 1]).toMatchObject({ targetId: 't1.2', swapAt: 0.8, fadeWindow: 0.2 });
  });

  it('leaves an unpaired entry untouched', () => {
    expect(unpairEntry(suggested, 2, source, target)).toEqual(suggested);
  });

  it('throws for an index outside the plan', () => {
    expect(() => unpairEntry(suggested, 9, source, target)).toThrow(RangeError);
  });
});

describe('updateEntry', () => {
  it('changes only the requested entry', () => {
    const plan = updateEntry(suggested, 2, { mode: 'static' });

    expect(plan[2].mode).toBe('static');
    expect(plan[0]).toEqual(suggested[0]);
    expect(suggested[2].mode).toBe('swap');
  });

  it('sets the swap point and the fade window', () => {
    const plan = updateEntry(suggested, 2, { swapAt: 0.8, fadeWindow: 0.3 });

    expect(plan[2]).toMatchObject({ swapAt: 0.8, fadeWindow: 0.3 });
  });

  it('clamps swapAt and fadeWindow to 0..1', () => {
    const plan = updateEntry(suggested, 2, { swapAt: 4, fadeWindow: -1 });

    expect(plan[2]).toMatchObject({ swapAt: 1, fadeWindow: 0 });
  });

  it('sets a manual node count on one entry and clears it back to automatic', () => {
    const manual = updateEntry(suggested, 0, { nodeCount: 50 });

    expect(manual[0].nodeCount).toBe(50);
    expect(manual[1].nodeCount).toBeUndefined();

    const automatic = updateEntry(manual, 0, { nodeCount: null });
    expect('nodeCount' in automatic[0]).toBe(false);
  });

  it('keeps the manual node count within its limits and whole', () => {
    expect(updateEntry(suggested, 0, { nodeCount: 2 })[0].nodeCount).toBe(MIN_NODE_COUNT);
    expect(updateEntry(suggested, 0, { nodeCount: 9999 })[0].nodeCount).toBe(MAX_NODE_COUNT);
    expect(updateEntry(suggested, 0, { nodeCount: 40.6 })[0].nodeCount).toBe(41);
  });

  it('refuses a morph on an unpaired contour', () => {
    expect(() => updateEntry(suggested, 2, { mode: 'morph' })).toThrow(/both/);
  });

  it('starts new pairs with the default swap settings', () => {
    const [pair] = pairManually(suggested, 's1.3', 't1.1', source, target).filter(
      (e) => e.sourceId === 's1.3',
    );

    expect(pair).toMatchObject({ swapAt: DEFAULT_SWAP_AT, fadeWindow: DEFAULT_FADE_WINDOW });
  });

  it('throws for an index outside the plan', () => {
    expect(() => updateEntry(suggested, -1, { mode: 'static' })).toThrow(RangeError);
  });
});

describe('matched points (anchors)', () => {
  const pairIndex = suggested.findIndex((e) => e.mode === 'morph');
  const entryOf = (plan: ContourPlanEntry[]) => plan[pairIndex];

  it('adds a matched point to a pair, keeping the rest of the entry', () => {
    const plan = setAnchor(suggested, pairIndex, { source: 0.25, target: 0.5 }, source, target);

    expect(entryOf(plan).anchors).toEqual([{ source: 0.25, target: 0.5 }]);
    expect(entryOf(plan).mode).toBe('morph');
    expect(suggested[pairIndex].anchors).toBeUndefined();
  });

  it('keeps the matched points sorted by their source point', () => {
    let plan = setAnchor(suggested, pairIndex, { source: 0.6, target: 0.7 }, source, target);
    plan = setAnchor(plan, pairIndex, { source: 0.2, target: 0.3 }, source, target);

    expect(entryOf(plan).anchors).toEqual([
      { source: 0.2, target: 0.3 },
      { source: 0.6, target: 0.7 },
    ]);
  });

  it('replaces the partner when a source point is matched again', () => {
    let plan = setAnchor(suggested, pairIndex, { source: 0.25, target: 0.5 }, source, target);
    plan = setAnchor(plan, pairIndex, { source: 0.25, target: 0.4 }, source, target);

    expect(entryOf(plan).anchors).toEqual([{ source: 0.25, target: 0.4 }]);
  });

  it('refuses points that cross the ones already matched and leaves the plan alone', () => {
    const plan = setAnchor(suggested, pairIndex, { source: 0.25, target: 0.5 }, source, target);

    expect(() => setAnchor(plan, pairIndex, { source: 0.75, target: 0.5 }, source, target)).toThrow(/cross/);
    expect(entryOf(plan).anchors).toEqual([{ source: 0.25, target: 0.5 }]);
  });

  it('refuses a point outside the contour and a contour that is not paired', () => {
    expect(() => setAnchor(suggested, pairIndex, { source: 1.5, target: 0.5 }, source, target)).toThrow(RangeError);
    const loose = suggested.findIndex((e) => e.sourceId === null || e.targetId === null);
    if (loose >= 0) {
      expect(() => setAnchor(suggested, loose, { source: 0.1, target: 0.1 }, source, target)).toThrow(/pair/);
    }
  });

  it('removes one matched point or all of them', () => {
    let plan = setAnchor(suggested, pairIndex, { source: 0.2, target: 0.3 }, source, target);
    plan = setAnchor(plan, pairIndex, { source: 0.6, target: 0.7 }, source, target);

    expect(entryOf(removeAnchor(plan, pairIndex, 0)).anchors).toEqual([{ source: 0.6, target: 0.7 }]);
    expect('anchors' in entryOf(clearAnchors(plan, pairIndex))).toBe(false);
    expect(() => removeAnchor(plan, pairIndex, 5)).toThrow(RangeError);
  });

  it('forgets the matched points when the pair is split', () => {
    const plan = setAnchor(suggested, pairIndex, { source: 0.25, target: 0.5 }, source, target);

    const split = unpairEntry(plan, pairIndex, source, target);

    expect(split.some((e) => e.anchors !== undefined)).toBe(false);
  });

  it('keeps them when only the mode or node count changes', () => {
    const plan = setAnchor(suggested, pairIndex, { source: 0.25, target: 0.5 }, source, target);

    expect(entryOf(updateEntry(plan, pairIndex, { nodeCount: 40 })).anchors).toEqual([
      { source: 0.25, target: 0.5 },
    ]);
  });
});

describe('slide transition', () => {
  const swapIndex = suggested.findIndex((e) => e.mode === 'swap');

  it('sets a slide on a swapped contour and goes back to the fade', () => {
    const slid = updateEntry(suggested, swapIndex, {
      transition: { type: 'slide', direction: 'up-left', fade: true },
    });

    expect(slid[swapIndex].transition).toEqual({ type: 'slide', direction: 'up-left', fade: true });
    expect('transition' in updateEntry(slid, swapIndex, { transition: null })[swapIndex]).toBe(false);
    expect(suggested[swapIndex].transition).toBeUndefined();
  });

  it('keeps the rest of the entry and refuses a direction that does not exist', () => {
    const slid = updateEntry(suggested, swapIndex, { transition: { type: 'slide', direction: 'left', fade: false } });

    expect(slid[swapIndex].swapAt).toBe(suggested[swapIndex].swapAt);
    expect(() =>
      updateEntry(suggested, swapIndex, { transition: { type: 'slide', direction: 'sideways' as never, fade: false } }),
    ).toThrow(RangeError);
  });

  it('keeps the slide when a pair is split, as it keeps the other settings', () => {
    const pairIndex = suggested.findIndex((e) => e.mode === 'morph');
    const withSlide = updateEntry(suggested, pairIndex, { transition: { type: 'slide', direction: 'down', fade: false } });

    const split = unpairEntry(withSlide, pairIndex, source, target);

    expect(split.filter((e) => e.transition?.direction === 'down')).toHaveLength(2);
  });
});
