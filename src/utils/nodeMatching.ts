import { KDTree, Point, euclideanDistance, manhattanDistance, DistanceFunction } from './kdTree';

export interface NodeMatch {
  sourcePoint: Point;
  targetPoint: Point;
  distance: number;
  confidence: number;
}

export interface MatchingOptions {
  distanceMetric: 'euclidean' | 'manhattan' | 'squared-euclidean';
  maxDistance?: number;
  confidenceThreshold?: number;
  useThinPlateSpline?: boolean;
  balanceMatching?: boolean;
}

export interface MatchingResult {
  matches: NodeMatch[];
  unmatchedSource: Point[];
  unmatchedTarget: Point[];
  totalDistance: number;
  averageConfidence: number;
}

export class NodeMatcher {
  private options: Required<MatchingOptions>;

  constructor(options: Partial<MatchingOptions> = {}) {
    this.options = {
      distanceMetric: 'euclidean',
      maxDistance: Infinity,
      confidenceThreshold: 0.1,
      useThinPlateSpline: false,
      balanceMatching: true,
      ...options,
    };
  }

  /**
   * Automatically match nodes using k-NN algorithm
   */
  autoMatchNodes(sourcePoints: Point[], targetPoints: Point[]): MatchingResult {
    if (sourcePoints.length === 0 || targetPoints.length === 0) {
      return {
        matches: [],
        unmatchedSource: [...sourcePoints],
        unmatchedTarget: [...targetPoints],
        totalDistance: 0,
        averageConfidence: 0,
      };
    }

    const distanceFunction = this.getDistanceFunction();
    const kdTree = new KDTree(targetPoints, distanceFunction);

    let matches: NodeMatch[] = [];
    const usedTargetIds = new Set<string>();
    const unmatchedSource: Point[] = [];

    // First pass: find nearest neighbors
    for (const sourcePoint of sourcePoints) {
      const nearestResults = kdTree.nearest(sourcePoint, this.options.balanceMatching ? 3 : 1);
      
      let bestMatch: NodeMatch | null = null;
      
      for (const result of nearestResults) {
        const targetId = result.point.id || `${result.point.x},${result.point.y}`;
        
        if (!usedTargetIds.has(targetId) && result.distance <= this.options.maxDistance) {
          const confidence = this.calculateConfidence(result.distance, sourcePoints, targetPoints);
          
          if (confidence >= this.options.confidenceThreshold) {
            bestMatch = {
              sourcePoint,
              targetPoint: result.point,
              distance: result.distance,
              confidence,
            };
            break;
          }
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        const targetId = bestMatch.targetPoint.id || `${bestMatch.targetPoint.x},${bestMatch.targetPoint.y}`;
        usedTargetIds.add(targetId);
      } else {
        unmatchedSource.push(sourcePoint);
      }
    }

    // Find unmatched target points
    const unmatchedTarget = targetPoints.filter(point => {
      const id = point.id || `${point.x},${point.y}`;
      return !usedTargetIds.has(id);
    });

    // Apply Thin-Plate Spline optimization if enabled
    if (this.options.useThinPlateSpline && matches.length > 3) {
      matches = this.optimizeWithThinPlateSpline(matches, unmatchedSource, unmatchedTarget);
    }

    const totalDistance = matches.reduce((sum, match) => sum + match.distance, 0);
    const averageConfidence = matches.length > 0 
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length 
      : 0;

    return {
      matches,
      unmatchedSource,
      unmatchedTarget,
      totalDistance,
      averageConfidence,
    };
  }

  /**
   * Validate and improve existing manual matches
   */
  validateMatches(matches: NodeMatch[]): MatchingResult {
    const validMatches: NodeMatch[] = [];
    const invalidMatches: NodeMatch[] = [];

    for (const match of matches) {
      const distance = this.getDistanceFunction()(match.sourcePoint, match.targetPoint);
      const updatedMatch = {
        ...match,
        distance,
        confidence: this.calculateConfidence(distance, [match.sourcePoint], [match.targetPoint]),
      };

      if (distance <= this.options.maxDistance && updatedMatch.confidence >= this.options.confidenceThreshold) {
        validMatches.push(updatedMatch);
      } else {
        invalidMatches.push(updatedMatch);
      }
    }

    const totalDistance = validMatches.reduce((sum, match) => sum + match.distance, 0);
    const averageConfidence = validMatches.length > 0 
      ? validMatches.reduce((sum, match) => sum + match.confidence, 0) / validMatches.length 
      : 0;

    return {
      matches: validMatches,
      unmatchedSource: invalidMatches.map(m => m.sourcePoint),
      unmatchedTarget: invalidMatches.map(m => m.targetPoint),
      totalDistance,
      averageConfidence,
    };
  }

  /**
   * Find potential matches for a given point
   */
  findPotentialMatches(point: Point, candidatePoints: Point[], maxResults: number = 5): NodeMatch[] {
    const distanceFunction = this.getDistanceFunction();
    const kdTree = new KDTree(candidatePoints, distanceFunction);
    const nearestResults = kdTree.nearest(point, maxResults);

    return nearestResults
      .filter(result => result.distance <= this.options.maxDistance)
      .map(result => ({
        sourcePoint: point,
        targetPoint: result.point,
        distance: result.distance,
        confidence: this.calculateConfidence(result.distance, [point], candidatePoints),
      }))
      .filter(match => match.confidence >= this.options.confidenceThreshold);
  }

  private getDistanceFunction(): DistanceFunction {
    switch (this.options.distanceMetric) {
      case 'manhattan':
        return manhattanDistance;
      case 'squared-euclidean':
        return (a: Point, b: Point) => {
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          return dx * dx + dy * dy;
        };
      case 'euclidean':
      default:
        return euclideanDistance;
    }
  }

  private calculateConfidence(distance: number, sourcePoints: Point[], targetPoints: Point[]): number {
    // Calculate confidence based on distance relative to the point cloud spread
    const sourceSpread = this.calculatePointSpread(sourcePoints);
    const targetSpread = this.calculatePointSpread(targetPoints);
    const averageSpread = (sourceSpread + targetSpread) / 2;

    if (averageSpread === 0) return 1;

    // Confidence decreases exponentially with distance relative to spread
    const normalizedDistance = distance / averageSpread;
    return Math.exp(-normalizedDistance * 2);
  }

  private calculatePointSpread(points: Point[]): number {
    if (points.length < 2) return 0;

    const centroid = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };

    const distances = points.map(p => euclideanDistance(p, centroid));
    return distances.reduce((sum, d) => sum + d, 0) / distances.length;
  }

  private optimizeWithThinPlateSpline(
    matches: NodeMatch[],
    unmatchedSource: Point[],
    unmatchedTarget: Point[]
  ): NodeMatch[] {
    // Simplified Thin-Plate Spline optimization
    // In a full implementation, this would use proper TPS mathematics
    
    if (matches.length < 4) return matches;

    // Calculate transformation parameters based on existing matches
    const sourcePoints = matches.map(m => m.sourcePoint);
    const targetPoints = matches.map(m => m.targetPoint);

    // Simple affine transformation estimation
    const transform = this.estimateAffineTransform(sourcePoints, targetPoints);

    // Apply transformation to unmatched source points and find better matches
    const improvedMatches = [...matches];

    for (const sourcePoint of unmatchedSource) {
      const transformedPoint = this.applyAffineTransform(sourcePoint, transform);
      const distanceFunction = this.getDistanceFunction();
      
      // Find closest unmatched target point to transformed position
      let bestDistance = Infinity;
      let bestTarget: Point | null = null;

      for (const targetPoint of unmatchedTarget) {
        const distance = distanceFunction(transformedPoint, targetPoint);
        if (distance < bestDistance && distance <= this.options.maxDistance) {
          bestDistance = distance;
          bestTarget = targetPoint;
        }
      }

      if (bestTarget) {
        const confidence = this.calculateConfidence(bestDistance, [sourcePoint], [bestTarget]);
        if (confidence >= this.options.confidenceThreshold) {
          improvedMatches.push({
            sourcePoint,
            targetPoint: bestTarget,
            distance: bestDistance,
            confidence,
          });
        }
      }
    }

    return improvedMatches;
  }

  private estimateAffineTransform(sourcePoints: Point[], targetPoints: Point[]): AffineTransform {
    // Simplified affine transformation estimation
    // In practice, this would use least squares fitting
    
    if (sourcePoints.length !== targetPoints.length || sourcePoints.length < 3) {
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    }

    // Calculate centroids
    const sourceCentroid = {
      x: sourcePoints.reduce((sum, p) => sum + p.x, 0) / sourcePoints.length,
      y: sourcePoints.reduce((sum, p) => sum + p.y, 0) / sourcePoints.length,
    };

    const targetCentroid = {
      x: targetPoints.reduce((sum, p) => sum + p.x, 0) / targetPoints.length,
      y: targetPoints.reduce((sum, p) => sum + p.y, 0) / targetPoints.length,
    };

    // Simple translation-only transform for now
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: targetCentroid.x - sourceCentroid.x,
      f: targetCentroid.y - sourceCentroid.y,
    };
  }

  private applyAffineTransform(point: Point, transform: AffineTransform): Point {
    return {
      x: transform.a * point.x + transform.c * point.y + transform.e,
      y: transform.b * point.x + transform.d * point.y + transform.f,
      id: point.id,
    };
  }
}

interface AffineTransform {
  a: number; // x scale
  b: number; // x skew
  c: number; // y skew
  d: number; // y scale
  e: number; // x translation
  f: number; // y translation
}

// Utility function for easy access
export function autoMatchNodes(
  sourcePoints: Point[],
  targetPoints: Point[],
  options?: Partial<MatchingOptions>
): MatchingResult {
  const matcher = new NodeMatcher(options);
  return matcher.autoMatchNodes(sourcePoints, targetPoints);
}
