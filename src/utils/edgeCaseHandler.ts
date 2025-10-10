import { SVGData, PathData } from '../workers/pathProcessor';
import { Point } from './kdTree';
import { MultiPathSVG, SVGPath } from './multiPathSupport';

export interface EdgeCaseOptions {
  // Open path handling
  openPathStrategy: 'extend' | 'close' | 'maintain';
  extensionLength: number;
  
  // Disconnected elements handling
  disconnectedStrategy: 'spatial' | 'semantic' | 'hybrid';
  maxDistance: number;
  minSimilarity: number;
  
  // Advanced options
  detectPathType: boolean;
  groupSimilarElements: boolean;
  preservePathDirection: boolean;
}

export interface PathAnalysis {
  isClosed: boolean;
  isConnected: boolean;
  pathType: 'line' | 'curve' | 'shape' | 'complex';
  boundingBox: { x: number; y: number; width: number; height: number };
  complexity: number;
  hasStroke: boolean;
  hasFill: boolean;
}

export class EdgeCaseHandler {
  private options: EdgeCaseOptions;

  constructor(options: Partial<EdgeCaseOptions> = {}) {
    this.options = {
      openPathStrategy: 'maintain',
      extensionLength: 10,
      disconnectedStrategy: 'hybrid',
      maxDistance: 100,
      minSimilarity: 0.3,
      detectPathType: true,
      groupSimilarElements: true,
      preservePathDirection: true,
      ...options,
    };
  }

  /**
   * Analyze SVG path characteristics for better morphing
   */
  analyzePath(pathData: PathData): PathAnalysis {
    const d = pathData.d.trim();
    
    // Check if path is closed
    const isClosed = d.toLowerCase().endsWith('z') || d.toLowerCase().includes(' z ');
    
    // Analyze path commands
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [];
    const hasMove = commands.some(cmd => 'Mm'.includes(cmd));
    const hasCurves = commands.some(cmd => 'CcSsQqTtAa'.includes(cmd));
    const hasLines = commands.some(cmd => 'LlHhVv'.includes(cmd));
    
    // Determine path type
    let pathType: PathAnalysis['pathType'] = 'complex';
    if (commands.length <= 3 && hasLines && !hasCurves) {
      pathType = 'line';
    } else if (hasCurves && commands.length <= 10) {
      pathType = 'curve';
    } else if (isClosed && commands.length <= 20) {
      pathType = 'shape';
    }
    
    // Calculate complexity
    const complexity = this.calculatePathComplexity(d);
    
    // Extract bounding box (simplified)
    const boundingBox = this.extractBoundingBox(d);
    
    return {
      isClosed,
      isConnected: hasMove && commands.filter(cmd => 'Mm'.includes(cmd)).length === 1,
      pathType,
      boundingBox,
      complexity,
      hasStroke: !!pathData.stroke,
      hasFill: !!pathData.fill && pathData.fill !== 'none',
    };
  }

  /**
   * Optimize open paths for better morphing
   */
  optimizeOpenPath(pathData: PathData, analysis: PathAnalysis): PathData {
    if (analysis.isClosed || this.options.openPathStrategy === 'maintain') {
      return pathData;
    }

    let optimizedPath = pathData.d;

    switch (this.options.openPathStrategy) {
      case 'extend':
        optimizedPath = this.extendOpenPath(pathData.d, this.options.extensionLength);
        break;
      
      case 'close':
        optimizedPath = this.closeOpenPath(pathData.d);
        break;
    }

    return {
      ...pathData,
      d: optimizedPath,
    };
  }

  /**
   * Group disconnected elements by similarity
   */
  groupDisconnectedElements(multiPathSVG: MultiPathSVG): MultiPathSVG {
    if (!this.options.groupSimilarElements) {
      return multiPathSVG;
    }

    const groupedPaths: SVGPath[] = [];
    const processedIndices = new Set<number>();

    multiPathSVG.individualPaths.forEach((path, index) => {
      if (processedIndices.has(index)) return;

      const analysis = this.analyzePath(path);
      const similarPaths = [path];
      processedIndices.add(index);

      // Find similar paths
      multiPathSVG.individualPaths.forEach((otherPath, otherIndex) => {
        if (otherIndex <= index || processedIndices.has(otherIndex)) return;

        const otherAnalysis = this.analyzePath(otherPath);
        const similarity = this.calculatePathSimilarity(analysis, otherAnalysis, path, otherPath);

        if (similarity >= this.options.minSimilarity) {
          similarPaths.push(otherPath);
          processedIndices.add(otherIndex);
        }
      });

      // If we found similar paths, create a group; otherwise add as individual
      if (similarPaths.length > 1) {
        // Create a new group
        const newGroup = {
          id: `similar-group-${multiPathSVG.groups.length}`,
          paths: similarPaths,
          transform: undefined,
          opacity: 1,
        };
        multiPathSVG.groups.push(newGroup);
      } else {
        groupedPaths.push(path);
      }
    });

    return {
      ...multiPathSVG,
      individualPaths: groupedPaths,
    };
  }

  /**
   * Enhanced matching for disconnected elements
   */
  matchDisconnectedElements(
    sourcePaths: SVGPath[],
    targetPaths: SVGPath[]
  ): Array<{ source?: SVGPath; target?: SVGPath; confidence: number }> {
    const matches: Array<{ source?: SVGPath; target?: SVGPath; confidence: number }> = [];
    const usedTargets = new Set<number>();

    // Analyze all paths first
    const sourceAnalyses = sourcePaths.map(path => this.analyzePath(path));
    const targetAnalyses = targetPaths.map(path => this.analyzePath(path));

    sourcePaths.forEach((sourcePath, sourceIndex) => {
      let bestMatch = -1;
      let bestConfidence = 0;

      targetPaths.forEach((targetPath, targetIndex) => {
        if (usedTargets.has(targetIndex)) return;

        const confidence = this.calculateMatchConfidence(
          sourceAnalyses[sourceIndex],
          targetAnalyses[targetIndex],
          sourcePath,
          targetPath
        );

        if (confidence > bestConfidence && confidence >= this.options.minSimilarity) {
          bestConfidence = confidence;
          bestMatch = targetIndex;
        }
      });

      if (bestMatch >= 0) {
        usedTargets.add(bestMatch);
        matches.push({
          source: sourcePath,
          target: targetPaths[bestMatch],
          confidence: bestConfidence,
        });
      } else {
        matches.push({
          source: sourcePath,
          confidence: 0,
        });
      }
    });

    // Add unmatched target paths
    targetPaths.forEach((targetPath, targetIndex) => {
      if (!usedTargets.has(targetIndex)) {
        matches.push({
          target: targetPath,
          confidence: 0,
        });
      }
    });

    return matches;
  }

  /**
   * Create intermediate frames for complex morphing scenarios
   */
  createIntermediateFrames(
    sourcePath: SVGPath,
    targetPath: SVGPath,
    frameCount: number = 5
  ): SVGPath[] {
    const frames: SVGPath[] = [];
    const sourceAnalysis = this.analyzePath(sourcePath);
    const targetAnalysis = this.analyzePath(targetPath);

    // Determine if we need special handling
    const needsSpecialHandling = 
      sourceAnalysis.pathType !== targetAnalysis.pathType ||
      Math.abs(sourceAnalysis.complexity - targetAnalysis.complexity) > 20;

    if (needsSpecialHandling) {
      // Create more intermediate frames for complex transitions
      for (let i = 1; i < frameCount; i++) {
        const progress = i / frameCount;
        frames.push(this.createIntermediateFrame(sourcePath, targetPath, progress));
      }
    }

    return frames;
  }

  private extendOpenPath(pathData: string, extensionLength: number): string {
    // Simple extension by adding a small line at the end
    const lastPoint = this.getLastPoint(pathData);
    if (!lastPoint) return pathData;

    return `${pathData} L${lastPoint.x + extensionLength},${lastPoint.y}`;
  }

  private closeOpenPath(pathData: string): string {
    return pathData.endsWith('Z') || pathData.endsWith('z') ? pathData : `${pathData} Z`;
  }

  private getLastPoint(pathData: string): { x: number; y: number } | null {
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    const lastCommand = commands[commands.length - 1];
    
    if (!lastCommand) return null;

    const values = lastCommand.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if (values.length >= 2) {
      return { x: values[values.length - 2], y: values[values.length - 1] };
    }
    
    return null;
  }

  private calculatePathComplexity(pathData: string): number {
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [];
    let complexity = commands.length;
    
    commands.forEach(command => {
      if ('CcSsQqTt'.includes(command)) {
        complexity += 2;
      } else if ('Aa'.includes(command)) {
        complexity += 3;
      }
    });
    
    return complexity;
  }

  private extractBoundingBox(pathData: string): { x: number; y: number; width: number; height: number } {
    // Simplified bounding box extraction
    const numbers = pathData.match(/-?\d+\.?\d*/g)?.map(Number) || [];
    
    if (numbers.length < 2) {
      return { x: 0, y: 0, width: 100, height: 100 };
    }

    const xValues = numbers.filter((_, i) => i % 2 === 0);
    const yValues = numbers.filter((_, i) => i % 2 === 1);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private calculatePathSimilarity(
    analysis1: PathAnalysis,
    analysis2: PathAnalysis,
    path1: SVGPath,
    path2: SVGPath
  ): number {
    let similarity = 0;

    // Path type similarity
    if (analysis1.pathType === analysis2.pathType) {
      similarity += 0.3;
    }

    // Complexity similarity
    const complexityDiff = Math.abs(analysis1.complexity - analysis2.complexity);
    const maxComplexity = Math.max(analysis1.complexity, analysis2.complexity);
    similarity += maxComplexity > 0 ? (1 - complexityDiff / maxComplexity) * 0.2 : 0.2;

    // Size similarity
    const size1 = analysis1.boundingBox.width * analysis1.boundingBox.height;
    const size2 = analysis2.boundingBox.width * analysis2.boundingBox.height;
    const sizeDiff = Math.abs(size1 - size2);
    const maxSize = Math.max(size1, size2);
    similarity += maxSize > 0 ? (1 - sizeDiff / maxSize) * 0.2 : 0.2;

    // Style similarity
    if (path1.fill === path2.fill) similarity += 0.15;
    if (path1.stroke === path2.stroke) similarity += 0.15;

    return Math.min(similarity, 1);
  }

  private calculateMatchConfidence(
    sourceAnalysis: PathAnalysis,
    targetAnalysis: PathAnalysis,
    sourcePath: SVGPath,
    targetPath: SVGPath
  ): number {
    let confidence = this.calculatePathSimilarity(sourceAnalysis, targetAnalysis, sourcePath, targetPath);

    // Spatial proximity bonus (if positions are available)
    if (this.options.disconnectedStrategy === 'spatial' || this.options.disconnectedStrategy === 'hybrid') {
      const distance = this.calculateSpatialDistance(sourceAnalysis.boundingBox, targetAnalysis.boundingBox);
      if (distance < this.options.maxDistance) {
        confidence += (1 - distance / this.options.maxDistance) * 0.2;
      }
    }

    return Math.min(confidence, 1);
  }

  private calculateSpatialDistance(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const center1 = { x: box1.x + box1.width / 2, y: box1.y + box1.height / 2 };
    const center2 = { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 };
    
    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );
  }

  private createIntermediateFrame(
    sourcePath: SVGPath,
    targetPath: SVGPath,
    progress: number
  ): SVGPath {
    // Simplified intermediate frame creation
    // In a full implementation, this would use more sophisticated interpolation
    return {
      ...sourcePath,
      id: `${sourcePath.id}-intermediate-${Math.round(progress * 100)}`,
      opacity: (sourcePath.opacity || 1) * (1 - progress) + (targetPath.opacity || 1) * progress,
    };
  }
}

// Export singleton instance
export const edgeCaseHandler = new EdgeCaseHandler();

// Utility functions
export function createEdgeCaseOptions(overrides: Partial<EdgeCaseOptions> = {}): EdgeCaseOptions {
  return {
    openPathStrategy: 'maintain',
    extensionLength: 10,
    disconnectedStrategy: 'hybrid',
    maxDistance: 100,
    minSimilarity: 0.3,
    detectPathType: true,
    groupSimilarElements: true,
    preservePathDirection: true,
    ...overrides,
  };
}

export function isOpenPath(pathData: string): boolean {
  const trimmed = pathData.trim().toLowerCase();
  return !trimmed.endsWith('z') && !trimmed.includes(' z ');
}

export function hasDisconnectedElements(multiPathSVG: MultiPathSVG): boolean {
  return multiPathSVG.individualPaths.length > 1 || 
         multiPathSVG.groups.some(group => group.paths.length > 1);
}
