import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import { contoursFromSVGData, planContours } from './contourSvg';
import {
  DEFAULT_FADE_WINDOW,
  DEFAULT_SWAP_AT,
  type ContourPlanEntry,
} from './contourPairing';
import {
  colorIndexByContour,
  contourLabel,
  pairManually,
  pathBoxes,
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
