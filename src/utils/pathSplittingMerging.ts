import { SVGData, PathData } from '../types/svg';

export interface PathSegment {
  id: string;
  d: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  length: number;
  complexity: number;
  type: 'line' | 'curve' | 'arc' | 'complex';
}

export interface PathAnalysis {
  originalPath: PathData;
  segments: PathSegment[];
  totalLength: number;
  complexity: number;
  isClosed: boolean;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface SplitMergeOptions {
  maxSegmentLength: number;
  minSegmentLength: number;
  complexityThreshold: number;
  preserveSharpCorners: boolean;
  smoothingFactor: number;
  targetSegmentCount?: number;
}

export interface MergeCandidate {
  paths: PathData[];
  similarity: number;
  mergedPath: PathData;
  confidence: number;
}

export class PathSplittingMergingEngine {
  private defaultOptions: SplitMergeOptions = {
    maxSegmentLength: 100,
    minSegmentLength: 10,
    complexityThreshold: 0.5,
    preserveSharpCorners: true,
    smoothingFactor: 0.1,
    targetSegmentCount: undefined
  };

  /**
   * Analyze a path and break it down into segments
   */
  analyzePath(pathData: PathData): PathAnalysis {
    const segments = this.extractSegments(pathData.d);
    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    const complexity = this.calculatePathComplexity(pathData.d);
    const isClosed = pathData.d.toLowerCase().includes('z');
    const boundingBox = this.calculateBoundingBox(pathData.d);

    return {
      originalPath: pathData,
      segments,
      totalLength,
      complexity,
      isClosed,
      boundingBox
    };
  }

  /**
   * Split a complex path into multiple simpler paths
   */
  splitPath(
    pathData: PathData,
    options: Partial<SplitMergeOptions> = {}
  ): PathData[] {
    const opts = { ...this.defaultOptions, ...options };
    const analysis = this.analyzePath(pathData);

    // If path is already simple enough, return as-is
    if (analysis.complexity < opts.complexityThreshold) {
      return [pathData];
    }

    const splitPaths: PathData[] = [];

    if (opts.targetSegmentCount) {
      // Split into specific number of segments
      const segmentsPerPath = Math.ceil(analysis.segments.length / opts.targetSegmentCount);
      
      for (let i = 0; i < analysis.segments.length; i += segmentsPerPath) {
        const segmentGroup = analysis.segments.slice(i, i + segmentsPerPath);
        const newPath = this.createPathFromSegments(segmentGroup, pathData);
        splitPaths.push(newPath);
      }
    } else {
      // Split based on complexity and length thresholds
      let currentSegments: PathSegment[] = [];
      let currentLength = 0;

      for (const segment of analysis.segments) {
        currentSegments.push(segment);
        currentLength += segment.length;

        // Check if we should create a new path
        const shouldSplit = 
          currentLength > opts.maxSegmentLength ||
          (segment.type === 'complex' && opts.preserveSharpCorners) ||
          this.detectSharpCorner(segment, currentSegments);

        if (shouldSplit && currentSegments.length > 0) {
          const newPath = this.createPathFromSegments(currentSegments, pathData);
          splitPaths.push(newPath);
          currentSegments = [];
          currentLength = 0;
        }
      }

      // Add remaining segments
      if (currentSegments.length > 0) {
        const newPath = this.createPathFromSegments(currentSegments, pathData);
        splitPaths.push(newPath);
      }
    }

    return splitPaths.length > 0 ? splitPaths : [pathData];
  }

  /**
   * Merge multiple paths into a single optimized path
   */
  mergePaths(
    paths: PathData[],
    options: Partial<SplitMergeOptions> = {}
  ): PathData {
    const opts = { ...this.defaultOptions, ...options };

    if (paths.length === 0) {
      throw new Error('No paths to merge');
    }

    if (paths.length === 1) {
      return paths[0];
    }

    // Analyze all paths
    const analyses = paths.map(path => this.analyzePath(path));
    
    // Sort paths by position for optimal merging
    const sortedPaths = this.sortPathsForMerging(analyses);
    
    // Merge paths progressively
    let mergedPath = sortedPaths[0].originalPath;
    
    for (let i = 1; i < sortedPaths.length; i++) {
      mergedPath = this.mergeTwoPaths(mergedPath, sortedPaths[i].originalPath, opts);
    }

    // Optimize the final merged path
    return this.optimizePath(mergedPath, opts);
  }

  /**
   * Find merge candidates among a set of paths
   */
  findMergeCandidates(paths: PathData[]): MergeCandidate[] {
    const candidates: MergeCandidate[] = [];
    
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const pathA = paths[i];
        const pathB = paths[j];
        
        const similarity = this.calculatePathSimilarity(pathA, pathB);
        
        if (similarity > 0.3) { // Threshold for merge candidacy
          const mergedPath = this.mergeTwoPaths(pathA, pathB);
          const confidence = this.calculateMergeConfidence(pathA, pathB, mergedPath);
          
          candidates.push({
            paths: [pathA, pathB],
            similarity,
            mergedPath,
            confidence
          });
        }
      }
    }

    // Sort by confidence (highest first)
    return candidates.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Automatically optimize paths for better morphing
   */
  optimizeForMorphing(
    sourcePaths: PathData[],
    targetPaths: PathData[]
  ): {
    optimizedSource: PathData[];
    optimizedTarget: PathData[];
    matchingStrategy: 'split' | 'merge' | 'balanced';
  } {
    const sourceCount = sourcePaths.length;
    const targetCount = targetPaths.length;

    if (sourceCount === targetCount) {
      // Already balanced, just optimize individual paths
      return {
        optimizedSource: sourcePaths.map(path => this.optimizePath(path)),
        optimizedTarget: targetPaths.map(path => this.optimizePath(path)),
        matchingStrategy: 'balanced'
      };
    }

    if (sourceCount > targetCount) {
      // Need to merge source paths or split target paths
      const targetComplexity = this.calculateAverageComplexity(targetPaths);
      
      if (targetComplexity > 0.7) {
        // Split target paths to match source count
        const splitTargets = this.balancePathCounts(targetPaths, sourceCount, 'split');
        return {
          optimizedSource: sourcePaths.map(path => this.optimizePath(path)),
          optimizedTarget: splitTargets,
          matchingStrategy: 'split'
        };
      } else {
        // Merge source paths to match target count
        const mergedSources = this.balancePathCounts(sourcePaths, targetCount, 'merge');
        return {
          optimizedSource: mergedSources,
          optimizedTarget: targetPaths.map(path => this.optimizePath(path)),
          matchingStrategy: 'merge'
        };
      }
    } else {
      // sourceCount < targetCount
      const sourceComplexity = this.calculateAverageComplexity(sourcePaths);
      
      if (sourceComplexity > 0.7) {
        // Split source paths to match target count
        const splitSources = this.balancePathCounts(sourcePaths, targetCount, 'split');
        return {
          optimizedSource: splitSources,
          optimizedTarget: targetPaths.map(path => this.optimizePath(path)),
          matchingStrategy: 'split'
        };
      } else {
        // Merge target paths to match source count
        const mergedTargets = this.balancePathCounts(targetPaths, sourceCount, 'merge');
        return {
          optimizedSource: sourcePaths.map(path => this.optimizePath(path)),
          optimizedTarget: mergedTargets,
          matchingStrategy: 'merge'
        };
      }
    }
  }

  /**
   * Private helper methods
   */
  private extractSegments(pathD: string): PathSegment[] {
    const segments: PathSegment[] = [];
    const commands = this.parsePathCommands(pathD);
    
    let currentPoint = { x: 0, y: 0 };
    let segmentId = 0;

    for (const command of commands) {
      const segment = this.createSegmentFromCommand(command, currentPoint, segmentId++);
      if (segment) {
        segments.push(segment);
        currentPoint = segment.endPoint;
      }
    }

    return segments;
  }

  private parsePathCommands(pathD: string): any[] {
    // Simplified path command parsing
    const commands: any[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])[^MmLlHhVvCcSsQqTtAaZz]*/g;
    let match;

    while ((match = regex.exec(pathD)) !== null) {
      const command = match[0];
      const type = command[0];
      const params = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      
      commands.push({ type, params });
    }

    return commands;
  }

  private createSegmentFromCommand(
    command: any,
    startPoint: { x: number; y: number },
    id: number
  ): PathSegment | null {
    const { type, params } = command;
    
    let endPoint = { ...startPoint };
    let segmentType: 'line' | 'curve' | 'arc' | 'complex' = 'line';
    let length = 0;
    let complexity = 0.1;

    switch (type.toLowerCase()) {
      case 'm':
        endPoint = type === 'M' ? 
          { x: params[0], y: params[1] } :
          { x: startPoint.x + params[0], y: startPoint.y + params[1] };
        length = this.calculateDistance(startPoint, endPoint);
        break;
        
      case 'l':
        endPoint = type === 'L' ?
          { x: params[0], y: params[1] } :
          { x: startPoint.x + params[0], y: startPoint.y + params[1] };
        length = this.calculateDistance(startPoint, endPoint);
        break;
        
      case 'c':
        segmentType = 'curve';
        complexity = 0.7;
        endPoint = type === 'C' ?
          { x: params[4], y: params[5] } :
          { x: startPoint.x + params[4], y: startPoint.y + params[5] };
        length = this.estimateCurveLength(startPoint, endPoint, params);
        break;
        
      case 'a':
        segmentType = 'arc';
        complexity = 0.5;
        endPoint = type === 'A' ?
          { x: params[5], y: params[6] } :
          { x: startPoint.x + params[5], y: startPoint.y + params[6] };
        length = this.estimateArcLength(startPoint, endPoint, params);
        break;
        
      default:
        return null;
    }

    const pathD = this.reconstructSegmentPath(type, params, startPoint);

    return {
      id: `segment_${id}`,
      d: pathD,
      startPoint,
      endPoint,
      length,
      complexity,
      type: segmentType
    };
  }

  private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private estimateCurveLength(
    start: { x: number; y: number },
    end: { x: number; y: number },
    params: number[]
  ): number {
    // Simplified curve length estimation
    const controlDistance = params.length >= 4 ?
      this.calculateDistance(start, { x: params[0], y: params[1] }) +
      this.calculateDistance({ x: params[2], y: params[3] }, end) :
      0;
    
    const directDistance = this.calculateDistance(start, end);
    return (controlDistance + directDistance) / 2;
  }

  private estimateArcLength(
    start: { x: number; y: number },
    end: { x: number; y: number },
    params: number[]
  ): number {
    // Simplified arc length estimation
    if (params.length < 7) return this.calculateDistance(start, end);
    
    const rx = params[0];
    const ry = params[1];
    const angle = params[2] * Math.PI / 180;
    
    // Approximate arc length
    const avgRadius = (rx + ry) / 2;
    return avgRadius * angle;
  }

  private reconstructSegmentPath(type: string, params: number[], startPoint: { x: number; y: number }): string {
    return `M${startPoint.x},${startPoint.y} ${type}${params.join(',')}`;
  }

  private calculatePathComplexity(pathD: string): number {
    const curveCommands = (pathD.match(/[CcSsQqTt]/g) || []).length;
    const arcCommands = (pathD.match(/[Aa]/g) || []).length;
    const totalCommands = (pathD.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || []).length;
    
    if (totalCommands === 0) return 0;
    
    const complexityScore = (curveCommands * 0.7 + arcCommands * 0.5) / totalCommands;
    return Math.min(1, complexityScore);
  }

  private calculateBoundingBox(pathD: string): { x: number; y: number; width: number; height: number } {
    // Simplified bounding box calculation
    const numbers = pathD.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    
    if (numbers.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const xCoords = numbers.filter((_, i) => i % 2 === 0);
    const yCoords = numbers.filter((_, i) => i % 2 === 1);
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private createPathFromSegments(segments: PathSegment[], originalPath: PathData): PathData {
    const pathD = segments.map(seg => seg.d).join(' ');
    
    return {
      ...originalPath,
      d: pathD
    };
  }

  private detectSharpCorner(segment: PathSegment, allSegments: PathSegment[]): boolean {
    if (allSegments.length < 2) return false;
    
    const prevSegment = allSegments[allSegments.length - 2];
    const angle = this.calculateAngleBetweenSegments(prevSegment, segment);
    
    // Consider angles less than 45 degrees as sharp corners
    return Math.abs(angle) < Math.PI / 4;
  }

  private calculateAngleBetweenSegments(seg1: PathSegment, seg2: PathSegment): number {
    const vec1 = {
      x: seg1.endPoint.x - seg1.startPoint.x,
      y: seg1.endPoint.y - seg1.startPoint.y
    };
    
    const vec2 = {
      x: seg2.endPoint.x - seg2.startPoint.x,
      y: seg2.endPoint.y - seg2.startPoint.y
    };
    
    const dot = vec1.x * vec2.x + vec1.y * vec2.y;
    const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
    const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
  }

  private sortPathsForMerging(analyses: PathAnalysis[]): PathAnalysis[] {
    return analyses.sort((a, b) => {
      // Sort by position (top-left to bottom-right)
      const aCenter = {
        x: a.boundingBox.x + a.boundingBox.width / 2,
        y: a.boundingBox.y + a.boundingBox.height / 2
      };
      
      const bCenter = {
        x: b.boundingBox.x + b.boundingBox.width / 2,
        y: b.boundingBox.y + b.boundingBox.height / 2
      };
      
      return (aCenter.y - bCenter.y) || (aCenter.x - bCenter.x);
    });
  }

  private mergeTwoPaths(pathA: PathData, pathB: PathData, options?: SplitMergeOptions): PathData {
    // Simplified path merging - connect paths with a line
    const pathD = `${pathA.d} L${this.getPathEndPoint(pathB.d)} ${pathB.d.replace(/^M[^L]*/, '')}`;
    
    return {
      ...pathA,
      d: pathD,
      fill: pathA.fill || pathB.fill,
      stroke: pathA.stroke || pathB.stroke,
      strokeWidth: pathA.strokeWidth || pathB.strokeWidth
    };
  }

  private getPathEndPoint(pathD: string): string {
    const numbers = pathD.match(/-?\d+\.?\d*/g) || [];
    if (numbers.length >= 2) {
      return `${numbers[numbers.length - 2]},${numbers[numbers.length - 1]}`;
    }
    return '0,0';
  }

  private calculatePathSimilarity(pathA: PathData, pathB: PathData): number {
    const analysisA = this.analyzePath(pathA);
    const analysisB = this.analyzePath(pathB);
    
    // Compare various aspects
    const lengthSimilarity = 1 - Math.abs(analysisA.totalLength - analysisB.totalLength) / 
      Math.max(analysisA.totalLength, analysisB.totalLength);
    
    const complexitySimilarity = 1 - Math.abs(analysisA.complexity - analysisB.complexity);
    
    const segmentSimilarity = 1 - Math.abs(analysisA.segments.length - analysisB.segments.length) /
      Math.max(analysisA.segments.length, analysisB.segments.length);
    
    return (lengthSimilarity + complexitySimilarity + segmentSimilarity) / 3;
  }

  private calculateMergeConfidence(pathA: PathData, pathB: PathData, mergedPath: PathData): number {
    const originalComplexity = (this.calculatePathComplexity(pathA.d) + this.calculatePathComplexity(pathB.d)) / 2;
    const mergedComplexity = this.calculatePathComplexity(mergedPath.d);
    
    // Higher confidence if merged path isn't much more complex
    const complexityRatio = mergedComplexity / Math.max(originalComplexity, 0.1);
    return Math.max(0, 1 - (complexityRatio - 1));
  }

  private optimizePath(path: PathData, options?: Partial<SplitMergeOptions>): PathData {
    // Simplified path optimization
    let optimizedD = path.d;
    
    // Remove redundant commands
    optimizedD = optimizedD.replace(/([ML])\s*\1/g, '$1');
    
    // Simplify consecutive line commands
    optimizedD = optimizedD.replace(/L\s*([^L]*)\s*L/g, 'L$1 L');
    
    return {
      ...path,
      d: optimizedD
    };
  }

  private calculateAverageComplexity(paths: PathData[]): number {
    if (paths.length === 0) return 0;
    
    const totalComplexity = paths.reduce((sum, path) => 
      sum + this.calculatePathComplexity(path.d), 0);
    
    return totalComplexity / paths.length;
  }

  private balancePathCounts(
    paths: PathData[],
    targetCount: number,
    strategy: 'split' | 'merge'
  ): PathData[] {
    if (strategy === 'split') {
      const result: PathData[] = [];
      const pathsPerTarget = Math.ceil(paths.length / targetCount);
      
      for (const path of paths) {
        const splitPaths = this.splitPath(path, { targetSegmentCount: pathsPerTarget });
        result.push(...splitPaths);
      }
      
      return result.slice(0, targetCount);
    } else {
      // Merge strategy
      const result: PathData[] = [];
      const pathsPerGroup = Math.ceil(paths.length / targetCount);
      
      for (let i = 0; i < paths.length; i += pathsPerGroup) {
        const group = paths.slice(i, i + pathsPerGroup);
        const merged = this.mergePaths(group);
        result.push(merged);
      }
      
      return result;
    }
  }
}

// Export singleton instance
export const pathSplittingMerging = new PathSplittingMergingEngine();
