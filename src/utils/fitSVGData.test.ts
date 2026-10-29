import { describe, expect, it } from 'vitest';
import { getPathBBox } from 'svg-path-commander';
import type { SVGData } from './svgMorphing';
import { fitToReference, fitPair, viewBoxOf } from './fitSVGData';

const square = (size: number): SVGData => ({
  viewBox: `0 0 ${size} ${size}`,
  width: size,
  height: size,
  paths: [{ d: `M0 0 L${size} 0 L${size} ${size} L0 ${size} Z`, strokeWidth: 2 }],
});

const bbox = (d: string) => {
  const b = getPathBBox(d);
  return { x: b.x, y: b.y, w: b.width, h: b.height };
};

describe('viewBoxOf', () => {
  it('reads the viewBox, and falls back to width and height when it is invalid', () => {
    expect(viewBoxOf({ ...square(10), viewBox: '5 6 70 80' })).toEqual({ x: 5, y: 6, w: 70, h: 80 });
    expect(viewBoxOf({ ...square(10), viewBox: 'nope', width: 30, height: 40 })).toEqual({
      x: 0,
      y: 0,
      w: 30,
      h: 40,
    });
  });
});

describe('fitToReference', () => {
  it('scales a small square up to a bigger square with one factor and takes its box', () => {
    const out = fitToReference(square(24), square(48));
    expect(out.viewBox).toBe('0 0 48 48');
    expect(out.width).toBe(48);
    expect(out.height).toBe(48);
    const b = bbox(out.paths[0].d);
    expect(b.x).toBeCloseTo(0);
    expect(b.y).toBeCloseTo(0);
    expect(b.w).toBeCloseTo(48);
    expect(b.h).toBeCloseTo(48);
    expect(out.paths[0].strokeWidth).toBe(4);
  });

  it('shrinks a big square into a small one', () => {
    const out = fitToReference(square(100), square(10));
    const b = bbox(out.paths[0].d);
    expect(b.w).toBeCloseTo(10);
    expect(out.paths[0].strokeWidth).toBeCloseTo(0.2);
  });

  it('never distorts: a square in a wide box keeps its aspect and is centered', () => {
    const wide: SVGData = { viewBox: '0 0 200 100', width: 200, height: 100, paths: [] };
    const out = fitToReference(square(50), wide);
    expect(out.viewBox).toBe('0 0 200 100');
    const b = bbox(out.paths[0].d);
    expect(b.w).toBeCloseTo(b.h);
    expect(b.h).toBeCloseTo(100);
    expect(b.x).toBeCloseTo(50);
    expect(b.y).toBeCloseTo(0);
  });

  it('centers a wide drawing in a tall box and accounts for a viewBox that does not start at 0', () => {
    const src: SVGData = {
      viewBox: '10 20 100 50',
      width: 100,
      height: 50,
      paths: [{ d: 'M10 20 L110 20 L110 70 L10 70 Z' }],
    };
    const tall: SVGData = { viewBox: '0 0 50 100', width: 50, height: 100, paths: [] };
    const out = fitToReference(src, tall);
    const b = bbox(out.paths[0].d);
    expect(b.w).toBeCloseTo(50);
    expect(b.h).toBeCloseTo(25);
    expect(b.x).toBeCloseTo(0);
    expect(b.y).toBeCloseTo(37.5);
  });

  it('returns the same drawing when the boxes already match', () => {
    const a = square(24);
    const out = fitToReference(a, square(24));
    expect(out.viewBox).toBe(a.viewBox);
    expect(bbox(out.paths[0].d)).toEqual(bbox(a.paths[0].d));
  });

  it('does not mutate its input', () => {
    const a = square(24);
    const before = JSON.stringify(a);
    fitToReference(a, square(48));
    expect(JSON.stringify(a)).toBe(before);
  });
});

describe('fitPair', () => {
  const small = square(24);
  const big = square(240);

  it('"asIs" returns both untouched (same references)', () => {
    const out = fitPair(small, big, 'asIs');
    expect(out.source).toBe(small);
    expect(out.target).toBe(big);
  });

  it('"source" and "target" take that SVG as the output size', () => {
    const s = fitPair(small, big, 'source');
    expect(s.source.viewBox).toBe('0 0 24 24');
    expect(s.target.viewBox).toBe('0 0 24 24');
    const t = fitPair(small, big, 'target');
    expect(t.source.viewBox).toBe('0 0 240 240');
    expect(t.target.viewBox).toBe('0 0 240 240');
  });

  it('"larger" and "smaller" compare the viewBox area', () => {
    expect(fitPair(small, big, 'larger').source.viewBox).toBe('0 0 240 240');
    expect(fitPair(big, small, 'larger').target.viewBox).toBe('0 0 240 240');
    expect(fitPair(small, big, 'smaller').target.viewBox).toBe('0 0 24 24');
    expect(fitPair(big, small, 'smaller').source.viewBox).toBe('0 0 24 24');
  });

  it('on equal areas the source wins', () => {
    const other = { ...square(24), viewBox: '0 0 12 48', width: 12, height: 48 };
    expect(fitPair(small, other, 'larger').source.viewBox).toBe('0 0 24 24');
  });
});
