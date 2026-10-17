import { describe, expect, it } from 'vitest';
import {
  KDTree,
  euclideanDistance,
  manhattanDistance,
  type Point,
} from './kdTree';

const points: Point[] = [
  { x: 0, y: 0, id: 'a' },
  { x: 10, y: 0, id: 'b' },
  { x: 0, y: 10, id: 'c' },
  { x: 10, y: 10, id: 'd' },
];

describe('distance functions', () => {
  it('computes euclidean distance', () => {
    expect(euclideanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('computes manhattan distance', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
  });
});

describe('KDTree', () => {
  it('finds the nearest point', () => {
    const tree = new KDTree(points);
    const [result] = tree.nearest({ x: 9, y: 1 }, 1);

    expect(result.point.id).toBe('b');
  });

  it('returns k results ordered by distance', () => {
    const tree = new KDTree(points);
    const results = tree.nearest({ x: 1, y: 1 }, 2);

    expect(results).toHaveLength(2);
    expect(results[0].point.id).toBe('a');
    expect(results[0].distance).toBeLessThanOrEqual(results[1].distance);
  });

  it('returns no results for an empty tree', () => {
    const tree = new KDTree([]);

    expect(tree.nearest({ x: 0, y: 0 }, 1)).toEqual([]);
  });

  it('finds points within a radius', () => {
    const tree = new KDTree(points);
    const found = tree.rangeSearch({ x: 0, y: 0 }, 11);

    expect(found.map((p) => p.id).sort()).toEqual(['a', 'b', 'c']);
  });
});
