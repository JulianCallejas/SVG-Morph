import { describe, expect, it } from 'vitest';
import { splitContours } from './contours';
import { continueMatching } from './contourContinue';
import { anchorsRealizable, pairNodes } from './contourInterpolation';

const N = 16;
const square = (prefix: string) => splitContours('M0 0 L10 0 L10 10 L0 10 Z', prefix)[0];
const line = (prefix: string) => splitContours('M0 0 L100 0', prefix)[0];
const node = (k: number) => k / N;
const modN = (value: number) => ((value % N) + N) % N;

describe('continueMatching: closed contours', () => {
  // source nodes 0 and 1 meet target nodes 2 and 3: one target node per source node
  const anchors = [
    { source: node(0), target: node(2) },
    { source: node(1), target: node(3) },
  ];

  it('matches every node after the last one, at the pace of the matched points', () => {
    const a = square('s');
    const b = square('t');

    const made = continueMatching(a, b, N, anchors, 'all');

    // nodes 2 to 15 follow, the last stretch keeping one node
    expect(made).toHaveLength(14);
    made.forEach((point, i) => {
      expect(point.source).toBeCloseTo(node(i + 2), 9);
      expect(point.target).toBeCloseTo(node(modN(i + 4)), 9);
    });
    const all = [...anchors, ...made];
    expect(anchorsRealizable(a, b, all)).toBe(true);
    const { targetAt } = pairNodes(a, b, N, all);
    for (let i = 0; i < N; i++) expect(modN(targetAt[i] * N - (i + 2))).toBeCloseTo(0, 6);
  });

  it('matches only the next node in "next" mode, and repeating it gives the same as "all"', () => {
    const a = square('s');
    const b = square('t');

    const [first] = continueMatching(a, b, N, anchors, 'next');
    expect(continueMatching(a, b, N, anchors, 'next')).toHaveLength(1);
    expect(first.source).toBeCloseTo(node(2), 9);
    expect(first.target).toBeCloseTo(node(4), 9);

    let current = [...anchors];
    for (let i = 0; i < 14; i++) current = [...current, ...continueMatching(a, b, N, current, 'next')];
    const sortBySource = (list: typeof current) => [...list].sort((x, y) => x.source - y.source);
    const viaAll = sortBySource([...anchors, ...continueMatching(a, b, N, anchors, 'all')]);
    expect(current).toHaveLength(16);
    sortBySource(current).forEach((point, i) => {
      expect(point.source).toBeCloseTo(viaAll[i].source, 9);
      expect(point.target).toBeCloseTo(viaAll[i].target, 9);
    });
    // nothing is left to add
    expect(continueMatching(a, b, N, current, 'next')).toEqual([]);
  });

  it('keeps a pace of two target nodes per source node, stopping when the target runs out', () => {
    const a = square('s');
    const b = square('t');
    const pace2 = [
      { source: node(0), target: node(0) },
      { source: node(1), target: node(2) },
    ];

    const made = continueMatching(a, b, N, pace2, 'all');

    // 6 more steps at two nodes each, then the target has only a node and a bit left
    expect(made).toHaveLength(6);
    expect(made[5].source).toBeCloseTo(node(7), 9);
    expect(made[5].target).toBeCloseTo(node(14), 9);
    const { targetAt } = pairNodes(a, b, N, [...pace2, ...made]);
    for (let i = 0; i <= 7; i++) expect(targetAt[i] * N).toBeCloseTo(2 * i, 6);
  });

  it('goes the way the matched points go, even backwards', () => {
    const a = square('s');
    const b = square('t');
    const backwards = [
      { source: node(0), target: node(2) },
      { source: node(1), target: node(1) },
    ];

    const made = continueMatching(a, b, N, backwards, 'all');

    expect(made).toHaveLength(14);
    expect(made[13].source).toBeCloseTo(node(15), 9);
    expect(made[13].target).toBeCloseTo(node(3), 9);
    expect(anchorsRealizable(a, b, [...backwards, ...made])).toBe(true);
  });

  it('needs at least two matched points to know the pace', () => {
    expect(continueMatching(square('s'), square('t'), N, [], 'all')).toEqual([]);
    expect(continueMatching(square('s'), square('t'), N, [{ source: 0, target: 0.25 }], 'next')).toEqual([]);
  });

  it('has nothing to add when every node is already matched', () => {
    const full = [0, 1, 2, 3].map((k) => ({ source: k / 4, target: k / 4 }));

    expect(continueMatching(square('s'), square('t'), 4, full, 'all')).toEqual([]);
  });

  it('refuses points that cannot be honoured', () => {
    const crossing = [
      { source: node(2), target: node(2) },
      { source: node(2), target: node(5) },
    ];

    expect(continueMatching(square('s'), square('t'), N, crossing, 'all')).toEqual([]);
  });
});

describe('continueMatching: lines', () => {
  const anchors = [
    { source: node(4), target: node(2) },
    { source: node(5), target: node(3) },
  ];

  it('continues node by node up to the end of the line, leaving a last stretch', () => {
    const made = continueMatching(line('s'), line('t'), N, anchors, 'all');

    expect(made).toHaveLength(10);
    expect(made[9].source).toBeCloseTo(node(15), 9);
    expect(made[9].target).toBeCloseTo(node(13), 9);
    expect(anchorsRealizable(line('s'), line('t'), [...anchors, ...made])).toBe(true);
  });

  it('adds one node in "next" mode', () => {
    const made = continueMatching(line('s'), line('t'), N, anchors, 'next');

    expect(made).toHaveLength(1);
    expect(made[0].source).toBeCloseTo(node(6), 9);
    expect(made[0].target).toBeCloseTo(node(4), 9);
  });

  it('has nothing to add when the last matched point is already at the end', () => {
    const atEnd = [
      { source: node(14), target: node(14) },
      { source: node(15), target: node(15) },
    ];

    expect(continueMatching(line('s'), line('t'), N, atEnd, 'all')).toEqual([]);
  });
});
