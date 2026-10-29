import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import { contoursFromSVGData, escapeAttr, type StyledContour } from './contourSvg';
import { holeGroups } from './contourHoleGroups';
import { findContour, pairNodes, pointsToPath, resolveNodeCount } from './contourInterpolation';
import type { StrokeLinecap, StrokeLinejoin } from './strokeStyle';
import {
  VIEW_CLIP_ID,
  clipPathTag,
  offscreenOffset,
  oppositeDirection,
  parseViewBox,
  planSlides,
  slideOf,
  type Bounds,
} from './contourSlide';

/**
 * What one cycle of the animation runs: `both` goes source → target → source (the default, and what
 * every cycle does when the animation does not loop), `forward` goes source → target and, looping,
 * starts again from the source.
 */
export type SmilDirection = 'both' | 'forward';

export interface ContourSmilOptions {
  /** Seconds for one cycle (see `direction`). */
  duration: number;
  loop: boolean;
  /** Only meaningful with `loop`: a non-looping animation always runs the full cycle. Default `both`. */
  direction?: SmilDirection;
  /** Nodes for every morphing pair that does not set its own. Absent means automatic. */
  nodeCount?: number;
  /** Draw the holes of filled shapes as holes (see `holeGroups`). Default false. */
  keepHoles?: boolean;
}

/**
 * One `<animate>` (or, with `transform`, one `<animateTransform>`), without its timing
 * (`dur` / `repeatCount`), which the output format supplies.
 */
export interface SmilAnimation {
  attributeName: string;
  /** Set for an `<animateTransform type="translate">`; `values` are then `x y` pairs. */
  transform?: 'translate';
  values: string;
  calcMode?: 'linear' | 'discrete' | 'spline';
  keyTimes?: string;
  keySplines?: string;
}

/** One `<path>` of the output with the animations it carries. Values are not escaped yet. */
export interface SmilPath {
  id: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  strokeLinecap?: StrokeLinecap;
  strokeLinejoin?: StrokeLinejoin;
  /** Set on a path that holds a shape and its holes, so the holes stay empty. */
  fillRule?: 'evenodd';
  animations: SmilAnimation[];
}

export interface SmilModel {
  width: number;
  height: number;
  viewBox: string;
  /** Present when a contour slides: the drawing is clipped to this box so the slide leaves through its edge. */
  clip?: Bounds;
  paths: SmilPath[];
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const round4 = (value: number): number => Math.round(value * 1e4) / 1e4;
const num = (value: number): string => String(round4(value));

// Same easing the whole-path SMIL export uses for a morph.
const SPLINES = '0.4 0 0.6 1;0.4 0 0.6 1';
const SPLINE = '0.4 0 0.6 1';

// `a;b;a` for a cycle that comes back, `a;b` for one that only goes forward
const cycleValues = (a: string, b: string, forward: boolean): string => (forward ? `${a};${b}` : `${a};${b};${a}`);

type Curve = Array<[time: number, visibility: number]>;

/**
 * Visibility of the SOURCE side of a swap over one source → target → source cycle (1 = shown).
 * `swapAt` is progress, and progress reaches p at time p/2 going out and 1 - p/2 coming back,
 * so the cut happens twice. A fade is a linear ramp around each crossing, a hard cut a
 * discrete jump. Times are rounded and consecutive duplicates collapsed.
 */
function sourceCurve(
  entry: ContourPlanEntry,
  forward = false,
): { mode: 'discrete' | 'linear'; points: Curve } {
  const swapAt = clamp01(entry.swapAt);
  const fade = clamp01(entry.fadeWindow);

  // a forward-only cycle is progress itself: the cut happens once, at time `swapAt`
  const raw: Curve = forward
    ? fade === 0
      ? [[0, 1], [swapAt, 0], [1, 0]]
      : [[0, 1], [clamp01(swapAt - fade / 2), 1], [clamp01(swapAt + fade / 2), 0], [1, 0]]
    : fade === 0
      ? [[0, 1], [swapAt / 2, 0], [1 - swapAt / 2, 1], [1, 1]]
      : (() => {
          const goStart = clamp01(swapAt - fade / 2) / 2;
          const goEnd = clamp01(swapAt + fade / 2) / 2;
          return [[0, 1], [goStart, 1], [goEnd, 0], [1 - goEnd, 0], [1 - goStart, 1], [1, 1]];
        })();

  const points: Curve = [];
  for (const [time, value] of raw) {
    const point: [number, number] = [round4(time), value];
    const last = points[points.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) points.push(point);
  }
  return { mode: fade === 0 ? 'discrete' : 'linear', points };
}

const animateNumbers = (attribute: string, a: number, b: number, forward: boolean): SmilAnimation[] =>
  a === b ? [] : [{ attributeName: attribute, values: cycleValues(num(a), num(b), forward) }];

// colors blend; to or from "none" the value switches when progress crosses one half
function animatePaint(
  attribute: string,
  a: string | undefined,
  b: string | undefined,
  forward: boolean,
): SmilAnimation[] {
  const from = a ?? 'none';
  const to = b ?? 'none';
  if (from === to) return [];
  if (from !== 'none' && to !== 'none') {
    return [{ attributeName: attribute, values: cycleValues(from, to, forward) }];
  }
  return [
    {
      attributeName: attribute,
      calcMode: 'discrete',
      values: forward ? `${from};${to};${to}` : `${from};${to};${from};${from}`,
      keyTimes: forward ? '0;0.5;1' : '0;0.25;0.75;1',
    },
  ];
}

function animateOpacity(curve: ReturnType<typeof sourceCurve>, scale: number, flip: boolean): SmilAnimation {
  return {
    attributeName: 'opacity',
    calcMode: curve.mode,
    values: curve.points.map(([, v]) => num((flip ? 1 - v : v) * scale)).join(';'),
    keyTimes: curve.points.map(([t]) => num(t)).join(';'),
  };
}

// Offset of a sliding shape along the cycle: `offset` when its side is fully away (visibility 0),
// none when it is in place. `shown` is the visibility of the side the shape belongs to.
function animateTranslate(
  curve: ReturnType<typeof sourceCurve>,
  offset: { x: number; y: number },
  isSourceSide: boolean,
): SmilAnimation {
  const away = (visibility: number) => (isSourceSide ? 1 - visibility : visibility);
  return {
    attributeName: 'transform',
    transform: 'translate',
    calcMode: curve.mode,
    values: curve.points.map(([, v]) => `${num(offset.x * away(v))} ${num(offset.y * away(v))}`).join(';'),
    keyTimes: curve.points.map(([t]) => num(t)).join(';'),
  };
}

// `a;b;a` and `c;d;c` become `a c;b d;a c`: the same keyframes, two outlines each. Null when the
// two animations do not have the same number of keyframes.
function joinKeyframes(outer: string, hole: string): string | null {
  const outerFrames = outer.split(';');
  const holeFrames = hole.split(';');
  if (outerFrames.length !== holeFrames.length) return null;
  return outerFrames.map((frame, i) => `${frame} ${holeFrames[i]}`).join(';');
}

// Folds the path of every hole into the path of its outer shape (ids are `contour-<plan index>`), so
// the holes are drawn with it and stay empty. A group that cannot be joined cleanly is left as it was.
function joinHoles(paths: SmilPath[], groups: ReturnType<typeof holeGroups>): SmilPath[] {
  const byId = new Map(paths.map((path) => [path.id, path]));
  const merged = new Map<string, SmilPath>();
  const absorbed = new Set<string>();

  for (const group of groups) {
    const outer = byId.get(`contour-${group.outer}`);
    const holes = group.holes.map((index) => byId.get(`contour-${index}`));
    if (!outer || holes.some((hole) => !hole)) continue;

    let { d } = outer;
    let animations = outer.animations;
    let joinable = true;
    for (const hole of holes as SmilPath[]) {
      d = `${d} ${hole.d}`;
      const outerShape = animations.find((a) => a.attributeName === 'd');
      const holeShape = hole.animations.find((a) => a.attributeName === 'd');
      if (!outerShape || !holeShape) {
        joinable = false;
        break;
      }
      const values = joinKeyframes(outerShape.values, holeShape.values);
      if (values === null) {
        joinable = false;
        break;
      }
      animations = animations.map((a) => (a === outerShape ? { ...a, values } : a));
    }
    if (!joinable) continue;

    merged.set(outer.id, { ...outer, d, animations, fillRule: 'evenodd' });
    (holes as SmilPath[]).forEach((hole) => absorbed.add(hole.id));
  }

  return paths.filter((path) => !absorbed.has(path.id)).map((path) => merged.get(path.id) ?? path);
}

function smilPath(
  id: string,
  d: string,
  contour: StyledContour,
  opacity: number,
  animations: SmilAnimation[] = [],
): SmilPath {
  return {
    id,
    d,
    fill: contour.fill ?? 'none',
    stroke: contour.stroke ?? 'none',
    strokeWidth: round4(contour.strokeWidth ?? 1),
    opacity: round4(opacity),
    strokeLinecap: contour.strokeLinecap,
    strokeLinejoin: contour.strokeLinejoin,
    animations,
  };
}

/**
 * Describe the animation of a contour plan: one path per drawn contour with its `<animate>`s.
 * One cycle runs source → target → source, like the whole-path SMIL export:
 * - morph: `d` between the aligned nodes of the pair, plus paint / width / opacity when they differ
 * - swap: the source and target shapes as two paths whose opacity is animated (hard cut or fade)
 * - static: the shape as drawn, no animation
 * Pure (no DOM, no worker). Uses the source SVG's size and viewBox. Throws if the plan
 * references a contour that does not exist.
 */
export function buildContourSmilModel(
  source: SVGData,
  target: SVGData,
  plan: ContourPlanEntry[],
  options: { nodeCount?: number; direction?: SmilDirection; keepHoles?: boolean } = {},
): SmilModel {
  const forward = options.direction === 'forward';
  const bounds = parseViewBox(source.viewBox, source.width, source.height);
  const sourceContours = contoursFromSVGData(source, 'source');
  const targetContours = contoursFromSVGData(target, 'target');

  const drawn = plan.flatMap((entry, index): SmilPath[] => {
    const from = findContour(sourceContours, entry.sourceId, 'source');
    const to = findContour(targetContours, entry.targetId, 'target');
    if (!from && !to) throw new Error('A contour plan entry needs a source or a target contour');

    if (entry.mode === 'static') {
      const shown = (from ?? to) as StyledContour;
      return [smilPath(`contour-${index}`, shown.d, shown, shown.opacity ?? 1)];
    }

    if (entry.mode === 'morph' && from && to) {
      const nodes = pairNodes(
        from,
        to,
        resolveNodeCount(entry, from, to, { nodeCount: options.nodeCount }),
        entry.anchors,
      );
      const closed = from.closed && to.closed;
      const dFrom = pointsToPath(nodes.from, closed);
      const dTo = pointsToPath(nodes.to, closed);
      const animations: SmilAnimation[] = [
        {
          attributeName: 'd',
          values: cycleValues(dFrom, dTo, forward),
          calcMode: 'spline',
          keySplines: forward ? SPLINE : SPLINES,
          keyTimes: forward ? '0;1' : '0;0.5;1',
        },
        ...animatePaint('fill', from.fill, to.fill, forward),
        ...animatePaint('stroke', from.stroke, to.stroke, forward),
        ...animateNumbers('stroke-width', from.strokeWidth ?? 1, to.strokeWidth ?? 1, forward),
        ...animateNumbers('opacity', from.opacity ?? 1, to.opacity ?? 1, forward),
      ];
      return [smilPath(`contour-${index}`, dFrom, from, from.opacity ?? 1, animations)];
    }

    // a swap, or a morph that lost one of its sides
    const curve = sourceCurve(entry, forward);
    const slide = slideOf(entry);
    const result: SmilPath[] = [];
    if (from) {
      const opacity = from.opacity ?? 1;
      const animations = slide
        ? [
            animateTranslate(curve, offscreenOffset(from.bbox, bounds, slide.direction), true),
            ...(slide.fade ? [animateOpacity(curve, opacity, false)] : []),
          ]
        : [animateOpacity(curve, opacity, false)];
      result.push(smilPath(`contour-${index}`, from.d, from, opacity, animations));
    }
    if (to) {
      const opacity = to.opacity ?? 1;
      // hidden at rest: the cycle ends back on the source, so the target is not shown after it. A slide
      // without fade hides it by position instead: it starts, and ends, outside the clipped drawing.
      const animations = slide
        ? [
            animateTranslate(curve, offscreenOffset(to.bbox, bounds, oppositeDirection(slide.direction)), false),
            ...(slide.fade ? [animateOpacity(curve, opacity, true)] : []),
          ]
        : [animateOpacity(curve, opacity, true)];
      result.push(
        smilPath(`contour-${index}-target`, to.d, to, slide && !slide.fade ? opacity : 0, animations),
      );
    }
    return result;
  });

  const paths = options.keepHoles ? joinHoles(drawn, holeGroups(plan, sourceContours, targetContours)) : drawn;

  return {
    width: source.width,
    height: source.height,
    viewBox: source.viewBox,
    ...(planSlides(plan) && { clip: bounds }),
    paths,
  };
}

function animateTag(animation: SmilAnimation, timing: string): string {
  return (
    (animation.transform ? '<animateTransform' : '<animate') +
    ` attributeName="${animation.attributeName}"` +
    (animation.transform ? ` type="${animation.transform}"` : '') +
    (animation.calcMode ? ` calcMode="${animation.calcMode}"` : '') +
    ` values="${escapeAttr(animation.values)}"` +
    (animation.keyTimes ? ` keyTimes="${animation.keyTimes}"` : '') +
    (animation.keySplines ? ` keySplines="${animation.keySplines}"` : '') +
    ` ${timing} />`
  );
}

/**
 * Render a contour plan as an animated SVG using SMIL only (no `<set>`, which the app sanitizer
 * forbids). See `buildContourSmilModel` for what each mode does.
 */
export function buildContourSMIL(
  source: SVGData,
  target: SVGData,
  plan: ContourPlanEntry[],
  options: ContourSmilOptions,
): string {
  const model = buildContourSmilModel(source, target, plan, {
    nodeCount: options.nodeCount,
    keepHoles: options.keepHoles,
    // a cycle that does not repeat always runs the whole way there and back
    direction: options.loop && options.direction === 'forward' ? 'forward' : 'both',
  });
  const timing = `dur="${options.duration}s" repeatCount="${options.loop ? 'indefinite' : '1'}"`;

  const paths = model.paths.map((path) => {
    const caps =
      (path.strokeLinecap ? ` stroke-linecap="${escapeAttr(path.strokeLinecap)}"` : '') +
      (path.strokeLinejoin ? ` stroke-linejoin="${escapeAttr(path.strokeLinejoin)}"` : '');
    const attrs =
      ` id="${path.id}" d="${escapeAttr(path.d)}" fill="${escapeAttr(path.fill)}"${path.fillRule ? ` fill-rule="${path.fillRule}"` : ''} stroke="${escapeAttr(path.stroke)}"` +
      ` stroke-width="${num(path.strokeWidth)}" opacity="${num(path.opacity)}"${caps}`;
    return path.animations.length > 0
      ? `<path${attrs}>${path.animations.map((a) => animateTag(a, timing)).join('')}</path>`
      : `<path${attrs} />`;
  });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeAttr(String(model.width))}"` +
    ` height="${escapeAttr(String(model.height))}" viewBox="${escapeAttr(model.viewBox)}">${
      model.clip
        ? `<defs>${clipPathTag(model.clip)}</defs><g clip-path="url(#${VIEW_CLIP_ID})">${paths.join('')}</g>`
        : paths.join('')
    }</svg>`
  );
}
