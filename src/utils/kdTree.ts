export interface Point {
  x: number;
  y: number;
  id?: string;
}

export interface KDNode {
  point: Point;
  left: KDNode | null;
  right: KDNode | null;
  dimension: number;
}

export interface NearestResult {
  point: Point;
  distance: number;
}

export type DistanceFunction = (a: Point, b: Point) => number;

export class KDTree {
  private root: KDNode | null = null;
  private dimensions: number = 2;
  private distanceFunction: DistanceFunction;

  constructor(points: Point[], distanceFunction: DistanceFunction = euclideanDistance) {
    this.distanceFunction = distanceFunction;
    this.root = this.buildTree(points, 0);
  }

  private buildTree(points: Point[], depth: number): KDNode | null {
    if (points.length === 0) return null;

    const dimension = depth % this.dimensions;
    const sortedPoints = [...points].sort((a, b) => {
      return dimension === 0 ? a.x - b.x : a.y - b.y;
    });

    const medianIndex = Math.floor(sortedPoints.length / 2);
    const medianPoint = sortedPoints[medianIndex];

    const leftPoints = sortedPoints.slice(0, medianIndex);
    const rightPoints = sortedPoints.slice(medianIndex + 1);

    return {
      point: medianPoint,
      left: this.buildTree(leftPoints, depth + 1),
      right: this.buildTree(rightPoints, depth + 1),
      dimension,
    };
  }

  nearest(target: Point, k: number = 1): NearestResult[] {
    if (!this.root) return [];

    const heap = new MaxHeap<NearestResult>((a, b) => a.distance - b.distance);
    this.nearestSearch(this.root, target, k, heap, 0);

    return heap.toArray().sort((a, b) => a.distance - b.distance);
  }

  private nearestSearch(
    node: KDNode | null,
    target: Point,
    k: number,
    heap: MaxHeap<NearestResult>,
    depth: number
  ): void {
    if (!node) return;

    const distance = this.distanceFunction(node.point, target);
    const result: NearestResult = { point: node.point, distance };

    if (heap.size() < k) {
      heap.push(result);
    } else if (distance < heap.peek()!.distance) {
      heap.pop();
      heap.push(result);
    }

    const dimension = depth % this.dimensions;
    const targetValue = dimension === 0 ? target.x : target.y;
    const nodeValue = dimension === 0 ? node.point.x : node.point.y;

    const primaryChild = targetValue < nodeValue ? node.left : node.right;
    const secondaryChild = targetValue < nodeValue ? node.right : node.left;

    this.nearestSearch(primaryChild, target, k, heap, depth + 1);

    // Check if we need to search the other side
    const axisDistance = Math.abs(targetValue - nodeValue);
    if (heap.size() < k || axisDistance < heap.peek()!.distance) {
      this.nearestSearch(secondaryChild, target, k, heap, depth + 1);
    }
  }

  // Get all points within a certain radius
  rangeSearch(center: Point, radius: number): Point[] {
    const results: Point[] = [];
    this.rangeSearchRecursive(this.root, center, radius, results, 0);
    return results;
  }

  private rangeSearchRecursive(
    node: KDNode | null,
    center: Point,
    radius: number,
    results: Point[],
    depth: number
  ): void {
    if (!node) return;

    const distance = this.distanceFunction(node.point, center);
    if (distance <= radius) {
      results.push(node.point);
    }

    const dimension = depth % this.dimensions;
    const centerValue = dimension === 0 ? center.x : center.y;
    const nodeValue = dimension === 0 ? node.point.x : node.point.y;
    const axisDistance = Math.abs(centerValue - nodeValue);

    if (centerValue < nodeValue) {
      this.rangeSearchRecursive(node.left, center, radius, results, depth + 1);
      if (axisDistance <= radius) {
        this.rangeSearchRecursive(node.right, center, radius, results, depth + 1);
      }
    } else {
      this.rangeSearchRecursive(node.right, center, radius, results, depth + 1);
      if (axisDistance <= radius) {
        this.rangeSearchRecursive(node.left, center, radius, results, depth + 1);
      }
    }
  }
}

// Max heap implementation for k-nearest neighbors
class MaxHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compareFunction: (a: T, b: T) => number) {
    this.compare = compareFunction;
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(item: T): void {
    this.items.push(item);
    this.heapifyUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    if (this.items.length === 1) return this.items.pop();

    const root = this.items[0];
    this.items[0] = this.items.pop()!;
    this.heapifyDown(0);
    return root;
  }

  toArray(): T[] {
    return [...this.items];
  }

  private heapifyUp(index: number): void {
    if (index === 0) return;

    const parentIndex = Math.floor((index - 1) / 2);
    if (this.compare(this.items[index], this.items[parentIndex]) > 0) {
      this.swap(index, parentIndex);
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let largest = index;

    if (
      leftChild < this.items.length &&
      this.compare(this.items[leftChild], this.items[largest]) > 0
    ) {
      largest = leftChild;
    }

    if (
      rightChild < this.items.length &&
      this.compare(this.items[rightChild], this.items[largest]) > 0
    ) {
      largest = rightChild;
    }

    if (largest !== index) {
      this.swap(index, largest);
      this.heapifyDown(largest);
    }
  }

  private swap(i: number, j: number): void {
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
  }
}

// Distance functions
export function euclideanDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function squaredEuclideanDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
