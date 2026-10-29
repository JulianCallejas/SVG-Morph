import type { StyledContour } from './contourSvg';
import { autoNodeCount, sampleContour, type Point } from './contourInterpolation';

// An unset fill counts as no fill, like everywhere else in the app.
const isFilled = (contour: StyledContour): boolean => contour.fill !== undefined && contour.fill !== 'none';

const EPSILON = 1e-6;
// Fraction of a contour's nodes that must lie inside another one for it to count as inside. Below 1
// so a hole that touches the outline at a node is still a hole.
const INSIDE_SHARE = 0.9;

// The nodes of a closed contour, each once.
const outline = (contour: StyledContour): Point[] => sampleContour(contour, autoNodeCount(contour, contour)).slice(0, -1);

// Ray casting: is the point inside the polygon?
function inside(point: Point, polygon: Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      result = !result;
    }
  }
  return result;
}

const area = (contour: StyledContour): number => contour.bbox.width * contour.bbox.height;

function boxContains(outer: StyledContour, inner: StyledContour): boolean {
  const a = outer.bbox;
  const b = inner.bbox;
  return (
    b.x >= a.x - EPSILON &&
    b.y >= a.y - EPSILON &&
    b.x + b.width <= a.x + a.width + EPSILON &&
    b.y + b.height <= a.y + a.height + EPSILON
  );
}

/**
 * Which closed, filled contours are holes of which, by even-odd nesting: a contour inside one other
 * contour is a hole; inside two it is filled again (an island in a hole); inside three, a hole again.
 * Only contours of the same `<path>` count: separate paths overlap each other, they do not cut.
 * Open and unfilled contours never nest, unless `openFilled` is set: a renderer fills an open subpath as if
 * it were closed, and icon sets such as Phosphor leave out the closing `Z`, so with it a filled contour counts
 * whether or not it is closed. Returns hole id -> id of the contour that directly holds it.
 *
 * Even-odd is a stand-in for the path's fill rule, which the app does not read. It matches the usual
 * donut (opposite windings, or evenodd) and only differs for a nonzero path whose inner contour runs
 * the same way as the outer one, which that rule would fill.
 */
export function holeStructure(
  contours: StyledContour[],
  { openFilled = false }: { openFilled?: boolean } = {},
): Map<string, string> {
  const candidates = contours.filter((c) => (openFilled || c.closed) && isFilled(c));
  const polygons = new Map(candidates.map((c) => [c.id, outline(c)]));

  const holes = new Map<string, string>();
  for (const contour of candidates) {
    const points = polygons.get(contour.id) as Point[];
    const holders = candidates.filter((other) => {
      if (other.id === contour.id || other.pathIndex !== contour.pathIndex) return false;
      if (!boxContains(other, contour)) return false;
      const polygon = polygons.get(other.id) as Point[];
      const within = points.filter((p) => inside(p, polygon)).length;
      return within >= points.length * INSIDE_SHARE;
    });

    if (holders.length % 2 === 1) {
      // the directly holding contour is the smallest one around it
      const direct = holders.reduce((best, c) => (area(c) < area(best) ? c : best));
      holes.set(contour.id, direct.id);
    }
  }
  return holes;
}
