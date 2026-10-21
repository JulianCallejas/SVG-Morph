import { describe, expect, it } from 'vitest';
import { splitContours } from './contours';
import { pairContours, type ContourPlanEntry } from './contourPairing';
import {
  MAX_NODE_COUNT,
  MIN_AUTO_NODE_COUNT,
  autoNodeCount,
  interpolateContours,
  pairNodes,
  resolveNodeCount,
  sampleContour,
} from './contourInterpolation';

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const source = splitContours('M0 0 L10 0', 's');
const target = splitContours('M0 10 L10 10', 't');

const entry = (overrides: Partial<ContourPlanEntry>): ContourPlanEntry => ({
  sourceId: 's1',
  targetId: 't1',
  mode: 'morph',
  swapAt: 0.5,
  fadeWindow: 0,
  ...overrides,
});

const numbers = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const pointCount = (d: string): number => (d.match(/[ML]/g) ?? []).length;

describe('interpolateContours: morph', () => {
  it('interpolates between source and target at the given progress', () => {
    const [item] = interpolateContours([entry({})], source, target, 0.5, { nodeCount: 4 });

    // y goes 0 -> 10, so halfway every point sits at y = 5; x does not move
    const values = numbers(item.d);
    const ys = values.filter((_, i) => i % 2 === 1);
    expect(ys.every((y) => y === 5)).toBe(true);
    expect(values.slice(0, 2)).toEqual([0, 5]);
    expect(values.slice(-2)).toEqual([10, 5]);
    expect(item.opacity).toBe(1);
  });

  it('matches the source at progress 0 and the target at progress 1', () => {
    const atStart = interpolateContours([entry({})], source, target, 0, { nodeCount: 2 });
    const atEnd = interpolateContours([entry({})], source, target, 1, { nodeCount: 2 });

    expect(numbers(atStart[0].d).filter((_, i) => i % 2 === 1)).toEqual([0, 0, 0]);
    expect(numbers(atEnd[0].d).filter((_, i) => i % 2 === 1)).toEqual([10, 10, 10]);
  });

  it('uses the automatic node count when nothing is set, and honours the nodeCount option', () => {
    const [byDefault] = interpolateContours([entry({})], source, target, 0.5);
    const [custom] = interpolateContours([entry({})], source, target, 0.5, { nodeCount: 10 });

    expect(pointCount(byDefault.d)).toBe(autoNodeCount(source[0], target[0]) + 1);
    expect(pointCount(custom.d)).toBe(11);
  });

  it('lets an entry set its own node count, above the option', () => {
    const [item] = interpolateContours([entry({ nodeCount: 6 })], source, target, 0.5, { nodeCount: 50 });

    expect(pointCount(item.d)).toBe(7);
  });

  it('gives each entry its own node count', () => {
    const items = interpolateContours(
      [entry({ nodeCount: 5 }), entry({ sourceId: 's2', targetId: 't2', nodeCount: 20 })],
      [...source, ...splitContours('M0 20 L10 20', 's').map((c) => ({ ...c, id: 's2' }))],
      [...target, ...splitContours('M0 30 L10 30', 't').map((c) => ({ ...c, id: 't2' }))],
      0.5,
    );

    expect(items.map((item) => pointCount(item.d))).toEqual([6, 21]);
  });

  it('closes the contour when both sides are closed', () => {
    const closedA = splitContours('M0 0 L10 0 L10 10 Z', 's');
    const closedB = splitContours('M0 0 L20 0 L20 20 Z', 't');

    const [item] = interpolateContours([entry({})], closedA, closedB, 0.5, { nodeCount: 6 });

    expect(item.d.trim().endsWith('Z')).toBe(true);
  });

  it('keeps contours open when both sides are open', () => {
    const [item] = interpolateContours([entry({})], source, target, 0.5);

    expect(item.d).not.toContain('Z');
  });

  it('clamps progress to 0..1', () => {
    const below = interpolateContours([entry({})], source, target, -3, { nodeCount: 2 });
    const above = interpolateContours([entry({})], source, target, 7, { nodeCount: 2 });

    expect(numbers(below[0].d)[1]).toBe(0);
    expect(numbers(above[0].d)[1]).toBe(10);
  });

  it('treats a morph entry with a missing side as a swap', () => {
    const plan = [entry({ targetId: null })];

    expect(interpolateContours(plan, source, target, 0.2)).toHaveLength(1);
    expect(interpolateContours(plan, source, target, 0.8)).toHaveLength(0);
  });
});

describe('node counts', () => {
  const line = splitContours('M0 0 L10 0', 'a')[0];
  const cloud = splitContours(CLOUD_ARROW_D, 'c')[0];

  it('keeps the automatic count within its bounds', () => {
    expect(autoNodeCount(line, line)).toBe(MIN_AUTO_NODE_COUNT);
    expect(autoNodeCount(cloud, cloud)).toBeGreaterThan(MIN_AUTO_NODE_COUNT);
    expect(autoNodeCount(cloud, cloud)).toBeLessThanOrEqual(MAX_NODE_COUNT);
  });

  it('asks for as many nodes as the more complex side needs, whatever the order', () => {
    expect(autoNodeCount(line, cloud)).toBe(autoNodeCount(cloud, cloud));
    expect(autoNodeCount(cloud, line)).toBe(autoNodeCount(line, cloud));
  });

  it('resolves manual entry count first, then the option, then the automatic count', () => {
    expect(resolveNodeCount(entry({ nodeCount: 12 }), line, cloud, { nodeCount: 50 })).toBe(12);
    expect(resolveNodeCount(entry({}), line, cloud, { nodeCount: 50 })).toBe(50);
    expect(resolveNodeCount(entry({}), line, cloud)).toBe(autoNodeCount(line, cloud));
  });

  it('rejects an invalid manual count', () => {
    expect(() => resolveNodeCount(entry({ nodeCount: 0 }), line, cloud)).toThrow(RangeError);
    expect(() => resolveNodeCount(entry({ nodeCount: 3.5 }), line, cloud)).toThrow(RangeError);
  });

  // svg-path-commander returns the end of the NEXT segment when a distance lands exactly on a
  // vertex, and the start point for the whole closing segment of a `Z` path: both are worked around.
  it('samples a closed contour all the way round, including its closing edge', () => {
    const square = splitContours('M0 0 L10 0 L10 10 L0 10 Z', 'q')[0];

    const points = sampleContour(square, 8);

    const expected = [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10], [5, 10], [0, 10], [0, 5], [0, 0]];
    points.forEach((point, i) => {
      expect(point.x).toBeCloseTo(expected[i][0], 1);
      expect(point.y).toBeCloseTo(expected[i][1], 1);
    });
  });

  it('samples exactly on a vertex without jumping to the next segment', () => {
    const corner = splitContours('M0 0 L10 0 L10 10', 'v')[0];

    const points = sampleContour(corner, 2);

    expect([points[1].x, points[1].y].map(Math.round)).toEqual([10, 0]);
  });

  it('copes with a closed contour that already returns to its start', () => {
    const triangle = splitContours('M0 0 L10 0 L10 10 L0 0 Z', 'z')[0];

    const points = sampleContour(triangle, 6);

    expect(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it('samples the requested number of nodes along a contour', () => {
    const points = sampleContour(line, 4);

    expect(points).toHaveLength(5);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points[4].x).toBeCloseTo(10);
  });
});

describe('pair alignment', () => {
  const only = (d: string, prefix: string) => splitContours(d, prefix);
  const firstPoint = (d: string): number[] => numbers(d.split(' ')[0]);

  it('reverses an open contour drawn in the opposite direction', () => {
    const a = only('M0 0 L10 0', 's');
    const b = only('M10 5 L0 5', 't');

    const [item] = interpolateContours([entry({})], a, b, 0.5, { nodeCount: 4 });

    // the start of a (0,0) must meet the matching end of b (0,5), not its start (10,5)
    expect(firstPoint(item.d)).toEqual([0, 2.5]);
  });

  it('leaves an open contour with the same direction as it is', () => {
    const a = only('M0 0 L10 0', 's');
    const b = only('M0 5 L10 5', 't');

    const [item] = interpolateContours([entry({})], a, b, 0.5, { nodeCount: 4 });

    expect(firstPoint(item.d)).toEqual([0, 2.5]);
  });

  it('rotates the start of a closed contour to the nearest matching node', () => {
    const a = only('M0 0 L10 0 L10 10 L0 10 Z', 's');
    // the same square, but it starts at the opposite corner
    const b = only('M10 10 L0 10 L0 0 L10 0 Z', 't');

    const [item] = interpolateContours([entry({})], a, b, 0.5, { nodeCount: 8 });

    // identical shapes must morph into themselves: the path still starts at the top-left corner
    // (samples are nudged by 0.001 to dodge a library bug, so compare with a tolerance)
    const [x, y] = firstPoint(item.d);
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(0, 1);
  });

  it('also reverses a closed contour drawn the other way round', () => {
    const a = only('M0 0 L10 0 L10 10 L0 10 Z', 's');
    const b = only('M0 0 L0 10 L10 10 L10 0 Z', 't');

    const items = interpolateContours([entry({})], a, b, 0.5, { nodeCount: 8 });
    const [aligned] = interpolateContours([entry({})], a, a.map((c) => ({ ...c, id: 't1' })), 0.5, {
      nodeCount: 8,
    });

    // same geometry, up to the 0.001 sampling nudge
    const got = numbers(items[0].d);
    const want = numbers(aligned.d);
    expect(got).toHaveLength(want.length);
    got.forEach((value, i) => expect(value).toBeCloseTo(want[i], 1));
  });

  it('keeps identical contours exactly as they are', () => {
    const a = only('M0 0 L10 0 L10 10 L0 10 Z', 's');
    const same = a.map((c) => ({ ...c, id: 't1' }));

    const nodes = pairNodes(a[0], same[0], 8);

    expect(nodes.to).toEqual(nodes.from);
  });

  it('copes with an open contour paired with a closed one', () => {
    const open = only('M0 0 L10 0', 's');
    const closed = only('M0 0 L10 0 L10 10 L0 10 Z', 't');

    expect(() => interpolateContours([entry({})], open, closed, 0.5, { nodeCount: 8 })).not.toThrow();
  });

  it('gives both sides of a pair the same number of nodes', () => {
    const nodes = pairNodes(source[0], target[0], 12);

    expect(nodes.from).toHaveLength(13);
    expect(nodes.to).toHaveLength(13);
  });
});

describe('interpolateContours: swap', () => {
  const swap = (overrides: Partial<ContourPlanEntry> = {}) =>
    entry({ mode: 'swap', swapAt: 0.8, ...overrides });

  it('cuts from source to target at swapAt without a fade', () => {
    const before = interpolateContours([swap()], source, target, 0.79);
    const after = interpolateContours([swap()], source, target, 0.8);

    expect(before.map((item) => [item.id, item.opacity])).toEqual([['s1', 1]]);
    expect(after.map((item) => [item.id, item.opacity])).toEqual([['t1', 1]]);
    expect(before[0].d).toBe(source[0].d);
    expect(after[0].d).toBe(target[0].d);
  });

  it('cross-fades around swapAt when fadeWindow is set', () => {
    const plan = [swap({ swapAt: 0.5, fadeWindow: 0.2 })];

    const early = interpolateContours(plan, source, target, 0.39);
    const middle = interpolateContours(plan, source, target, 0.5);
    const late = interpolateContours(plan, source, target, 0.61);

    expect(early.map((item) => [item.id, item.opacity])).toEqual([['s1', 1]]);
    expect(middle.map((item) => [item.id, item.opacity])).toEqual([
      ['s1', 0.5],
      ['t1', 0.5],
    ]);
    expect(late.map((item) => [item.id, item.opacity])).toEqual([['t1', 1]]);
  });

  it('removes an unpaired source contour at swapAt', () => {
    const plan = [swap({ targetId: null })];

    expect(interpolateContours(plan, source, target, 0.5)).toHaveLength(1);
    expect(interpolateContours(plan, source, target, 0.9)).toHaveLength(0);
  });

  it('adds an unpaired target contour at swapAt', () => {
    const plan = [swap({ sourceId: null })];

    expect(interpolateContours(plan, source, target, 0.5)).toHaveLength(0);
    expect(interpolateContours(plan, source, target, 0.9).map((item) => item.id)).toEqual(['t1']);
  });
});

describe('interpolateContours: static', () => {
  it('keeps the source shape for the whole animation', () => {
    const plan = [entry({ mode: 'static' })];

    for (const progress of [0, 0.5, 1]) {
      const [item] = interpolateContours(plan, source, target, progress);
      expect(item.d).toBe(source[0].d);
      expect(item.opacity).toBe(1);
    }
  });

  it('falls back to the target shape when there is no source', () => {
    const plan = [entry({ mode: 'static', sourceId: null })];

    expect(interpolateContours(plan, source, target, 0.5)[0].d).toBe(target[0].d);
  });
});

describe('interpolateContours: origin ids', () => {
  it('reports which contours each shape comes from', () => {
    const morph = interpolateContours([entry({})], source, target, 0.5)[0];
    const swapped = interpolateContours([entry({ mode: 'swap' })], source, target, 0.1)[0];
    const fixed = interpolateContours([entry({ mode: 'static', sourceId: null })], source, target, 0.1)[0];

    expect([morph.sourceId, morph.targetId]).toEqual(['s1', 't1']);
    expect([swapped.sourceId, swapped.targetId]).toEqual(['s1', null]);
    expect([fixed.sourceId, fixed.targetId]).toEqual([null, 't1']);
  });
});

describe('interpolateContours: plan validation', () => {
  it('rejects a node count below 1 or a fractional one', () => {
    expect(() => interpolateContours([entry({})], source, target, 0.5, { nodeCount: 0 })).toThrow(
      RangeError,
    );
    expect(() => interpolateContours([entry({})], source, target, 0.5, { nodeCount: 2.5 })).toThrow(
      RangeError,
    );
  });

  it('throws when the plan references an unknown contour', () => {
    expect(() =>
      interpolateContours([entry({ sourceId: 'missing' })], source, target, 0.5),
    ).toThrow(/missing/);
  });
});

describe('interpolateContours: reference icons', () => {
  const iconSource = splitContours(CLOUD_ARROW_D, 's');
  const iconTarget = splitContours(CLOUD_BOLT_D, 't');
  const plan = pairContours(iconSource, iconTarget);

  it('shows the two morphing contours and both arrowheads at the start', () => {
    const items = interpolateContours(plan, iconSource, iconTarget, 0);

    expect(items.map((item) => item.id)).toEqual(['s1~t2', 's2~t1', 's3', 's4']);
  });

  it('drops the arrowheads after the swap point and keeps morphing the rest', () => {
    const items = interpolateContours(plan, iconSource, iconTarget, 0.9);

    expect(items.map((item) => item.id)).toEqual(['s1~t2', 's2~t1']);
  });
});
