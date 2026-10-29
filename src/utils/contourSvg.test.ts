import { describe, expect, it, vi } from 'vitest';
import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import {
  activeContourPlan,
  buildContourSVG,
  contoursFromSVGData,
  needsContourPipeline,
  planContours,
} from './contourSvg';

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const svgData = (paths: SVGData['paths']): SVGData => ({
  paths,
  viewBox: '0 0 24 24',
  width: 800,
  height: 800,
});

const iconArrow = svgData([{ d: CLOUD_ARROW_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }]);
const iconBolt = svgData([{ d: CLOUD_BOLT_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }]);

const pathCount = (svg: string): number => (svg.match(/<path /g) ?? []).length;

describe('contoursFromSVGData', () => {
  it('splits every path and keeps its style and position', () => {
    const data = svgData([
      { d: 'M0 0 L1 1 M2 2 L3 3', fill: '#ff0000', stroke: 'none', strokeWidth: 1, opacity: 0.5 },
      { d: 'M5 5 L6 6', fill: 'none', stroke: '#000000', strokeWidth: 3, opacity: 1 },
    ]);

    const contours = contoursFromSVGData(data, 'source');

    expect(contours.map((c) => [c.id, c.pathIndex])).toEqual([
      ['s1.1', 0],
      ['s1.2', 0],
      ['s2.1', 1],
    ]);
    expect(contours[1]).toMatchObject({ fill: '#ff0000', opacity: 0.5 });
    expect(contours[2]).toMatchObject({ stroke: '#000000', strokeWidth: 3 });
  });

  it('keeps the stroke caps and joins of the path', () => {
    const data = svgData([{ d: 'M0 0 L1 1', strokeLinecap: 'round', strokeLinejoin: 'bevel' }]);

    expect(contoursFromSVGData(data, 'source')[0]).toMatchObject({
      strokeLinecap: 'round',
      strokeLinejoin: 'bevel',
    });
  });

  it('prefixes target contours with t', () => {
    const [contour] = contoursFromSVGData(svgData([{ d: 'M0 0 L1 1' }]), 'target');

    expect(contour.id).toBe('t1.1');
  });
});

describe('needsContourPipeline', () => {
  const single = svgData([{ d: 'M0 0 L1 1' }]);
  const twoPaths = svgData([{ d: 'M0 0 L1 1' }, { d: 'M2 2 L3 3' }]);
  const multi = svgData([{ d: 'M0 0 L1 1 M2 2 L3 3' }]);
  const contours = (data: SVGData, side: 'source' | 'target') => contoursFromSVGData(data, side);

  it('is off for one contour per path, so existing SVGs keep the current pipeline', () => {
    expect(needsContourPipeline(contours(single, 'source'), contours(single, 'target'), false)).toBe(false);
    expect(needsContourPipeline(contours(twoPaths, 'source'), contours(twoPaths, 'target'), false)).toBe(false);
  });

  it('turns on when either side has a path with several subpaths', () => {
    expect(needsContourPipeline(contours(multi, 'source'), contours(single, 'target'), false)).toBe(true);
    expect(needsContourPipeline(contours(single, 'source'), contours(multi, 'target'), false)).toBe(true);
  });

  it('turns on when the user customized the plan', () => {
    expect(needsContourPipeline(contours(single, 'source'), contours(single, 'target'), true)).toBe(true);
  });
});

describe('activeContourPlan', () => {
  const single = svgData([{ d: 'M0 0 L1 1' }]);
  const multi = svgData([{ d: 'M0 0 L1 1 M2 2 L3 3' }]);
  const planned = (a: SVGData, b: SVGData) => planContours(a, b)!;

  it('returns the plan when a path has several subpaths', () => {
    const { sourceContours, targetContours, plan } = planned(multi, single);

    expect(activeContourPlan(plan, sourceContours, targetContours, false, false)).toBe(plan);
  });

  it('returns the plan once the user customized it', () => {
    const { sourceContours, targetContours, plan } = planned(single, single);

    expect(activeContourPlan(plan, sourceContours, targetContours, true, false)).toBe(plan);
  });

  it('returns null for one contour per path, so existing SVGs keep the whole-path pipeline', () => {
    const { sourceContours, targetContours, plan } = planned(single, single);

    expect(activeContourPlan(plan, sourceContours, targetContours, false, false)).toBeNull();
  });

  it('returns null when manual node matching is in use, whatever the plan', () => {
    const { sourceContours, targetContours, plan } = planned(multi, single);

    expect(activeContourPlan(plan, sourceContours, targetContours, true, true)).toBeNull();
  });

  it('returns null when there is no plan', () => {
    expect(activeContourPlan(null, [], [], true, false)).toBeNull();
  });
});

describe('planContours', () => {
  it('builds contours and a suggested plan for both sides', () => {
    const result = planContours(iconArrow, iconBolt);

    expect(result?.sourceContours).toHaveLength(4);
    expect(result?.targetContours).toHaveLength(2);
    expect(result?.plan.map((e) => [e.sourceId, e.targetId, e.mode])).toEqual([
      ['s1.1', 't1.2', 'morph'],
      ['s1.2', 't1.1', 'morph'],
      ['s1.3', null, 'swap'],
      ['s1.4', null, 'swap'],
    ]);
  });

  it('returns null and warns instead of throwing on an invalid path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(planContours(svgData([{ d: 'not a path' }]), iconBolt)).toBeNull();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe('buildContourSVG', () => {
  const plan = planContours(iconArrow, iconBolt)!.plan;

  it('draws every contour at the start and drops the arrowheads after the swap', () => {
    expect(pathCount(buildContourSVG(iconArrow, iconBolt, plan, 0))).toBe(4);
    expect(pathCount(buildContourSVG(iconArrow, iconBolt, plan, 0.9))).toBe(2);
  });

  it('uses the source dimensions and viewBox, like the existing pipeline', () => {
    const svg = buildContourSVG(iconArrow, iconBolt, plan, 0.5);

    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('width="800"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('blends stroke width between paired contours', () => {
    const a = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', strokeWidth: 2 }]);
    const b = svgData([{ d: 'M0 2 L10 2', stroke: '#000000', strokeWidth: 6 }]);
    const pairing = planContours(a, b)!.plan;

    expect(buildContourSVG(a, b, pairing, 0.5)).toContain('stroke-width="4"');
  });

  it('switches a fill from none to a color at the halfway point', () => {
    const a = svgData([{ d: 'M0 0 L10 0 L10 10 Z', fill: 'none', stroke: '#000000' }]);
    const b = svgData([{ d: 'M0 0 L10 0 L10 10 Z', fill: '#ff0000', stroke: '#000000' }]);
    const pairing = planContours(a, b)!.plan;

    expect(buildContourSVG(a, b, pairing, 0.4)).toContain('fill="none"');
    expect(buildContourSVG(a, b, pairing, 0.6)).toContain('fill="#ff0000"');
  });

  it('multiplies the path opacity by the cross-fade opacity of a swap', () => {
    const a = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', opacity: 0.5 }]);
    const b = svgData([{ d: 'M50 50 L60 60', stroke: '#000000', opacity: 1 }]);
    const swapPlan = [
      { sourceId: 's1.1', targetId: 't1.1', mode: 'swap' as const, swapAt: 0.5, fadeWindow: 0.5 },
    ];

    // at the swap point the source side is at 50% of its own 0.5 opacity
    expect(buildContourSVG(a, b, swapPlan, 0.5)).toContain('opacity="0.25"');
  });

  it('writes the round caps and joins of the source, and nothing when they are not set', () => {
    const round = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', strokeLinecap: 'round', strokeLinejoin: 'round' }]);
    const plain = svgData([{ d: 'M0 2 L10 2', stroke: '#000000' }]);
    const pairing = planContours(round, plain)!.plan;

    const svg = buildContourSVG(round, plain, pairing, 0.2);

    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(buildContourSVG(plain, plain, planContours(plain, plain)!.plan, 0.2)).not.toContain('stroke-linecap');
  });

  it('switches a differing cap at the halfway point', () => {
    const round = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', strokeLinecap: 'round' }]);
    const square = svgData([{ d: 'M0 2 L10 2', stroke: '#000000', strokeLinecap: 'square' }]);
    const pairing = planContours(round, square)!.plan;

    expect(buildContourSVG(round, square, pairing, 0.4)).toContain('stroke-linecap="round"');
    expect(buildContourSVG(round, square, pairing, 0.6)).toContain('stroke-linecap="square"');
  });

  it('escapes attribute values taken from the SVG', () => {
    const hostile = svgData([{ d: 'M0 0 L10 0', stroke: 'x" onload="alert(1)' }]);
    const pairing = planContours(hostile, hostile)!.plan;

    const svg = buildContourSVG(hostile, hostile, pairing, 0.2);

    expect(svg).not.toContain('onload="alert');
    expect(svg).toContain('&quot;');
  });

  it('throws when the plan references a contour that does not exist', () => {
    const badPlan = [{ sourceId: 'nope', targetId: null, mode: 'swap' as const, swapAt: 0.5, fadeWindow: 0 }];

    expect(() => buildContourSVG(iconArrow, iconBolt, badPlan, 0.5)).toThrow(/nope/);
  });
});

describe('buildContourSVG: slide', () => {
  const sourceData: SVGData = { paths: [{ d: 'M10 40 L30 40 L30 50 L10 50 Z', fill: '#000000' }], viewBox: '0 0 100 100', width: 100, height: 100 };
  const targetData: SVGData = { paths: [{ d: 'M70 40 L90 40 L90 50 L70 50 Z', fill: '#000000' }], viewBox: '0 0 100 100', width: 100, height: 100 };
  const swap = (overrides = {}): ContourPlanEntry => ({
    sourceId: 's1.1',
    targetId: 't1.1',
    mode: 'swap',
    swapAt: 0.5,
    fadeWindow: 0.2,
    transition: { type: 'slide', direction: 'left', fade: false },
    ...overrides,
  });

  it('moves the shapes with a translate and clips the drawing to its viewBox', () => {
    const svg = buildContourSVG(sourceData, targetData, [swap()], 0.5);

    expect(svg).toMatch(/<path [^>]*transform="translate\(-?\d+(\.\d+)? 0\)"/);
    expect(svg).toContain('<clipPath id="svgmorph-view"><rect x="0" y="0" width="100" height="100" /></clipPath>');
    expect(svg).toContain('<g clip-path="url(#svgmorph-view)">');
    expect((svg.match(/<path /g) ?? [])).toHaveLength(2);
  });

  it('leaves the output of a fade exactly as it was, with no clip and no transform', () => {
    const svg = buildContourSVG(sourceData, targetData, [swap({ transition: undefined })], 0.5);

    expect(svg).not.toContain('clip');
    expect(svg).not.toContain('transform');
  });
});

describe('buildContourSVG with keepHoles', () => {
  const donut = (fill: string, d = 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z'): SVGData => ({
    paths: [{ d, fill, stroke: 'none', strokeWidth: 1 }],
    viewBox: '0 0 100 100',
    width: 100,
    height: 100,
  });
  const source = donut('#ff0000');
  const target = donut('#0000ff', 'M5 5 H95 V95 H5 Z M30 30 V70 H70 V30 Z');
  const { plan } = planContours(source, target)!;

  it('draws the donut as one compound path that stays a donut, instead of two filled paths', () => {
    const svg = buildContourSVG(source, target, plan, 0.5, { keepHoles: true });

    expect(pathCount(svg)).toBe(1);
    expect(svg).toContain('fill-rule="evenodd"');
    const d = svg.match(/ d="([^"]*)"/)![1];
    expect(d.match(/M/g)).toHaveLength(2);
    expect(svg).toContain('fill="rgb(128, 0, 128)"');
  });

  it('is exactly the previous output when it is off or not given', () => {
    const before = buildContourSVG(source, target, plan, 0.5);

    expect(buildContourSVG(source, target, plan, 0.5, { keepHoles: false })).toBe(before);
    expect(pathCount(before)).toBe(2);
    expect(before).not.toContain('fill-rule');
  });

  it('changes nothing for a shape without fill, even when on', () => {
    const outline = (d?: string) => ({ ...donut('none', d), paths: [{ d: d ?? 'M0 0 H100 V100 H0 Z M25 25 V75 H75 V25 Z', fill: 'none', stroke: '#000000', strokeWidth: 2 }] });
    const a = outline();
    const b = outline('M5 5 H95 V95 H5 Z M30 30 V70 H70 V30 Z');
    const { plan: outlinePlan } = planContours(a, b)!;

    expect(buildContourSVG(a, b, outlinePlan, 0.5, { keepHoles: true })).toBe(buildContourSVG(a, b, outlinePlan, 0.5));
  });

  it('the compound holds the outer then the hole at every progress, ends included', () => {
    for (const progress of [0, 1]) {
      const svg = buildContourSVG(source, target, plan, progress, { keepHoles: true });
      const separate = buildContourSVG(source, target, plan, progress);
      const parts = [...separate.matchAll(/ d="([^"]*)"/g)].map((m) => m[1]);
      expect(svg).toContain(`d="${parts.join(' ')}"`);
    }
  });
});
