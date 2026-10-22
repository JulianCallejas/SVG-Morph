// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import { planContours } from './contourSvg';
import { buildContourSMIL } from './contourSmil';

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

const icons = {
  source: svgData([{ d: CLOUD_ARROW_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }]),
  target: svgData([{ d: CLOUD_BOLT_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2 }]),
};

const parse = (svg: string): Document => new DOMParser().parseFromString(svg, 'image/svg+xml');
const options = { duration: 2, loop: false };

// two single-contour paths that are close enough to be paired by default
const lineA = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', strokeWidth: 2, opacity: 1 }]);
const lineB = svgData([{ d: 'M0 2 L10 2', stroke: '#000000', strokeWidth: 2, opacity: 1 }]);

const entry = (overrides: Partial<ContourPlanEntry>): ContourPlanEntry => ({
  sourceId: 's1.1',
  targetId: 't1.1',
  mode: 'swap',
  swapAt: 0.8,
  fadeWindow: 0,
  ...overrides,
});

const animation = (el: Element, attribute: string): Element | null =>
  [...el.querySelectorAll('animate')].find((a) => a.getAttribute('attributeName') === attribute) ?? null;

describe('buildContourSMIL: morph', () => {
  const doc = parse(buildContourSMIL(lineA, lineB, [entry({ mode: 'morph', nodeCount: 4 })], options));
  const path = doc.querySelector('path')!;

  it('animates the path data from source to target and back', () => {
    const d = animation(path, 'd')!;
    const [from, to, back] = d.getAttribute('values')!.split(';');

    expect(from).toMatch(/^M0,0 L/);
    expect(to).toMatch(/^M0,2 L/);
    expect(back).toBe(from);
    expect(d.getAttribute('keyTimes')).toBe('0;0.5;1');
    expect(d.getAttribute('calcMode')).toBe('spline');
    expect(d.getAttribute('keySplines')).toBe('0.4 0 0.6 1;0.4 0 0.6 1');
  });

  it('draws the source shape as the base value', () => {
    expect(path.getAttribute('d')).toBe(animation(path, 'd')!.getAttribute('values')!.split(';')[0]);
  });

  it('uses the entry node count', () => {
    expect((path.getAttribute('d')!.match(/[ML]/g) ?? []).length).toBe(5);
  });

  it('repeats once, or forever when looping', () => {
    expect(animation(path, 'd')!.getAttribute('repeatCount')).toBe('1');
    const looping = parse(buildContourSMIL(lineA, lineB, [entry({ mode: 'morph' })], { ...options, loop: true }));
    expect(animation(looping.querySelector('path')!, 'd')!.getAttribute('repeatCount')).toBe('indefinite');
  });

  it('animates stroke width only when it differs', () => {
    expect(animation(path, 'stroke-width')).toBeNull();

    const thick = svgData([{ d: 'M0 2 L10 2', stroke: '#000000', strokeWidth: 6 }]);
    const other = parse(buildContourSMIL(lineA, thick, [entry({ mode: 'morph' })], options)).querySelector('path')!;
    expect(animation(other, 'stroke-width')!.getAttribute('values')).toBe('2;6;2');
  });

  it('blends two colors, and switches to or from "none" at the halfway points', () => {
    const red = svgData([{ d: 'M0 0 L10 0', stroke: '#ff0000' }]);
    const blue = svgData([{ d: 'M0 2 L10 2', stroke: '#0000ff' }]);
    const none = svgData([{ d: 'M0 2 L10 2', stroke: 'none' }]);

    const blended = parse(buildContourSMIL(red, blue, [entry({ mode: 'morph' })], options)).querySelector('path')!;
    expect(animation(blended, 'stroke')!.getAttribute('values')).toBe('#ff0000;#0000ff;#ff0000');

    const switched = parse(buildContourSMIL(red, none, [entry({ mode: 'morph' })], options)).querySelector('path')!;
    const stroke = animation(switched, 'stroke')!;
    expect(stroke.getAttribute('calcMode')).toBe('discrete');
    expect(stroke.getAttribute('values')).toBe('#ff0000;none;#ff0000;#ff0000');
    expect(stroke.getAttribute('keyTimes')).toBe('0;0.25;0.75;1');
  });

  it('closes the path only when both sides are closed', () => {
    const closed = svgData([{ d: 'M0 0 L10 0 L10 10 Z' }]);
    const open = svgData([{ d: 'M0 0 L10 0 L10 10' }]);

    const both = parse(buildContourSMIL(closed, closed, [entry({ mode: 'morph' })], options)).querySelector('path')!;
    const mixed = parse(buildContourSMIL(closed, open, [entry({ mode: 'morph' })], options)).querySelector('path')!;

    expect(both.getAttribute('d')!.trim().endsWith('Z')).toBe(true);
    expect(mixed.getAttribute('d')).not.toContain('Z');
  });
});

describe('buildContourSMIL: swap', () => {
  const build = (overrides: Partial<ContourPlanEntry>) =>
    parse(buildContourSMIL(lineA, lineB, [entry(overrides)], options));

  it('cuts from source to target at swapAt on the way there, and back on the way home', () => {
    const [source, target] = [...build({}).querySelectorAll('path')];
    const sourceOpacity = animation(source, 'opacity')!;
    const targetOpacity = animation(target, 'opacity')!;

    // swapAt 0.8 happens at 40% of the loop going out and 60% coming back
    expect(sourceOpacity.getAttribute('calcMode')).toBe('discrete');
    expect(sourceOpacity.getAttribute('keyTimes')).toBe('0;0.4;0.6;1');
    expect(sourceOpacity.getAttribute('values')).toBe('1;0;1;1');
    expect(targetOpacity.getAttribute('values')).toBe('0;1;0;0');
    expect(target.getAttribute('opacity')).toBe('0');
    expect(source.getAttribute('d')).toBe('M0 0L10 0');
    expect(target.getAttribute('d')).toBe('M0 2L10 2');
  });

  it('cross-fades over the fade window with linear steps', () => {
    const [source, target] = [...build({ swapAt: 0.8, fadeWindow: 0.2 }).querySelectorAll('path')];
    const sourceOpacity = animation(source, 'opacity')!;

    expect(sourceOpacity.getAttribute('calcMode')).toBe('linear');
    expect(sourceOpacity.getAttribute('keyTimes')).toBe('0;0.35;0.45;0.55;0.65;1');
    expect(sourceOpacity.getAttribute('values')).toBe('1;1;0;0;1;1');
    expect(animation(target, 'opacity')!.getAttribute('values')).toBe('0;0;1;1;0;0');
  });

  it('clamps a fade that would start before the animation', () => {
    const [source] = [...build({ swapAt: 0, fadeWindow: 0.4 }).querySelectorAll('path')];
    const sourceOpacity = animation(source, 'opacity')!;

    expect(sourceOpacity.getAttribute('keyTimes')).toBe('0;0.1;0.9;1');
    expect(sourceOpacity.getAttribute('values')).toBe('1;0;0;1');
  });

  it('multiplies by the path opacity', () => {
    const faint = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', opacity: 0.5 }]);
    const doc = parse(buildContourSMIL(faint, lineB, [entry({ swapAt: 0.8 })], options));
    const [source] = [...doc.querySelectorAll('path')];

    expect(source.getAttribute('opacity')).toBe('0.5');
    expect(animation(source, 'opacity')!.getAttribute('values')).toBe('0.5;0;0.5;0.5');
  });

  it('draws only the source for a contour with no partner, hidden after the swap', () => {
    const paths = build({ targetId: null }).querySelectorAll('path');

    expect(paths).toHaveLength(1);
    expect(animation(paths[0], 'opacity')!.getAttribute('values')).toBe('1;0;1;1');
  });

  it('draws only the target for a contour with no source, shown after the swap', () => {
    const paths = build({ sourceId: null }).querySelectorAll('path');

    expect(paths).toHaveLength(1);
    expect(paths[0].getAttribute('opacity')).toBe('0');
    expect(animation(paths[0], 'opacity')!.getAttribute('values')).toBe('0;1;0;0');
  });
});

describe('buildContourSMIL: static and document', () => {
  it('keeps the round caps and joins on every path it writes', () => {
    const round = svgData([
      { d: 'M0 0 L10 0 M20 20 L30 20', stroke: '#000000', strokeLinecap: 'round', strokeLinejoin: 'round' },
    ]);
    const plan = planContours(round, round)!.plan;

    const doc = parse(buildContourSMIL(round, round, plan, options));

    for (const path of doc.querySelectorAll('path')) {
      expect(path.getAttribute('stroke-linecap')).toBe('round');
      expect(path.getAttribute('stroke-linejoin')).toBe('round');
    }
  });

  it('writes no cap or join when the source sets none', () => {
    const path = parse(buildContourSMIL(lineA, lineB, [entry({ mode: 'static' })], options)).querySelector('path')!;

    expect(path.hasAttribute('stroke-linecap')).toBe(false);
  });

  it('keeps a static contour as drawn, with no animation', () => {
    const [path] = [...parse(buildContourSMIL(lineA, lineB, [entry({ mode: 'static' })], options)).querySelectorAll('path')];

    expect(path.getAttribute('d')).toBe('M0 0L10 0');
    expect(path.querySelectorAll('animate')).toHaveLength(0);
  });

  it('never uses <set>, which the app sanitizer forbids', () => {
    const { plan } = planContours(icons.source, icons.target)!;

    const svg = buildContourSMIL(icons.source, icons.target, plan, options);

    expect(svg).not.toMatch(/<set[\s>]/);
  });

  it('exports every contour of the reference icons', () => {
    const { plan } = planContours(icons.source, icons.target)!;

    const doc = parse(buildContourSMIL(icons.source, icons.target, plan, options));

    // cloud and shaft morph, the two arrowheads fade out: 2 + 2 paths
    expect(doc.querySelectorAll('path')).toHaveLength(4);
  });

  it('uses the source size and viewBox', () => {
    const root = parse(buildContourSMIL(lineA, lineB, [entry({ mode: 'static' })], options)).documentElement;

    expect(root.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(root.getAttribute('width')).toBe('800');
    expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });

  it('escapes attribute values taken from the SVG', () => {
    const hostile = svgData([{ d: 'M0 0 L10 0', stroke: 'x" onload="alert(1)' }]);

    const svg = buildContourSMIL(hostile, hostile, [entry({ mode: 'static' })], options);

    expect(svg).not.toContain('onload="alert');
    expect(parse(svg).querySelector('parsererror')).toBeNull();
  });

  it('throws when the plan references a contour that does not exist', () => {
    expect(() => buildContourSMIL(lineA, lineB, [entry({ sourceId: 'nope' })], options)).toThrow(/nope/);
  });
});

describe('buildContourSMIL: matched points', () => {
  const long = svgData([{ d: 'M0 0 L10 0', stroke: '#000000', strokeWidth: 2, opacity: 1 }]);
  const longer = svgData([{ d: 'M0 2 L100 2', stroke: '#000000', strokeWidth: 2, opacity: 1 }]);
  const target = (anchors?: ContourPlanEntry['anchors']) => {
    const plan = [entry({ mode: 'morph', nodeCount: 4, ...(anchors && { anchors }) })];
    const doc = parse(buildContourSMIL(long, longer, plan, options));
    return animation(doc.querySelector('path')!, 'd')!.getAttribute('values')!.split(';')[1];
  };

  it('keeps the export as it was without matched points', () => {
    expect(target([])).toBe(target());
  });

  it('moves the end shape of the morph to honour a matched point', () => {
    // the middle of the short line meets the quarter of the long one
    expect(target([{ source: 0.5, target: 0.25 }])).not.toBe(target());
    expect(target([{ source: 0.5, target: 0.25 }])).toMatch(/L25(\.0\d*)?,2/);
  });
});

describe('buildContourSMIL: loop direction', () => {
  const sourceData = svgData([
    { d: 'M0 0 L10 0', stroke: '#000000', strokeWidth: 2, opacity: 1 },
    { d: 'M0 20 L10 20', stroke: '#112233', strokeWidth: 2, opacity: 1 },
  ]);
  const targetData = svgData([{ d: 'M0 2 L10 2', stroke: '#445566', strokeWidth: 4, opacity: 1 }]);
  const plan = [
    entry({ sourceId: 's1.1', targetId: 't1.1', mode: 'morph', nodeCount: 4 }),
    entry({ sourceId: 's2.1', targetId: null, mode: 'swap', swapAt: 0.8, fadeWindow: 0 }),
  ];
  const render = (opts: Partial<Parameters<typeof buildContourSMIL>[3]>) =>
    parse(buildContourSMIL(sourceData, targetData, plan, { duration: 2, loop: true, ...opts }));
  const attr = (el: Element | null, name: string) => el?.getAttribute(name);

  it('keeps the same output when no direction is given or both ways is asked', () => {
    const original = buildContourSMIL(sourceData, targetData, plan, { duration: 2, loop: true });

    expect(buildContourSMIL(sourceData, targetData, plan, { duration: 2, loop: true, direction: 'both' })).toBe(original);
  });

  it('runs the whole cycle when the animation does not loop, whatever the direction', () => {
    const forwardOnce = buildContourSMIL(sourceData, targetData, plan, { duration: 2, loop: false, direction: 'forward' });

    expect(forwardOnce).toBe(buildContourSMIL(sourceData, targetData, plan, { duration: 2, loop: false }));
  });

  it('goes source to target only in a forward loop: a morph has two values and one spline', () => {
    const doc = render({ direction: 'forward' });
    const d = animation(doc.querySelector('#contour-0')!, 'd')!;

    expect(attr(d, 'values')!.split(';')).toHaveLength(2);
    expect(attr(d, 'keyTimes')).toBe('0;1');
    expect(attr(d, 'keySplines')).toBe('0.4 0 0.6 1');
    expect(attr(d, 'repeatCount')).toBe('indefinite');
    // paint and width animate from the source value to the target one, without coming back
    expect(attr(animation(doc.querySelector('#contour-0')!, 'stroke'), 'values')).toBe('#000000;#445566');
    expect(attr(animation(doc.querySelector('#contour-0')!, 'stroke-width'), 'values')).toBe('2;4');
  });

  it('cuts a swap once, at its percentage of the cycle, in a forward loop', () => {
    const doc = render({ direction: 'forward' });
    const opacity = animation(doc.querySelector('#contour-1')!, 'opacity')!;

    expect(attr(opacity, 'values')).toBe('1;0;0');
    expect(attr(opacity, 'keyTimes')).toBe('0;0.8;1');
  });

  it('fades a swap in a forward loop over its window', () => {
    const faded = [plan[0], { ...plan[1], fadeWindow: 0.2 }];
    const doc = parse(buildContourSMIL(sourceData, targetData, faded, { duration: 2, loop: true, direction: 'forward' }));
    const opacity = animation(doc.querySelector('#contour-1')!, 'opacity')!;

    expect(attr(opacity, 'calcMode')).toBe('linear');
    expect(attr(opacity, 'keyTimes')).toBe('0;0.7;0.9;1');
    expect(attr(opacity, 'values')).toBe('1;1;0;0');
  });
});
