import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import { contoursFromSVGData } from './contourSvg';
import { holeStructure } from './contourHoles';

const svg = (...paths: Array<{ d: string; fill?: string }>): SVGData => ({
  paths,
  viewBox: '0 0 100 100',
  width: 100,
  height: 100,
});

const holes = (data: SVGData) => holeStructure(contoursFromSVGData(data, 'source'));
const entries = (map: Map<string, string>) => [...map.entries()];

describe('holeStructure', () => {
  it('finds the hole of a donut: a closed contour inside another one of the same path', () => {
    const donut = svg({ d: 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z', fill: '#000000' });

    expect(entries(holes(donut))).toEqual([['s1.2', 's1.1']]);
  });

  it('counts the nesting, not only the containment: a ring, its hole, and an island inside the hole', () => {
    const target = svg({
      d: 'M0 0 H100 V100 H0 Z M10 10 V90 H90 V10 Z M40 40 H60 V60 H40 Z',
      fill: '#000000',
    });

    // the middle contour is a hole of the outer one; the inner one is filled again, so no hole
    expect(entries(holes(target))).toEqual([['s1.2', 's1.1']]);
  });

  it('gives each hole to the contour that directly holds it', () => {
    const wall = svg({
      d: 'M0 0 H100 V100 H0 Z M10 10 H30 V30 H10 Z M60 60 H90 V90 H60 Z',
      fill: '#000000',
    });

    expect(entries(holes(wall))).toEqual([
      ['s1.2', 's1.1'],
      ['s1.3', 's1.1'],
    ]);
  });

  it('finds nothing in shapes side by side', () => {
    const apart = svg({ d: 'M0 0 H40 V40 H0 Z M60 60 H100 V100 H60 Z', fill: '#000000' });

    expect(holes(apart).size).toBe(0);
  });

  it('does not count a contour that only touches the outline from the outside', () => {
    const touching = svg({ d: 'M0 0 H50 V50 H0 Z M50 10 H80 V40 H50 Z', fill: '#000000' });

    expect(holes(touching).size).toBe(0);
  });

  it('does not count a contour of another path: separate paths overlap, they do not cut', () => {
    const layered = svg(
      { d: 'M0 0 H100 V100 H0 Z', fill: '#000000' },
      { d: 'M25 25 V75 H75 V25 Z', fill: '#ff0000' },
    );

    expect(holes(layered).size).toBe(0);
  });

  it('leaves out open contours and unfilled ones', () => {
    const strokes = svg({ d: 'M0 0 H100 V100 H0 Z M25 25 V75 H75', fill: '#000000' });
    const outline = svg({ d: 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z' });

    expect(holes(strokes).size).toBe(0);
    expect(holes(outline).size).toBe(0);
  });

  it('works on curves, not only on straight edges', () => {
    const ring = svg({
      d: 'M50 0 A50 50 0 1 1 49.9 0 Z M50 25 A25 25 0 1 0 50.1 25 Z',
      fill: '#000000',
    });

    expect(entries(holes(ring))).toEqual([['s1.2', 's1.1']]);
  });

  it('returns nothing for no contours', () => {
    expect(holeStructure([]).size).toBe(0);
  });
});

describe('holeStructure with open filled contours', () => {
  // no closing Z, like the Phosphor icons: a renderer still fills each subpath as if it were closed
  const openDonut = svg({ d: 'M0 0 H100 V100 H0 M25 25 V75 H75 V25', fill: '#000000' });

  it('ignores them by default, as before (the 3D export relies on that)', () => {
    expect(entries(holes(openDonut))).toEqual([]);
  });

  it('counts them when asked: the inner subpath is a hole of the outer one', () => {
    expect(entries(holeStructure(contoursFromSVGData(openDonut, 'source'), { openFilled: true }))).toEqual([
      ['s1.2', 's1.1'],
    ]);
  });

  it('still never makes a hole of an unfilled one', () => {
    const outline = svg({ d: 'M0 0 H100 V100 H0 M25 25 V75 H75 V25', fill: 'none' });
    expect(entries(holeStructure(contoursFromSVGData(outline, 'source'), { openFilled: true }))).toEqual([]);
  });
});
