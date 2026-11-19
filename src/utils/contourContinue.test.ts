import { describe, expect, it } from 'vitest';
import { splitContours } from './contours';
import { continueMatching } from './contourContinue';
import { anchorsRealizable, pairNodes } from './contourInterpolation';

const N = 16;
const square = (prefix: string) => splitContours('M0 0 L10 0 L10 10 L0 10 Z', prefix)[0];
const line = (prefix: string) => splitContours('M0 0 L100 0', prefix)[0];
const node = (k: number) => k / N;

describe('continueMatching: closed contours', () => {
  it('keeps going at the pace of the matched points until the contour is covered', () => {
    const a = square('s');
    const b = square('t');
    // source nodes 0 and 1 meet target nodes 2 and 3: one target node per source node
    const anchors = [
      { source: node(0), target: node(2) },
      { source: node(1), target: node(3) },
    ];

    const next = continueMatching(a, b, N, anchors);

    // the last stretch keeps one node, so the new point sits at source node 15
    expect(next?.source).toBeCloseTo(node(15), 9);
    expect(next?.target).toBeCloseTo(node(1), 9);

    const all = [...anchors, next!];
    expect(anchorsRealizable(a, b, all)).toBe(true);
    const { targetAt } = pairNodes(a, b, N, all);
    for (let i = 0; i < N; i++) expect(((targetAt[i] * N - (i + 2)) % N + N) % N).toBeCloseTo(0, 6);
  });

  it('keeps a pace of two target nodes per source node', () => {
    const a = square('s');
    const b = square('t');
    const anchors = [
      { source: node(0), target: node(0) },
      { source: node(1), target: node(2) },
    ];

    const next = continueMatching(a, b, N, anchors);

    // 6 more steps at two nodes each: it stops when the target has only a node and a bit left
    expect(next?.source).toBeCloseTo(node(7), 9);
    expect(next?.target).toBeCloseTo(node(14), 9);
    const { targetAt } = pairNodes(a, b, N, [...anchors, next!]);
    for (let i = 0; i <= 7; i++) expect(targetAt[i] * N).toBeCloseTo(2 * i, 6);
  });

  it('goes the way the matched points go, even backwards', () => {
    const a = square('s');
    const b = square('t');
    const anchors = [
      { source: node(0), target: node(2) },
      { source: node(1), target: node(1) },
    ];

    const next = continueMatching(a, b, N, anchors);

    expect(next?.source).toBeCloseTo(node(15), 9);
    expect(next?.target).toBeCloseTo(node(3), 9);
    expect(anchorsRealizable(a, b, [...anchors, next!])).toBe(true);
  });

  it('needs at least two matched points to know the pace', () => {
    expect(continueMatching(square('s'), square('t'), N, [])).toBeNull();
    expect(continueMatching(square('s'), square('t'), N, [{ source: 0, target: 0.25 }])).toBeNull();
  });

  it('has nothing to add when every node is already matched', () => {
    const anchors = [0, 1, 2, 3].map((k) => ({ source: k / 4, target: k / 4 }));

    expect(continueMatching(square('s'), square('t'), 4, anchors)).toBeNull();
  });

  it('refuses points that cannot be honoured', () => {
    const crossing = [
      { source: node(2), target: node(2) },
      { source: node(2), target: node(5) },
    ];

    expect(continueMatching(square('s'), square('t'), N, crossing)).toBeNull();
  });
});

describe('continueMatching: lines', () => {
  it('continues up to the end of the line, leaving a last stretch', () => {
    const anchors = [
      { source: node(4), target: node(2) },
      { source: node(5), target: node(3) },
    ];

    const next = continueMatching(line('s'), line('t'), N, anchors);

    expect(next?.source).toBeCloseTo(node(15), 9);
    expect(next?.target).toBeCloseTo(node(13), 9);
    expect(anchorsRealizable(line('s'), line('t'), [...anchors, next!])).toBe(true);
  });

  it('has nothing to add when the last matched point is already at the end', () => {
    const anchors = [
      { source: node(14), target: node(14) },
      { source: node(15), target: node(15) },
    ];

    expect(continueMatching(line('s'), line('t'), N, anchors)).toBeNull();
  });
});
