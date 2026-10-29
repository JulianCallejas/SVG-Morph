import { describe, expect, it } from 'vitest';
import type { SVGData } from './svgMorphing';
import type { ContourPlanEntry } from './contourPairing';
import { planContours } from './contourSvg';
import {
  buildContourScene,
  buildSolid,
  buildTube,
  type MorphGeometryData,
} from './threeDContours';

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const svgData = (paths: SVGData['paths']): SVGData => ({ paths, viewBox: '0 0 24 24', width: 24, height: 24 });

const icons = {
  source: svgData([{ d: CLOUD_ARROW_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2, strokeLinecap: 'round' }]),
  target: svgData([{ d: CLOUD_BOLT_D, fill: 'none', stroke: '#FFFFFF', strokeWidth: 2, strokeLinecap: 'round' }]),
};

const positionsAt = (geometry: MorphGeometryData, progress: number): Float32Array => {
  const out = new Float32Array(geometry.vertexCount * 3);
  geometry.fill(progress, out);
  return out;
};

const extent = (positions: Float32Array, axis: 0 | 1 | 2): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (let i = axis; i < positions.length; i += 3) {
    min = Math.min(min, positions[i]);
    max = Math.max(max, positions[i]);
  }
  return [min, max];
};

const mean = (positions: Float32Array, axis: 0 | 1 | 2): number => {
  let sum = 0;
  for (let i = axis; i < positions.length; i += 3) sum += positions[i];
  return sum / (positions.length / 3);
};

const line = (y: number, n = 8) => Array.from({ length: n }, (_, i) => ({ x: i, y }));

describe('buildTube', () => {
  it('wraps a ring of vertices around every node, at the given radius', () => {
    const tube = buildTube(line(0), line(0), false, 1, 1, 'flat');
    const p = positionsAt(tube, 0);

    // a straight line along x: every vertex is 1 unit from the axis in the y/z plane
    for (let i = 0; i < p.length; i += 3) {
      expect(Math.hypot(p[i + 1], p[i + 2])).toBeCloseTo(1, 5);
    }
  });

  it('has a valid index buffer', () => {
    const tube = buildTube(line(0), line(0), false, 1, 1, 'round');

    expect(tube.index.length % 3).toBe(0);
    expect(Math.max(...tube.index)).toBeLessThan(tube.vertexCount);
  });

  it('closes the ring of a closed contour instead of capping it', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    const closed = buildTube(square, square, true, 1, 1, 'round');
    const open = buildTube(square, square, false, 1, 1, 'round');

    expect(closed.vertexCount).toBeLessThan(open.vertexCount);
    expect(Math.max(...closed.index)).toBeLessThan(closed.vertexCount);
  });

  it('round caps extend past the end nodes by the radius, flat caps do not', () => {
    const round = positionsAt(buildTube(line(0), line(0), false, 1, 1, 'round'), 0);
    const flat = positionsAt(buildTube(line(0), line(0), false, 1, 1, 'flat'), 0);

    expect(extent(round, 0)).toEqual([expect.closeTo(-1, 3), expect.closeTo(8, 3)]);
    expect(extent(flat, 0)).toEqual([expect.closeTo(0, 3), expect.closeTo(7, 3)]);
  });

  it('morphs by moving the nodes between the two shapes', () => {
    const tube = buildTube(line(0), line(10), false, 1, 1, 'flat');

    expect(mean(positionsAt(tube, 0), 1)).toBeCloseTo(0, 5);
    expect(mean(positionsAt(tube, 0.5), 1)).toBeCloseTo(5, 5);
    expect(mean(positionsAt(tube, 1), 1)).toBeCloseTo(10, 5);
  });

  it('morphs the radius too', () => {
    const tube = buildTube(line(0), line(0), false, 1, 3, 'flat');

    const [, maxZ] = extent(positionsAt(tube, 0.5), 2);
    expect(maxZ).toBeCloseTo(2, 5);
  });

  it('never produces NaN, even for coincident nodes', () => {
    const same = Array.from({ length: 6 }, () => ({ x: 3, y: 3 }));

    const p = positionsAt(buildTube(same, same, false, 1, 1, 'round'), 0.3);

    expect(Array.from(p).every(Number.isFinite)).toBe(true);
  });
});

describe('buildSolid', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const wider = square.map((p) => ({ x: p.x * 2, y: p.y }));

  it('extrudes the outline by the depth, centered on z = 0', () => {
    const p = positionsAt(buildSolid(square, square, 6), 0);

    expect(extent(p, 2)).toEqual([-3, 3]);
  });

  it('has a valid index buffer with caps and walls', () => {
    const solid = buildSolid(square, square, 6);

    // 2 triangles per cap + 2 per wall quad
    expect(solid.index.length / 3).toBe(2 * 2 + 4 * 2);
    expect(Math.max(...solid.index)).toBeLessThan(solid.vertexCount);
  });

  it('gives the two caps flat normals along z, and leaves the walls to the usual computation', () => {
    const solid = buildSolid(square, square, 6);
    const normals = new Float32Array(solid.vertexCount * 3).fill(0.5);

    solid.fixNormals!(normals);

    // vertices 0..3 are the front cap, 4..7 the back cap, then the walls
    expect([normals[0], normals[1], normals[2]]).toEqual([0, 0, 1]);
    expect([normals[4 * 3], normals[4 * 3 + 1], normals[4 * 3 + 2]]).toEqual([0, 0, -1]);
    expect(normals[8 * 3]).toBe(0.5);
  });

  it('morphs the outline while keeping the same triangles', () => {
    const solid = buildSolid(square, wider, 6);

    expect(extent(positionsAt(solid, 0), 0)).toEqual([0, 10]);
    expect(extent(positionsAt(solid, 1), 0)).toEqual([0, 20]);
    expect(extent(positionsAt(solid, 0.5), 0)).toEqual([0, 15]);
  });
});

describe('buildSolid with holes', () => {
  const outer = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const hole = [
    { x: 3, y: 3 },
    { x: 7, y: 3 },
    { x: 7, y: 7 },
    { x: 3, y: 7 },
  ];
  const biggerHole = [
    { x: 2, y: 2 },
    { x: 8, y: 2 },
    { x: 8, y: 8 },
    { x: 2, y: 8 },
  ];
  const ring = { from: hole, to: biggerHole };

  it('covers a donut with a ring of triangles, not a disc', () => {
    const solid = buildSolid(outer, outer, 6, [ring]);
    const front = positionsAt(solid, 0);
    const triangles: number[][] = [];
    for (let i = 0; i < solid.index.length; i += 3) triangles.push([solid.index[i], solid.index[i + 1], solid.index[i + 2]]);

    // a front cap triangle uses only front vertices (z = +3); none may sit inside the hole
    const caps = triangles.filter((t) => t.every((v) => front[v * 3 + 2] === 3));
    expect(caps).toHaveLength(8);
    for (const [a, b, c] of caps) {
      const cx = (front[a * 3] + front[b * 3] + front[c * 3]) / 3;
      const cy = (front[a * 3 + 1] + front[b * 3 + 1] + front[c * 3 + 1]) / 3;
      expect(cx > 3 && cx < 7 && cy > 3 && cy < 7).toBe(false);
    }
  });

  it('adds a wall around the hole as well as around the outline', () => {
    const solid = buildSolid(outer, outer, 6, [ring]);

    // 8 cap triangles on each side + 2 per wall quad, 4 quads around the outline and 4 around the hole
    expect(solid.index.length / 3).toBe(2 * 8 + 8 * 2);
    expect(solid.vertexCount).toBe(6 * 8);
    expect(Math.max(...solid.index)).toBeLessThan(solid.vertexCount);
  });

  it('keeps the flat cap normals for the vertices of the outline and of the hole', () => {
    const solid = buildSolid(outer, outer, 6, [ring]);
    const normals = new Float32Array(solid.vertexCount * 3).fill(0.5);

    solid.fixNormals!(normals);

    // vertices 0..7 are the front cap (outline then hole), 8..15 the back cap
    for (let v = 0; v < 8; v++) expect(normals[v * 3 + 2]).toBe(1);
    for (let v = 8; v < 16; v++) expect(normals[v * 3 + 2]).toBe(-1);
    expect(normals[16 * 3]).toBe(0.5);
  });

  it('morphs the hole with the outline, keeping the same triangles', () => {
    const solid = buildSolid(outer, outer, 6, [ring]);
    const start = positionsAt(solid, 0);
    const end = positionsAt(solid, 1);

    // the first hole vertex is the fifth front vertex
    expect([start[4 * 3], start[4 * 3 + 1]]).toEqual([3, 3]);
    expect([end[4 * 3], end[4 * 3 + 1]]).toEqual([2, 2]);
    // the outline did not move
    expect([end[0], end[1]]).toEqual([0, 0]);
  });

  it('gives finite positions at every progress, with several holes', () => {
    const second = { from: hole.map((p) => ({ x: p.x + 20, y: p.y })), to: hole.map((p) => ({ x: p.x + 20, y: p.y })) };
    const wide = outer.map((p) => ({ x: p.x * 3, y: p.y }));
    const solid = buildSolid(wide, wide, 6, [ring, second]);

    for (const t of [0, 0.25, 0.5, 1]) {
      expect(positionsAt(solid, t).every(Number.isFinite)).toBe(true);
    }
    expect(solid.vertexCount).toBe(6 * 12);
  });

  it('behaves exactly as before when there are no holes', () => {
    const plain = buildSolid(outer, outer, 6);
    const empty = buildSolid(outer, outer, 6, []);

    expect(Array.from(empty.index)).toEqual(Array.from(plain.index));
    expect(empty.vertexCount).toBe(plain.vertexCount);
    expect(Array.from(positionsAt(empty, 0.5))).toEqual(Array.from(positionsAt(plain, 0.5)));
  });
});

describe('buildContourScene with holes', () => {
  const donut = { ...svgData([{ d: 'M0 0 H100 V100 H0 Z M30 30 V70 H70 V30 Z', fill: '#ffffff' }]), viewBox: '0 0 100 100' };
  const squareWithHole = {
    ...svgData([{ d: 'M0 0 H100 V100 H0 Z M20 20 V80 H80 V20 Z', fill: '#ffffff' }]),
    viewBox: '0 0 100 100',
  };
  const disc = { ...svgData([{ d: 'M0 0 H100 V100 H0 Z', fill: '#ffffff' }]), viewBox: '0 0 100 100' };
  const morph = (id: string, to: string): ContourPlanEntry => ({
    sourceId: id,
    targetId: to,
    mode: 'morph',
    swapAt: 0.5,
    fadeWindow: 0,
  });

  it('makes one ring of a donut and its hole, not two solids', () => {
    const plan = [morph('s1.1', 't1.1'), morph('s1.2', 't1.2')];

    const { parts } = buildContourScene(donut, squareWithHole, plan, { depth: 20 });

    expect(parts).toHaveLength(1);
    expect(parts[0].kind).toBe('solid');
    // the hole adds its own ring of vertices, so a ring has more of them than a plain solid
    const plain = buildContourScene(disc, disc, [morph('s1.1', 't1.1')], { depth: 20 }).parts[0];
    expect(parts[0].geometry.vertexCount).toBeGreaterThan(plain.geometry.vertexCount);
  });

  it('morphs the hole with the ring, to finite positions at every progress', () => {
    const plan = [morph('s1.1', 't1.1'), morph('s1.2', 't1.2')];
    const { geometry } = buildContourScene(donut, squareWithHole, plan, { depth: 20 }).parts[0];

    const start = positionsAt(geometry, 0);
    const end = positionsAt(geometry, 1);

    expect(start.every(Number.isFinite)).toBe(true);
    expect(end.every(Number.isFinite)).toBe(true);
    expect(Array.from(start)).not.toEqual(Array.from(end));
  });

  it('keeps a hole that does not morph as a solid of its own', () => {
    // the target has no hole: the hole of the source is an unpaired contour that swaps
    const plan: ContourPlanEntry[] = [
      morph('s1.1', 't1.1'),
      { sourceId: 's1.2', targetId: null, mode: 'swap', swapAt: 0.5, fadeWindow: 0 },
    ];

    const { parts } = buildContourScene(donut, disc, plan, { depth: 20 });

    expect(parts).toHaveLength(2);
  });

  it('does not cut a hole in a pair whose other side has none', () => {
    // s1.2 is a hole of s1.1 in the source, but t1.2 is a plain separate shape in the target
    const apart = { ...svgData([{ d: 'M0 0 H40 V40 H0 Z M60 60 H100 V100 H60 Z', fill: '#ffffff' }]), viewBox: '0 0 100 100' };
    const plan = [morph('s1.1', 't1.1'), morph('s1.2', 't1.2')];

    const { parts } = buildContourScene(donut, apart, plan, { depth: 20 });

    expect(parts).toHaveLength(2);
  });
});

describe('buildContourScene', () => {
  const planned = planContours(icons.source, icons.target)!;
  const scene = buildContourScene(icons.source, icons.target, planned.plan, { depth: 20 });

  it('makes one part per drawn contour of the reference icons', () => {
    // cloud and shaft morph, the two arrowheads fade out
    expect(scene.parts).toHaveLength(4);
  });

  it('draws open strokes as tubes', () => {
    expect(scene.parts.every((part) => part.kind === 'tube')).toBe(true);
  });

  it('fits the drawing in about 100 units, centered, whatever the SVG size', () => {
    const p = positionsAt(scene.parts[0].geometry, 0);
    const [minX, maxX] = extent(p, 0);

    expect(maxX - minX).toBeLessThanOrEqual(110);
    expect(maxX - minX).toBeGreaterThan(60);
    expect((minX + maxX) / 2).toBeLessThan(25);

    const big = buildContourScene(
      svgData([{ d: CLOUD_ARROW_D.replace(/(\d+\.?\d*)/g, (n) => String(Number(n) * 20)) }]),
      icons.target,
      planContours(icons.source, icons.target)!.plan,
      { depth: 20 },
    );
    expect(big.parts.length).toBeGreaterThan(0);
  });

  it('keeps every position finite at any progress', () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      for (const part of scene.parts) {
        expect(Array.from(positionsAt(part.geometry, progress)).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('works for a circle, which used to break the 3D scene', () => {
    const circle = svgData([{ d: 'M2,5 A3,3 0 1,0 8,5 A3,3 0 1,0 2,5 Z', fill: '#ff0000', stroke: 'none' }]);
    const plan = planContours(circle, circle)!.plan;

    const result = buildContourScene(circle, circle, plan, { depth: 20 });

    expect(result.parts).toHaveLength(1);
    expect(result.parts[0].kind).toBe('solid');
    expect(Array.from(positionsAt(result.parts[0].geometry, 0.5)).every(Number.isFinite)).toBe(true);
  });

  it('extrudes a filled closed contour and tubes an unfilled closed one', () => {
    const filled = svgData([{ d: 'M0 0 L10 0 L10 10 L0 10 Z', fill: '#00ff00' }]);
    const outline = svgData([{ d: 'M0 0 L10 0 L10 10 L0 10 Z', fill: 'none', stroke: '#fff', strokeWidth: 1 }]);

    const solid = buildContourScene(filled, filled, planContours(filled, filled)!.plan, { depth: 20 });
    const ring = buildContourScene(outline, outline, planContours(outline, outline)!.plan, { depth: 20 });

    expect(solid.parts[0].kind).toBe('solid');
    expect(ring.parts[0].kind).toBe('tube');
  });

  it('throws a clear error when nothing can be drawn', () => {
    const empty = svgData([{ d: '' }]);

    expect(() => buildContourScene(empty, empty, [], { depth: 20 })).toThrow(/no drawable contours/i);
  });

  it('rejects a plan that references a missing contour', () => {
    const bad: ContourPlanEntry[] = [
      { sourceId: 'nope', targetId: null, mode: 'swap', swapAt: 0.5, fadeWindow: 0 },
    ];

    expect(() => buildContourScene(icons.source, icons.target, bad, { depth: 20 })).toThrow(/nope/);
  });

  describe('visibility', () => {
    const hardCut = scene.parts.filter((part) => part.id.startsWith('s1.3'));

    it('keeps morphing and static parts visible', () => {
      const [cloud] = scene.parts;

      expect(cloud.visibility(0)).toBe(1);
      expect(cloud.visibility(0.7)).toBe(1);
    });

    it('cuts an unpaired contour at its swap point', () => {
      expect(hardCut).toHaveLength(1);
      expect(hardCut[0].visibility(0.4)).toBe(1);
      expect(hardCut[0].visibility(0.6)).toBe(0);
    });

    describe('sliding contours', () => {
      const a = { ...svgData([{ d: 'M10 40 L30 40', stroke: '#fff' }]), viewBox: '0 0 100 100' };
      const b = { ...svgData([{ d: 'M70 40 L90 40', stroke: '#fff' }]), viewBox: '0 0 100 100' };
      const slidePlan = (fade: boolean): ContourPlanEntry[] => [
        {
          sourceId: 's1.1',
          targetId: 't1.1',
          mode: 'swap',
          swapAt: 0.5,
          fadeWindow: 0.4,
          transition: { type: 'slide', direction: 'left', fade },
        },
      ];
      const parts = buildContourScene(a, b, slidePlan(false), { depth: 20 }).parts;

      it('gives only the sliding parts an offset, moving the source out and the target in', () => {
        expect(parts).toHaveLength(2);
        expect(parts[0].offset!(0).x).toBeCloseTo(0, 6);
        expect(parts[0].offset!(0).y).toBeCloseTo(0, 6);
        expect(parts[0].offset!(1).x).toBeLessThan(0);
        expect(parts[1].offset!(0).x).toBeGreaterThan(0);
        expect(parts[1].offset!(1).x).toBeCloseTo(0, 6);
        expect(scene.parts.every((part) => part.offset === undefined)).toBe(true);
      });

      it('shows each side only while it is inside the drawing, with no fade', () => {
        expect(parts[0].visibility(0.2)).toBe(1);
        expect(parts[0].visibility(0.9)).toBe(0);
        expect(parts[1].visibility(0.2)).toBe(0);
        expect(parts[1].visibility(0.9)).toBe(1);
        expect(parts[0].visibility(0.5)).toBe(1);
        expect(parts[1].visibility(0.5)).toBe(1);
      });

      it('also fades them when asked', () => {
        const faded = buildContourScene(a, b, slidePlan(true), { depth: 20 }).parts;

        expect(faded[0].visibility(0.5)).toBeCloseTo(0.5, 5);
        expect(faded[1].visibility(0.5)).toBeCloseTo(0.5, 5);
      });

      it('flips y into scene space: an upward slide moves up, which is positive y', () => {
        const up = buildContourScene(a, b, [{ ...slidePlan(false)[0], transition: { type: 'slide', direction: 'up', fade: false } }], { depth: 20 }).parts;

        expect(up[0].offset!(1).y).toBeGreaterThan(0);
        expect(up[0].offset!(1).x).toBeCloseTo(0, 6);
      });
    });

    it('cross-fades both sides of a swap', () => {
      const a = svgData([{ d: 'M0 0 L10 0', stroke: '#fff' }]);
      const b = svgData([{ d: 'M50 50 L60 60', stroke: '#fff' }]);
      const plan: ContourPlanEntry[] = [
        { sourceId: 's1.1', targetId: 't1.1', mode: 'swap', swapAt: 0.5, fadeWindow: 0.4 },
      ];

      const parts = buildContourScene(a, b, plan, { depth: 20 }).parts;

      expect(parts).toHaveLength(2);
      expect(parts[0].visibility(0.5)).toBeCloseTo(0.5, 5);
      expect(parts[1].visibility(0.5)).toBeCloseTo(0.5, 5);
      expect(parts[0].visibility(0)).toBe(1);
      expect(parts[1].visibility(0)).toBe(0);
    });
  });
});

describe('buildContourScene with filled contours that are not closed', () => {
  // no closing Z, like the Phosphor icons: a renderer fills each subpath as if it were closed
  const open = (d: string, fill = '#ffffff') => ({ ...svgData([{ d, fill }]), viewBox: '0 0 100 100' });
  const donut = open('M0 0 H100 V100 H0 M30 30 V70 H70 V30');
  const other = open('M0 0 H100 V100 H0 M20 20 V80 H80 V20');
  const morph = (id: string, to: string): ContourPlanEntry => ({
    sourceId: id,
    targetId: to,
    mode: 'morph',
    swapAt: 0.5,
    fadeWindow: 0,
  });
  const plan = [morph('s1.1', 't1.1'), morph('s1.2', 't1.2')];

  it('extrudes them as one ring with its hole, not as wires', () => {
    const { parts } = buildContourScene(donut, other, plan, { depth: 20 });

    expect(parts).toHaveLength(1);
    expect(parts[0].kind).toBe('solid');
    const plain = buildContourScene(open('M0 0 H100 V100 H0'), open('M0 0 H100 V100 H0'), [morph('s1.1', 't1.1')], {
      depth: 20,
    }).parts[0];
    expect(plain.kind).toBe('solid');
    expect(parts[0].geometry.vertexCount).toBeGreaterThan(plain.geometry.vertexCount);
  });

  it('gives finite positions at every progress', () => {
    const { geometry } = buildContourScene(donut, other, plan, { depth: 20 }).parts[0];
    for (const progress of [0, 0.5, 1]) {
      expect(positionsAt(geometry, progress).every(Number.isFinite)).toBe(true);
    }
  });

  it('still draws an open contour without fill as a tube', () => {
    const line = open('M0 0 H100 V100', 'none');

    const { parts } = buildContourScene(line, line, [morph('s1.1', 't1.1')], { depth: 20 });

    expect(parts[0].kind).toBe('tube');
  });
});

describe('buildSolid caps while morphing', () => {
  // Twelve nodes on both sides. The first outline is a convex ring of points, the second is a
  // plus sign: the triangles that cover one do not cover the other, so the caps must follow the shape.
  const circle = Array.from({ length: 12 }, (_, i) => ({
    x: 10 * Math.cos((i / 12) * 2 * Math.PI),
    y: 10 * Math.sin((i / 12) * 2 * Math.PI),
  }));
  const plus = [
    [-3, -10], [3, -10], [3, -3], [10, -3], [10, 3], [3, 3], [3, 10], [-3, 10], [-3, 3], [-10, 3], [-10, -3], [-3, -3],
  ].map(([x, y]) => ({ x, y }));

  const frontCaps = (solid: MorphGeometryData, progress: number) => {
    const out = positionsAt(solid, progress);
    const total = solid.vertexCount / 6;
    let signed = 0;
    let absolute = 0;
    let inverted = 0;
    for (let i = 0; i < solid.index.length; i += 3) {
      const [a, b, c] = [solid.index[i], solid.index[i + 1], solid.index[i + 2]];
      if (a >= total || b >= total || c >= total || (a === b && b === c)) continue;
      const area =
        ((out[b * 3] - out[a * 3]) * (out[c * 3 + 1] - out[a * 3 + 1]) -
          (out[c * 3] - out[a * 3]) * (out[b * 3 + 1] - out[a * 3 + 1])) /
        2;
      signed += area;
      absolute += Math.abs(area);
      if (area < -1e-9) inverted++;
    }
    return { signed, absolute, inverted };
  };

  const shoelace = (points: Array<{ x: number; y: number }>) =>
    Math.abs(points.reduce((sum, p, i) => sum + (p.x * points[(i + 1) % points.length].y - points[(i + 1) % points.length].x * p.y), 0)) / 2;

  it('covers the shape it has reached with triangles that do not overlap, at the start and at the end', () => {
    const solid = buildSolid(circle, plus, 6);

    const start = frontCaps(solid, 0);
    expect(start.inverted).toBe(0);
    expect(start.absolute).toBeCloseTo(shoelace(circle), 3);

    const end = frontCaps(solid, 1);
    expect(end.inverted).toBe(0);
    expect(end.signed).toBeCloseTo(shoelace(plus), 3);
    expect(end.absolute).toBeCloseTo(end.signed, 3);
  });

  it('keeps the same size of index buffer, so the geometry can be updated in place', () => {
    const solid = buildSolid(circle, plus, 6);
    const index = solid.index;
    const length = index.length;

    positionsAt(solid, 1);
    positionsAt(solid, 0.5);

    expect(solid.index).toBe(index);
    expect(solid.index.length).toBe(length);
    expect(Math.max(...solid.index)).toBeLessThan(solid.vertexCount);
  });

  it('retriangulates a ring with a hole at the end too', () => {
    const outer = { from: circle, to: plus };
    const smallCircle = circle.map((p) => ({ x: p.x * 0.3, y: p.y * 0.3 }));
    const smallPlus = plus.map((p) => ({ x: p.x * 0.3, y: p.y * 0.3 }));
    const solid = buildSolid(outer.from, outer.to, 6, [{ from: smallCircle, to: smallPlus }]);

    const end = frontCaps(solid, 1);

    expect(end.inverted).toBe(0);
    expect(end.signed).toBeCloseTo(shoelace(plus) - shoelace(smallPlus), 3);
    expect(end.absolute).toBeCloseTo(end.signed, 3);
  });
});
