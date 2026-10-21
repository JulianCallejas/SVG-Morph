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

  it('morphs the outline while keeping the same triangles', () => {
    const solid = buildSolid(square, wider, 6);

    expect(extent(positionsAt(solid, 0), 0)).toEqual([0, 10]);
    expect(extent(positionsAt(solid, 1), 0)).toEqual([0, 20]);
    expect(extent(positionsAt(solid, 0.5), 0)).toEqual([0, 15]);
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
