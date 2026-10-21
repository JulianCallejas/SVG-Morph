import { interpolateColor } from './svgMorphing';
import type { SVGData } from './svgMorphing';
import { splitContours, type Contour } from './contours';
import { pairContours, type ContourPlanEntry } from './contourPairing';
import {
  interpolateContours,
  type InterpolateContoursOptions,
  type RenderedContour,
} from './contourInterpolation';

/** A contour plus the style of the `<path>` it was split from. */
export interface StyledContour extends Contour {
  pathIndex: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface ContourPlanResult {
  sourceContours: StyledContour[];
  targetContours: StyledContour[];
  plan: ContourPlanEntry[];
}

/**
 * Split every `<path>` of a parsed SVG into contours. Ids are `s<path>.<contour>` for the
 * source and `t<path>.<contour>` for the target, e.g. `s1.2` is the second subpath of the
 * first path. Both the store and the renderers use this function so the ids always agree.
 */
export function contoursFromSVGData(data: SVGData, side: 'source' | 'target'): StyledContour[] {
  const prefix = side === 'source' ? 's' : 't';

  return data.paths.flatMap((path, pathIndex) =>
    splitContours(path.d, `${prefix}${pathIndex + 1}.`).map((contour) => ({
      ...contour,
      pathIndex,
      fill: path.fill,
      stroke: path.stroke,
      strokeWidth: path.strokeWidth,
      opacity: path.opacity,
    })),
  );
}

/**
 * Contours and a suggested plan for a pair of SVGs, or null when a path cannot be parsed.
 * Callers then stay on the whole-path pipeline instead of failing.
 */
export function planContours(source: SVGData, target: SVGData): ContourPlanResult | null {
  try {
    const sourceContours = contoursFromSVGData(source, 'source');
    const targetContours = contoursFromSVGData(target, 'target');
    return { sourceContours, targetContours, plan: pairContours(sourceContours, targetContours) };
  } catch (error) {
    console.warn('Contour planning failed, using whole-path interpolation:', error);
    return null;
  }
}

const hasSeveralContoursPerPath = (contours: StyledContour[]): boolean =>
  new Set(contours.map((c) => c.pathIndex)).size < contours.length;

/**
 * The contour pipeline is only needed when a path holds several subpaths (the case the
 * whole-path pipeline gets wrong) or when the user edited the plan. Everything else keeps
 * the existing pipeline, so current SVGs render exactly as before.
 */
export function needsContourPipeline(
  source: StyledContour[],
  target: StyledContour[],
  planCustomized: boolean,
): boolean {
  return planCustomized || hasSeveralContoursPerPath(source) || hasSeveralContoursPerPath(target);
}

/** Escapes a value taken from a user SVG before it goes inside a double-quoted attribute. */
export const escapeAttr = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// none/undefined count as "no paint": colors blend, anything else switches at the halfway point
const blendPaint = (a: string | undefined, b: string | undefined, progress: number): string => {
  const from = a ?? 'none';
  const to = b ?? 'none';
  if (from !== 'none' && to !== 'none') return interpolateColor(from, to, progress);
  return progress < 0.5 ? from : to;
};

const lerp = (a: number, b: number, progress: number): number => a + (b - a) * progress;
const round4 = (value: number): number => Math.round(value * 1e4) / 1e4;

function pathElement(
  item: RenderedContour,
  from: StyledContour | undefined,
  to: StyledContour | undefined,
  progress: number,
): string {
  const a = from ?? to;
  const b = to ?? from;
  if (!a || !b) throw new Error(`No style found for contour "${item.id}"`);

  const fill = blendPaint(a.fill, b.fill, progress);
  const stroke = blendPaint(a.stroke, b.stroke, progress);
  const strokeWidth = lerp(a.strokeWidth ?? 1, b.strokeWidth ?? 1, progress);
  const opacity = round4(lerp(a.opacity ?? 1, b.opacity ?? 1, progress) * item.opacity);

  return (
    `<path d="${escapeAttr(item.d)}" fill="${escapeAttr(fill)}" stroke="${escapeAttr(stroke)}"` +
    ` stroke-width="${round4(strokeWidth)}" opacity="${opacity}" />`
  );
}

/**
 * Render a contour plan at `progress` as an SVG string. Pure (no DOM, no worker) so the
 * worker and the synchronous fallback share it. Uses the source SVG's size and viewBox,
 * like the whole-path pipeline.
 */
export function buildContourSVG(
  source: SVGData,
  target: SVGData,
  plan: ContourPlanEntry[],
  progress: number,
  options?: InterpolateContoursOptions,
): string {
  const sourceContours = contoursFromSVGData(source, 'source');
  const targetContours = contoursFromSVGData(target, 'target');
  const items = interpolateContours(plan, sourceContours, targetContours, progress, options);

  const sourceById = new Map(sourceContours.map((c) => [c.id, c]));
  const targetById = new Map(targetContours.map((c) => [c.id, c]));
  const t = Math.min(1, Math.max(0, progress));

  const paths = items.map((item) =>
    pathElement(
      item,
      item.sourceId ? sourceById.get(item.sourceId) : undefined,
      item.targetId ? targetById.get(item.targetId) : undefined,
      t,
    ),
  );

  const { viewBox, width, height } = source;
  return (
    `<svg width="${escapeAttr(String(width))}" height="${escapeAttr(String(height))}"` +
    ` viewBox="${escapeAttr(viewBox)}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`
  );
}
