import { ShapeUtils, Vector2 } from 'three';
import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import { contoursFromSVGData, type StyledContour } from './contourSvg';
import {
  autoNodeCount,
  findContour,
  pairNodes,
  resolveNodeCount,
  sampleContour,
  sourceOpacityAt,
  type Point,
} from './contourInterpolation';
import { holeStructure } from './contourHoles';
import { offscreenOffset, oppositeDirection, parseViewBox, slideOf, slideProgress } from './contourSlide';

/**
 * The geometry of one contour as flat typed arrays, with a fixed triangle list. Positions are
 * recomputed from the nodes of the two shapes at any progress, so the topology never changes
 * while a morph runs (interpolating two different triangulations would tear the mesh).
 */
export interface MorphGeometryData {
  vertexCount: number;
  index: Uint32Array;
  /** Writes `vertexCount * 3` positions for this progress (0..1) into `out`. */
  fill(progress: number, out: Float32Array): void;
  /**
   * Optional: overwrite the normals that averaging the triangles gets wrong (the flat caps of a
   * solid). Call it after the normals have been computed.
   */
  fixNormals?(normals: Float32Array): void;
}

export interface ScenePart {
  id: string;
  /** `tube` for strokes, `solid` for filled closed contours. */
  kind: 'tube' | 'solid';
  geometry: MorphGeometryData;
  /** How visible the part is at this progress: 1 shown, 0 hidden, in between during a fade. */
  visibility: (progress: number) => number;
  /** Where the part sits at this progress, in scene units, for contours that slide. Absent: in place. */
  offset?: (progress: number) => { x: number; y: number };
}

export interface ContourScene {
  parts: ScenePart[];
}

export interface ContourSceneOptions {
  /** Thickness of filled solids, in scene units (the drawing is scaled to about 100 units). */
  depth: number;
  /** Nodes for every morphing pair that does not set its own. Absent means automatic. */
  nodeCount?: number;
}

// Cross-section of a tube. A multiple of 4 so there is a vertex exactly at the top and sides.
const RADIAL_SEGMENTS = 12;
// Rings that round off the end of a tube with a round line cap.
const CAP_RINGS = 4;
// The whole drawing is scaled so its larger side is this long, which is what the camera expects.
const SCENE_SIZE = 100;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const COS = Array.from({ length: RADIAL_SEGMENTS }, (_, m) => Math.cos((m / RADIAL_SEGMENTS) * Math.PI * 2));
const SIN = Array.from({ length: RADIAL_SEGMENTS }, (_, m) => Math.sin((m / RADIAL_SEGMENTS) * Math.PI * 2));

function lerpPoints(from: Point[], to: Point[], t: number): Point[] {
  return from.map((p, i) => ({ x: lerp(p.x, to[i].x, t), y: lerp(p.y, to[i].y, t) }));
}

// Unit tangent at every node (central difference). A node whose neighbours coincide reuses the
// previous tangent, or points along x when there is none, so a degenerate stretch never gives NaN.
function tangents(points: Point[], closed: boolean): Array<[number, number]> {
  const n = points.length;
  const result: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const before = closed ? points[(i - 1 + n) % n] : points[Math.max(i - 1, 0)];
    const after = closed ? points[(i + 1) % n] : points[Math.min(i + 1, n - 1)];
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy);
    result.push(length > 1e-9 ? [dx / length, dy / length] : (result[i - 1] ?? [1, 0]));
  }
  return result;
}

interface Ring {
  /** Node the ring is centered on (end caps reuse the end nodes). */
  node: number;
  /** Offset of the ring along the tangent, in radii (negative before the start of the line). */
  along: number;
  /** Size of the ring, in radii. */
  scale: number;
}

/**
 * A tube of circular cross-section along a polyline, morphing between two polylines with the
 * same number of nodes. `closed` wraps the last node to the first (no end caps); an open tube
 * ends in a hemisphere (`round`) or a flat disc (`flat`).
 */
export function buildTube(
  from: Point[],
  to: Point[],
  closed: boolean,
  radiusFrom: number,
  radiusTo: number,
  cap: 'round' | 'flat',
): MorphGeometryData {
  const n = from.length;
  const rings: Ring[] = [];
  const rounded = !closed && cap === 'round';

  if (rounded) {
    for (let k = CAP_RINGS; k >= 1; k--) {
      const phi = (k / CAP_RINGS) * (Math.PI / 2);
      rings.push({ node: 0, along: -Math.sin(phi), scale: Math.cos(phi) });
    }
  }
  for (let i = 0; i < n; i++) rings.push({ node: i, along: 0, scale: 1 });
  if (rounded) {
    for (let k = 1; k <= CAP_RINGS; k++) {
      const phi = (k / CAP_RINGS) * (Math.PI / 2);
      rings.push({ node: n - 1, along: Math.sin(phi), scale: Math.cos(phi) });
    }
  }

  const ringCount = rings.length;
  const indices: number[] = [];
  const links = closed ? ringCount : ringCount - 1;
  for (let j = 0; j < links; j++) {
    const next = (j + 1) % ringCount;
    for (let m = 0; m < RADIAL_SEGMENTS; m++) {
      const m2 = (m + 1) % RADIAL_SEGMENTS;
      const a = j * RADIAL_SEGMENTS + m;
      const b = j * RADIAL_SEGMENTS + m2;
      const c = next * RADIAL_SEGMENTS + m;
      const d = next * RADIAL_SEGMENTS + m2;
      indices.push(a, c, b, b, c, d);
    }
  }
  if (!closed && cap === 'flat') {
    // flat discs: a fan over the first and the last ring
    const last = (ringCount - 1) * RADIAL_SEGMENTS;
    for (let m = 1; m < RADIAL_SEGMENTS - 1; m++) {
      indices.push(0, m, m + 1, last, last + m, last + m + 1);
    }
  }

  return {
    vertexCount: ringCount * RADIAL_SEGMENTS,
    index: Uint32Array.from(indices),
    fill(progress, out) {
      const t = clamp01(progress);
      const points = lerpPoints(from, to, t);
      const radius = lerp(radiusFrom, radiusTo, t);
      const tangent = tangents(points, closed);
      let v = 0;
      for (const ring of rings) {
        const [tx, ty] = tangent[ring.node];
        const center = points[ring.node];
        const cx = center.x + tx * ring.along * radius;
        const cy = center.y + ty * ring.along * radius;
        // the normal stays in the drawing plane; the other axis of the ring is z
        const nx = -ty;
        const ny = tx;
        const r = ring.scale * radius;
        for (let m = 0; m < RADIAL_SEGMENTS; m++) {
          out[v++] = cx + nx * COS[m] * r;
          out[v++] = cy + ny * COS[m] * r;
          out[v++] = SIN[m] * r;
        }
      }
    },
  };
}

/** An inner outline of a solid, as the two shapes it morphs between (same number of nodes). */
export interface SolidHole {
  from: Point[];
  to: Point[];
}

/**
 * A morphing pair whose two contours are holes of the two contours of another morphing pair is not a
 * solid of its own: it is cut out of that pair's solid, and morphs with it. A hole that is not part
 * of a morphing pair (a swap, a fixed contour, or a hole on one side only) keeps being drawn as its
 * own solid, which is a limit of a fixed triangle list: it cannot follow a part that appears or goes.
 */
function mergeHoles(specs: PartSpec[], sourceHoles: Map<string, string>, targetHoles: Map<string, string>): PartSpec[] {
  const merged = new Set<PartSpec>();
  for (const hole of specs) {
    if (!hole.pair || hole.kind !== 'solid') continue;
    const sourceHolder = sourceHoles.get(hole.pair.sourceId);
    const targetHolder = targetHoles.get(hole.pair.targetId);
    if (sourceHolder === undefined || targetHolder === undefined) continue;

    const holder = specs.find(
      (spec) =>
        spec.kind === 'solid' && spec.pair?.sourceId === sourceHolder && spec.pair.targetId === targetHolder,
    );
    if (!holder) continue;
    holder.holes = [...(holder.holes ?? []), { from: hole.from, to: hole.to }];
    merged.add(hole);
  }
  return specs.filter((spec) => !merged.has(spec));
}

/**
 * A closed outline extruded by `depth` (centered on z = 0), morphing between two outlines with
 * the same number of nodes. The cap triangles come from the first outline and are reused for
 * the whole morph. `holes` are inner outlines cut out of the caps and walled like the outline, so
 * a ring is a ring and not a disc; each one morphs between its own two shapes. Vertices are laid
 * out ring by ring (outline, then each hole), front cap first, then back cap, then the walls.
 */
export function buildSolid(from: Point[], to: Point[], depth: number, holes: SolidHole[] = []): MorphGeometryData {
  const rings = [{ from, to }, ...holes];
  const total = rings.reduce((sum, ring) => sum + ring.from.length, 0);
  const vec = (points: Point[]) => points.map((p) => new Vector2(p.x, p.y));
  const faces = ShapeUtils.triangulateShape(vec(from), holes.map((hole) => vec(hole.from)));

  const indices: number[] = [];
  for (const [a, b, c] of faces) indices.push(a, b, c, total + a, total + c, total + b);
  // each wall quad has its own four vertices (flat shading)
  let base = 2 * total;
  for (const ring of rings) {
    for (let i = 0; i < ring.from.length; i++) {
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      base += 4;
    }
  }

  return {
    vertexCount: 6 * total,
    index: Uint32Array.from(indices),
    // the cap triangles do not all wind the same way, so their averaged normals shade patchily
    fixNormals(normals) {
      for (let i = 0; i < total; i++) {
        normals.set([0, 0, 1], i * 3);
        normals.set([0, 0, -1], (total + i) * 3);
      }
    },
    fill(progress, out) {
      const t = clamp01(progress);
      const front = depth / 2;
      const back = -depth / 2;
      const shapes = rings.map((ring) => lerpPoints(ring.from, ring.to, t));
      let v = 0;
      for (const points of shapes) {
        for (const p of points) {
          out[v++] = p.x;
          out[v++] = p.y;
          out[v++] = front;
        }
      }
      for (const points of shapes) {
        for (const p of points) {
          out[v++] = p.x;
          out[v++] = p.y;
          out[v++] = back;
        }
      }
      for (const points of shapes) {
        const n = points.length;
        for (let i = 0; i < n; i++) {
          const p = points[i];
          const q = points[(i + 1) % n];
          for (const [x, y, z] of [
            [p.x, p.y, front],
            [q.x, q.y, front],
            [q.x, q.y, back],
            [p.x, p.y, back],
          ]) {
            out[v++] = x;
            out[v++] = y;
            out[v++] = z;
          }
        }
      }
    },
  };
}

// An unset fill counts as no fill, like everywhere else in the app.
const isFilled = (contour: StyledContour): boolean => contour.fill !== undefined && contour.fill !== 'none';

// Nodes of a closed contour repeat the first one at the end; geometry wants each node once.
const distinct = (points: Point[], closed: boolean): Point[] => (closed ? points.slice(0, -1) : points);

interface PartSpec {
  id: string;
  kind: 'tube' | 'solid';
  from: Point[];
  to: Point[];
  closed: boolean;
  radiusFrom: number;
  radiusTo: number;
  cap: 'round' | 'flat';
  visibility: (progress: number) => number;
  /** Slide offset in the SVG's units (y down); scaled and flipped with the rest of the drawing. */
  offset?: (progress: number) => { x: number; y: number };
  /** For a morphing pair: the two contours it joins, to find out which pairs are holes of which. */
  pair?: { sourceId: string; targetId: string };
  /** Inner outlines cut out of a solid, filled in while the scene is assembled. */
  holes?: SolidHole[];
}

const capOf = (contour: StyledContour): 'round' | 'flat' => (contour.strokeLinecap === 'round' ? 'round' : 'flat');
const radiusOf = (contour: StyledContour): number => (contour.strokeWidth ?? 1) / 2;
const ALWAYS = (): number => 1;

function singleSide(contour: StyledContour, id: string, visibility: (progress: number) => number): PartSpec {
  const closed = contour.closed;
  const nodes = distinct(sampleContour(contour, autoNodeCount(contour, contour)), closed);
  return {
    id,
    kind: closed && isFilled(contour) ? 'solid' : 'tube',
    from: nodes,
    to: nodes,
    closed,
    radiusFrom: radiusOf(contour),
    radiusTo: radiusOf(contour),
    cap: capOf(contour),
    visibility,
  };
}

/**
 * Turn a contour plan into 3D parts: one per drawn contour, with morphing pairs sharing a
 * geometry that changes shape and swapped or fixed contours as plain parts shown by
 * `visibility`. Strokes become tubes (radius = half the stroke width, caps from the SVG),
 * filled closed contours become extruded solids. The result is centered on the origin and
 * scaled so the drawing is about 100 units across, whatever the SVG's own size.
 */
export function buildContourScene(
  source: SVGData,
  target: SVGData,
  plan: ContourPlanEntry[],
  options: ContourSceneOptions,
): ContourScene {
  const sourceContours = contoursFromSVGData(source, 'source');
  const targetContours = contoursFromSVGData(target, 'target');

  const bounds = parseViewBox(source.viewBox, source.width, source.height);

  const allSpecs = plan.flatMap((entry): PartSpec[] => {
    const from = findContour(sourceContours, entry.sourceId, 'source');
    const to = findContour(targetContours, entry.targetId, 'target');
    if (!from && !to) throw new Error('A contour plan entry needs a source or a target contour');

    if (entry.mode === 'static') {
      const shown = (from ?? to) as StyledContour;
      return [singleSide(shown, shown.id, ALWAYS)];
    }

    if (entry.mode === 'morph' && from && to) {
      const nodes = pairNodes(
        from,
        to,
        resolveNodeCount(entry, from, to, { nodeCount: options.nodeCount }),
        entry.anchors,
      );
      const closed = from.closed && to.closed;
      return [
        {
          id: `${from.id}~${to.id}`,
          kind: closed && (isFilled(from) || isFilled(to)) ? 'solid' : 'tube',
          from: distinct(nodes.from, closed),
          to: distinct(nodes.to, closed),
          closed,
          radiusFrom: radiusOf(from),
          radiusTo: radiusOf(to),
          cap: capOf(from),
          visibility: ALWAYS,
          pair: { sourceId: from.id, targetId: to.id },
        },
      ];
    }

    // a swap that slides moves its two sides; it shows each one only while it is inside the drawing
    const slide = slideOf(entry);
    if (slide) {
      const moved = (progress: number): number => slideProgress(clamp01(progress), clamp01(entry.swapAt), entry.fadeWindow);
      const sliding: PartSpec[] = [];
      if (from) {
        const out = offscreenOffset(from.bbox, bounds, slide.direction);
        sliding.push({
          ...singleSide(from, from.id, (p) => (slide.fade ? 1 - moved(p) : moved(p) < 1 ? 1 : 0)),
          offset: (p) => ({ x: out.x * moved(p), y: out.y * moved(p) }),
        });
      }
      if (to) {
        const into = offscreenOffset(to.bbox, bounds, oppositeDirection(slide.direction));
        sliding.push({
          ...singleSide(to, to.id, (p) => (slide.fade ? moved(p) : moved(p) > 0 ? 1 : 0)),
          offset: (p) => ({ x: into.x * (1 - moved(p)), y: into.y * (1 - moved(p)) }),
        });
      }
      return sliding;
    }

    // a swap, or a morph that lost one of its sides
    const sourceVisibility = (progress: number): number => sourceOpacityAt(clamp01(progress), entry.swapAt, entry.fadeWindow);
    const parts: PartSpec[] = [];
    if (from) parts.push(singleSide(from, from.id, sourceVisibility));
    if (to) parts.push(singleSide(to, to.id, (progress) => clamp01(1 - sourceVisibility(progress))));
    return parts;
  });

  const specs = mergeHoles(allSpecs, holeStructure(sourceContours), holeStructure(targetContours));

  if (specs.length === 0) {
    throw new Error('The SVGs have no drawable contours for the 3D view');
  }

  // Fit the whole drawing (stroke thickness included) in a SCENE_SIZE box centered on the origin.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const spec of specs) {
    const pad = Math.max(spec.radiusFrom, spec.radiusTo);
    for (const p of [...spec.from, ...spec.to]) {
      minX = Math.min(minX, p.x - pad);
      maxX = Math.max(maxX, p.x + pad);
      minY = Math.min(minY, p.y - pad);
      maxY = Math.max(maxY, p.y + pad);
    }
  }
  const largest = Math.max(maxX - minX, maxY - minY);
  const scale = largest > 1e-9 ? SCENE_SIZE / largest : 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // y is flipped: SVG grows downwards, 3D upwards
  const place = (p: Point): Point => ({ x: (p.x - cx) * scale, y: -(p.y - cy) * scale });

  return {
    parts: specs.map((spec) => {
      const from = spec.from.map(place);
      const to = spec.to.map(place);
      const geometry =
        spec.kind === 'solid'
          ? buildSolid(
              from,
              to,
              options.depth,
              spec.holes?.map((hole) => ({ from: hole.from.map(place), to: hole.to.map(place) })),
            )
          : buildTube(from, to, spec.closed, spec.radiusFrom * scale, spec.radiusTo * scale, spec.cap);
      const offset = spec.offset;
      return {
        id: spec.id,
        kind: spec.kind,
        geometry,
        visibility: spec.visibility,
        ...(offset && {
          offset: (progress: number) => {
            const o = offset(progress);
            return { x: o.x * scale, y: -o.y * scale };
          },
        }),
      };
    }),
  };
}
