import { interpolateString } from 'd3-interpolate';

export type DemoShapeId = 'circle' | 'star' | 'square';
export type DemoEasing = 'linear' | 'ease-in-out';

export interface DemoShape {
  id: DemoShapeId;
  label: string;
  d: string;
}

type Point = [number, number];
type Curve = [Point, Point, Point];

const CENTER = 150;
const ANCHORS = 8;
const SPLINE = '0.65 0 0.35 1';

// Adding 0 turns -0 into 0 so no path ever prints "-0".
const round = (n: number): string => String(Number(n.toFixed(1)) + 0);
const pair = ([x, y]: Point): string => `${round(x)} ${round(y)}`;

const angleAt = (index: number): number => ((-90 + (360 / ANCHORS) * index) * Math.PI) / 180;

const anchorAt = (index: number, radius: number): Point => [
  CENTER + radius * Math.cos(angleAt(index)),
  CENTER + radius * Math.sin(angleAt(index)),
];

const compose = (start: Point, curves: Curve[]): string =>
  `M${pair(start)} ${curves.map(([a, b, c]) => `C${pair(a)} ${pair(b)} ${pair(c)}`).join(' ')} Z`;

// Every demo shape is built from the same 8 anchors: M + 8 cubic segments + Z.
// That is what makes them interpolable without re-normalizing.
const circlePath = (radius: number): string => {
  const handle = (4 / 3) * Math.tan(Math.PI / (2 * ANCHORS)) * radius;
  const tangent = (i: number): Point => [-Math.sin(angleAt(i)), Math.cos(angleAt(i))];
  const curves: Curve[] = Array.from({ length: ANCHORS }, (_, i) => {
    const next = (i + 1) % ANCHORS;
    const from = anchorAt(i, radius);
    const to = anchorAt(next, radius);
    const out = tangent(i);
    const into = tangent(next);
    return [
      [from[0] + out[0] * handle, from[1] + out[1] * handle],
      [to[0] - into[0] * handle, to[1] - into[1] * handle],
      to,
    ];
  });
  return compose(anchorAt(0, radius), curves);
};

// Straight edges expressed as cubics whose handles sit on their endpoints.
const polygonPath = (radii: number[]): string => {
  const points = radii.map((radius, i) => anchorAt(i, radius));
  const curves: Curve[] = points.map((from, i) => {
    const to = points[(i + 1) % points.length];
    return [from, to, to];
  });
  return compose(points[0], curves);
};

export const DEMO_SHAPES: readonly DemoShape[] = [
  { id: 'circle', label: 'Circle', d: circlePath(100) },
  { id: 'star', label: 'Star', d: polygonPath([108, 46, 108, 46, 108, 46, 108, 46]) },
  {
    id: 'square',
    label: 'Square',
    d: polygonPath([88, 88 * Math.SQRT2, 88, 88 * Math.SQRT2, 88, 88 * Math.SQRT2, 88, 88 * Math.SQRT2]),
  },
];

export const getDemoShape = (id: DemoShapeId): DemoShape =>
  DEMO_SHAPES.find((shape) => shape.id === id) ?? DEMO_SHAPES[0];

// Only valid for paths with the same command sequence, like DEMO_SHAPES.
export const interpolatePath = (from: string, to: string, t: number): string =>
  interpolateString(from, to)(t);

// Same curve as cubic-bezier(0.65, 0, 0.35, 1), the spline written into the SMIL output.
export const applyEasing = (easing: DemoEasing, t: number): number => {
  if (easing === 'linear') return t;
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

// Points of an easing curve for charts: x is time, y is progress, both from 0 to 1.
export const sampleEasing = (easing: DemoEasing, steps: number): [number, number][] => {
  if (steps < 1) throw new Error('sampleEasing needs at least one step');
  return Array.from({ length: steps + 1 }, (_, i) => {
    const x = i / steps;
    return [x, applyEasing(easing, x)] as [number, number];
  });
};

export interface SmilSnippetOptions {
  from: string;
  to: string;
  durationSeconds: number;
  easing: DemoEasing;
}

export const buildSmilSnippet = ({ from, to, durationSeconds, easing }: SmilSnippetOptions): string => {
  const spline =
    easing === 'ease-in-out'
      ? ['    calcMode="spline"', '    keyTimes="0;0.5;1"', `    keySplines="${SPLINE};${SPLINE}"`]
      : [];
  return [
    `<path d="${from}">`,
    '  <animate',
    '    attributeName="d"',
    `    dur="${durationSeconds}s"`,
    '    repeatCount="indefinite"',
    ...spline,
    `    values="${from};${to};${from}"`,
    '  />',
    '</path>',
  ].join('\n');
};
