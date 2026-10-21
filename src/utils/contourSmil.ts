import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import { contoursFromSVGData, escapeAttr, type StyledContour } from './contourSvg';
import { findContour, pairNodes, pointsToPath, resolveNodeCount } from './contourInterpolation';

export interface ContourSmilOptions {
  /** Seconds for one full source → target → source cycle. */
  duration: number;
  loop: boolean;
  /** Nodes for every morphing pair that does not set its own. Absent means automatic. */
  nodeCount?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const round4 = (value: number): number => Math.round(value * 1e4) / 1e4;
const num = (value: number): string => String(round4(value));

// Same easing the whole-path SMIL export uses for a morph.
const SPLINES = '0.4 0 0.6 1;0.4 0 0.6 1';

type Curve = Array<[time: number, visibility: number]>;

/**
 * Visibility of the SOURCE side of a swap over one source → target → source cycle (1 = shown).
 * `swapAt` is progress, and progress reaches p at time p/2 going out and 1 - p/2 coming back,
 * so the cut happens twice. A fade is a linear ramp around each crossing, a hard cut a
 * discrete jump. Times are rounded and consecutive duplicates collapsed.
 */
function sourceCurve(entry: ContourPlanEntry): { mode: 'discrete' | 'linear'; points: Curve } {
  const swapAt = clamp01(entry.swapAt);
  const fade = clamp01(entry.fadeWindow);

  const raw: Curve =
    fade === 0
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

/** One `<path>` of the output, with whatever animations it carries. */
function pathElement(id: string, d: string, contour: StyledContour, opacity: number, children = ''): string {
  const fill = escapeAttr(contour.fill ?? 'none');
  const stroke = escapeAttr(contour.stroke ?? 'none');
  // caps and joins are copied as they are (they cannot be animated smoothly) and omitted when unset
  const caps =
    (contour.strokeLinecap ? ` stroke-linecap="${escapeAttr(contour.strokeLinecap)}"` : '') +
    (contour.strokeLinejoin ? ` stroke-linejoin="${escapeAttr(contour.strokeLinejoin)}"` : '');
  const attrs =
    ` id="${id}" d="${escapeAttr(d)}" fill="${fill}" stroke="${stroke}"` +
    ` stroke-width="${num(contour.strokeWidth ?? 1)}" opacity="${num(opacity)}"${caps}`;
  return children ? `<path${attrs}>${children}</path>` : `<path${attrs} />`;
}

/**
 * Render a contour plan as an animated SVG using SMIL only (no `<set>`, which the app sanitizer
 * forbids). One cycle runs source → target → source, like the whole-path SMIL export:
 * - morph: `<animate attributeName="d">` between the aligned nodes of the pair
 * - swap: the source and target shapes as two paths whose opacity is animated (hard cut or fade)
 * - static: the shape as drawn, no animation
 * Pure (no DOM, no worker). Uses the source SVG's size and viewBox.
 */
export function buildContourSMIL(
  source: SVGData,
  target: SVGData,
  plan: ContourPlanEntry[],
  options: ContourSmilOptions,
): string {
  const sourceContours = contoursFromSVGData(source, 'source');
  const targetContours = contoursFromSVGData(target, 'target');
  const timing = `dur="${options.duration}s" repeatCount="${options.loop ? 'indefinite' : '1'}"`;

  const animateNumbers = (attribute: string, a: number, b: number): string =>
    a === b ? '' : `<animate attributeName="${attribute}" values="${num(a)};${num(b)};${num(a)}" ${timing} />`;

  // colors blend; to or from "none" the value switches when progress crosses one half
  const animatePaint = (attribute: string, a: string | undefined, b: string | undefined): string => {
    const from = a ?? 'none';
    const to = b ?? 'none';
    if (from === to) return '';
    if (from !== 'none' && to !== 'none') {
      return `<animate attributeName="${attribute}" values="${escapeAttr(from)};${escapeAttr(to)};${escapeAttr(from)}" ${timing} />`;
    }
    return (
      `<animate attributeName="${attribute}" calcMode="discrete"` +
      ` values="${escapeAttr(from)};${escapeAttr(to)};${escapeAttr(from)};${escapeAttr(from)}"` +
      ` keyTimes="0;0.25;0.75;1" ${timing} />`
    );
  };

  const animateOpacity = (curve: ReturnType<typeof sourceCurve>, scale: number, flip: boolean): string => {
    const values = curve.points.map(([, v]) => num((flip ? 1 - v : v) * scale));
    const times = curve.points.map(([t]) => num(t));
    return (
      `<animate attributeName="opacity" calcMode="${curve.mode}"` +
      ` values="${values.join(';')}" keyTimes="${times.join(';')}" ${timing} />`
    );
  };

  const paths = plan.flatMap((entry, index): string[] => {
    const from = findContour(sourceContours, entry.sourceId, 'source');
    const to = findContour(targetContours, entry.targetId, 'target');
    if (!from && !to) throw new Error('A contour plan entry needs a source or a target contour');

    if (entry.mode === 'static') {
      const shown = (from ?? to) as StyledContour;
      return [pathElement(`contour-${index}`, shown.d, shown, shown.opacity ?? 1)];
    }

    if (entry.mode === 'morph' && from && to) {
      const nodes = pairNodes(from, to, resolveNodeCount(entry, from, to, { nodeCount: options.nodeCount }));
      const closed = from.closed && to.closed;
      const dFrom = pointsToPath(nodes.from, closed);
      const dTo = pointsToPath(nodes.to, closed);
      const children =
        `<animate attributeName="d" values="${dFrom};${dTo};${dFrom}" ${timing}` +
        ` calcMode="spline" keySplines="${SPLINES}" keyTimes="0;0.5;1" />` +
        animatePaint('fill', from.fill, to.fill) +
        animatePaint('stroke', from.stroke, to.stroke) +
        animateNumbers('stroke-width', from.strokeWidth ?? 1, to.strokeWidth ?? 1) +
        animateNumbers('opacity', from.opacity ?? 1, to.opacity ?? 1);
      return [pathElement(`contour-${index}`, dFrom, from, from.opacity ?? 1, children)];
    }

    // a swap, or a morph that lost one of its sides
    const curve = sourceCurve(entry);
    const result: string[] = [];
    if (from) {
      const opacity = from.opacity ?? 1;
      result.push(pathElement(`contour-${index}`, from.d, from, opacity, animateOpacity(curve, opacity, false)));
    }
    if (to) {
      const opacity = to.opacity ?? 1;
      // hidden at rest: the cycle ends back on the source, so the target is not shown after it
      result.push(pathElement(`contour-${index}-target`, to.d, to, 0, animateOpacity(curve, opacity, true)));
    }
    return result;
  });

  const { viewBox, width, height } = source;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeAttr(String(width))}"` +
    ` height="${escapeAttr(String(height))}" viewBox="${escapeAttr(viewBox)}">${paths.join('')}</svg>`
  );
}
