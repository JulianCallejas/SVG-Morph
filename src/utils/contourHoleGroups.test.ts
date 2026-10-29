import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import { planContours } from './contourSvg';
import { holeGroups } from './contourHoleGroups';
import type { ContourPlanEntry } from './contourPairing';

const svg = (...paths: SVGData['paths']): SVGData => ({ paths, viewBox: '0 0 100 100', width: 100, height: 100 });

const DONUT = 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z';
const DONUT_2 = 'M5 5 H95 V95 H5 Z M30 30 V70 H70 V30 Z';
const SOLID = 'M0 0 H100 V100 H0 Z';

const groups = (source: SVGData, target: SVGData) => {
  const planned = planContours(source, target)!;
  return { planned, groups: holeGroups(planned.plan, planned.sourceContours, planned.targetContours) };
};

describe('holeGroups', () => {
  it('groups a hole with its outer when both pairs morph and the target is an outer and a hole too', () => {
    const { planned, groups: found } = groups(svg({ d: DONUT, fill: '#ff0000' }), svg({ d: DONUT_2, fill: '#0000ff' }));

    expect(planned.plan.map((entry) => entry.mode)).toEqual(['morph', 'morph']);
    expect(found).toEqual([{ outer: 0, holes: [1] }]);
  });

  it('never makes a hole of a stroke-only shape: no fill, nothing to cut', () => {
    const { groups: found } = groups(svg({ d: DONUT, fill: 'none', stroke: '#000000' }), svg({ d: DONUT_2, fill: 'none', stroke: '#000000' }));
    expect(found).toEqual([]);
  });

  it('leaves alone a hole whose target is a solid shape: the pair is not outer + hole on both sides', () => {
    const { groups: found } = groups(svg({ d: DONUT, fill: '#ff0000' }), svg({ d: SOLID, fill: '#0000ff' }));
    expect(found).toEqual([]);
  });

  it('does not treat contours of different paths as holes: separate paths overlap, they do not cut', () => {
    const { groups: found } = groups(
      svg({ d: SOLID, fill: '#ff0000' }, { d: 'M25 25 V75 H75 V25 Z', fill: '#ff0000' }),
      svg({ d: SOLID, fill: '#0000ff' }, { d: 'M25 25 V75 H75 V25 Z', fill: '#0000ff' }),
    );
    expect(found).toEqual([]);
  });

  it('keeps an island inside a hole out of the group: it is filled again', () => {
    const nested = 'M0 0 H100 V100 H0 Z M10 10 V90 H90 V10 Z M40 40 H60 V60 H40 Z';
    const { groups: found } = groups(svg({ d: nested, fill: '#ff0000' }), svg({ d: nested, fill: '#0000ff' }));
    expect(found).toEqual([{ outer: 0, holes: [1] }]);
  });

  it('skips a pair that is not a plain morph (a swap does not move with its outer)', () => {
    const { planned } = groups(svg({ d: DONUT, fill: '#ff0000' }), svg({ d: DONUT_2, fill: '#0000ff' }));
    const swapped: ContourPlanEntry[] = planned.plan.map((entry, i) => (i === 1 ? { ...entry, mode: 'swap' } : entry));

    expect(holeGroups(swapped, planned.sourceContours, planned.targetContours)).toEqual([]);
  });
});

describe('holeGroups with contours that are not closed', () => {
  it('groups a hole in filled shapes written without the closing Z', () => {
    const open = (d: string, fill: string) => svg({ d, fill });
    const { groups: found } = groups(
      open('M0 0 H100 V100 H0 M25 25 V75 H75 V25', '#ff0000'),
      open('M5 5 H95 V95 H5 M30 30 V70 H70 V30', '#0000ff'),
    );
    expect(found).toEqual([{ outer: 0, holes: [1] }]);
  });
});
