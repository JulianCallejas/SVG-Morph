import { interpolate } from 'd3-interpolate';
import SVGPathCommander from 'svg-path-commander';

export interface SVGPath {
  id: string;
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  transform?: string;
  fillRule?: 'nonzero' | 'evenodd';
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeDasharray?: string;
  strokeDashoffset?: number;
  pathLength?: number;
}

export interface SVGGroup {
  id: string;
  paths: SVGPath[];
  transform?: string;
  opacity?: number;
  clipPath?: string;
  mask?: string;
}

export interface MultiPathSVG {
  groups: SVGGroup[];
  individualPaths: SVGPath[];
  viewBox: { x: number; y: number; width: number; height: number };
  width?: number;
  height?: number;
}

export interface MultiPathMorphOptions {
  groupMatching: 'automatic' | 'manual' | 'disabled';
  pathMatching: 'similarity' | 'order' | 'manual';
  preserveGroupStructure: boolean;
  interpolateTransforms: boolean;
  handleMissingPaths: 'fade' | 'maintain' | 'ignore';
  complexityThreshold: number;
  maxPathsPerGroup: number;
}

export class MultiPathProcessor {
  private options: MultiPathMorphOptions;

  constructor(options: Partial<MultiPathMorphOptions> = {}) {
    this.options = {
      groupMatching: 'automatic',
      pathMatching: 'similarity',
      preserveGroupStructure: true,
      interpolateTransforms: true,
      handleMissingPaths: 'fade',
      complexityThreshold: 100,
      maxPathsPerGroup: 50,
      ...options,
    };
  }

  /**
   * Parse SVG content and extract multi-path structure
   */
  parseSVG(svgContent: string): MultiPathSVG {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('Invalid SVG content');
    }

    const viewBox = this.parseViewBox(svgElement.getAttribute('viewBox') || '0 0 100 100');
    const width = parseFloat(svgElement.getAttribute('width') || '0') || undefined;
    const height = parseFloat(svgElement.getAttribute('height') || '0') || undefined;

    const groups: SVGGroup[] = [];
    const individualPaths: SVGPath[] = [];

    // Process groups
    const groupElements = svgElement.querySelectorAll('g');
    groupElements.forEach(groupEl => {
      const group = this.parseGroup(groupEl);
      if (group.paths.length > 0) {
        groups.push(group);
      }
    });

    // Process individual paths (not in groups)
    const pathElements = svgElement.querySelectorAll('svg > path, svg > *:not(g) path');
    pathElements.forEach(pathEl => {
      // Skip paths that are already in groups
      if (!pathEl.closest('g')) {
        const path = this.parsePath(pathEl);
        if (path) {
          individualPaths.push(path);
        }
      }
    });

    return {
      groups,
      individualPaths,
      viewBox,
      width,
      height,
    };
  }

  /**
   * Morph between two multi-path SVGs
   */
  morphMultiPathSVGs(
    source: MultiPathSVG,
    target: MultiPathSVG,
    progress: number
  ): MultiPathSVG {
    const morphedGroups: SVGGroup[] = [];
    const morphedIndividualPaths: SVGPath[] = [];

    // Morph groups
    if (this.options.preserveGroupStructure) {
      const groupPairs = this.matchGroups(source.groups, target.groups);
      groupPairs.forEach(({ source: srcGroup, target: tgtGroup, id }) => {
        if (srcGroup && tgtGroup) {
          morphedGroups.push(this.interpolateGroups(srcGroup, tgtGroup, progress, id));
        } else if (srcGroup) {
          const fadedGroup = { ...srcGroup, id };
          fadedGroup.opacity = (fadedGroup.opacity || 1) * (1 - progress);
          morphedGroups.push(fadedGroup);
        } else if (tgtGroup) {
          const fadedGroup = { ...tgtGroup, id };
          fadedGroup.opacity = (fadedGroup.opacity || 1) * progress;
          morphedGroups.push(fadedGroup);
        }
      });
    }

    // Morph individual paths
    const pathPairs = this.matchPaths(source.individualPaths, target.individualPaths);
    pathPairs.forEach(({ source: srcPath, target: tgtPath, id }) => {
      if (srcPath && tgtPath) {
        morphedIndividualPaths.push(this.interpolatePaths(srcPath, tgtPath, progress, id));
      } else if (srcPath) {
        const fadedPath = { ...srcPath, id };
        fadedPath.opacity = (fadedPath.opacity || 1) * (1 - progress);
        morphedIndividualPaths.push(fadedPath);
      } else if (tgtPath) {
        const fadedPath = { ...tgtPath, id };
        fadedPath.opacity = (fadedPath.opacity || 1) * progress;
        morphedIndividualPaths.push(fadedPath);
      }
    });

    // Interpolate viewBox and dimensions
    const morphedViewBox = {
      x: interpolate(source.viewBox.x, target.viewBox.x)(progress),
      y: interpolate(source.viewBox.y, target.viewBox.y)(progress),
      width: interpolate(source.viewBox.width, target.viewBox.width)(progress),
      height: interpolate(source.viewBox.height, target.viewBox.height)(progress),
    };

    return {
      groups: morphedGroups,
      individualPaths: morphedIndividualPaths,
      viewBox: morphedViewBox,
      width: source.width && target.width ? interpolate(source.width, target.width)(progress) : undefined,
      height: source.height && target.height ? interpolate(source.height, target.height)(progress) : undefined,
    };
  }

  /**
   * Generate SVG content from multi-path structure
   */
  generateSVG(multiPathSVG: MultiPathSVG): string {
    const { viewBox, width, height, groups, individualPaths } = multiPathSVG;
    
    const svgAttrs = [
      'xmlns="http://www.w3.org/2000/svg"',
      `viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"`,
      width ? `width="${width}"` : '',
      height ? `height="${height}"` : '',
    ].filter(Boolean).join(' ');

    const groupElements = groups.map(group => this.generateGroupSVG(group)).join('\n');
    const pathElements = individualPaths.map(path => this.generatePathSVG(path)).join('\n');

    return `<svg ${svgAttrs}>
${groupElements}
${pathElements}
</svg>`.trim();
  }

  /**
   * Optimize multi-path SVG for better morphing
   */
  optimizeForMorphing(multiPathSVG: MultiPathSVG): MultiPathSVG {
    const optimized = { ...multiPathSVG };

    // Normalize path data
    optimized.groups = optimized.groups.map(group => ({
      ...group,
      paths: group.paths.map(path => this.normalizePath(path)),
    }));

    optimized.individualPaths = optimized.individualPaths.map(path => this.normalizePath(path));

    // Split complex paths if needed
    optimized.groups = optimized.groups.map(group => ({
      ...group,
      paths: this.splitComplexPaths(group.paths),
    }));

    optimized.individualPaths = this.splitComplexPaths(optimized.individualPaths);

    return optimized;
  }

  /**
   * Calculate complexity score for multi-path SVG
   */
  calculateComplexity(multiPathSVG: MultiPathSVG): number {
    let complexity = 0;
    
    // Add complexity for groups
    complexity += multiPathSVG.groups.length * 2;
    
    // Add complexity for paths
    multiPathSVG.groups.forEach(group => {
      complexity += group.paths.length;
      group.paths.forEach(path => {
        complexity += this.calculatePathComplexity(path.d);
      });
    });

    multiPathSVG.individualPaths.forEach(path => {
      complexity += this.calculatePathComplexity(path.d);
    });

    return complexity;
  }

  private parseViewBox(viewBoxStr: string): { x: number; y: number; width: number; height: number } {
    const values = viewBoxStr.split(/\s+/).map(Number);
    return {
      x: values[0] || 0,
      y: values[1] || 0,
      width: values[2] || 100,
      height: values[3] || 100,
    };
  }

  private parseGroup(groupElement: Element): SVGGroup {
    const id = groupElement.id || `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paths: SVGPath[] = [];

    const pathElements = groupElement.querySelectorAll('path');
    pathElements.forEach(pathEl => {
      const path = this.parsePath(pathEl);
      if (path) {
        paths.push(path);
      }
    });

    return {
      id,
      paths,
      transform: groupElement.getAttribute('transform') || undefined,
      opacity: parseFloat(groupElement.getAttribute('opacity') || '1'),
      clipPath: groupElement.getAttribute('clip-path') || undefined,
      mask: groupElement.getAttribute('mask') || undefined,
    };
  }

  private parsePath(pathElement: Element): SVGPath | null {
    const d = pathElement.getAttribute('d');
    if (!d) return null;

    const id = pathElement.id || `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      d,
      fill: pathElement.getAttribute('fill') || undefined,
      stroke: pathElement.getAttribute('stroke') || undefined,
      strokeWidth: parseFloat(pathElement.getAttribute('stroke-width') || '0') || undefined,
      opacity: parseFloat(pathElement.getAttribute('opacity') || '1'),
      transform: pathElement.getAttribute('transform') || undefined,
      fillRule: (pathElement.getAttribute('fill-rule') as any) || undefined,
      strokeLinecap: (pathElement.getAttribute('stroke-linecap') as any) || undefined,
      strokeLinejoin: (pathElement.getAttribute('stroke-linejoin') as any) || undefined,
      strokeDasharray: pathElement.getAttribute('stroke-dasharray') || undefined,
      strokeDashoffset: parseFloat(pathElement.getAttribute('stroke-dashoffset') || '0') || undefined,
      pathLength: parseFloat(pathElement.getAttribute('pathLength') || '0') || undefined,
    };
  }

  private matchGroups(
    sourceGroups: SVGGroup[],
    targetGroups: SVGGroup[]
  ): Array<{ source?: SVGGroup; target?: SVGGroup; id: string }> {
    const pairs: Array<{ source?: SVGGroup; target?: SVGGroup; id: string }> = [];
    
    if (this.options.groupMatching === 'disabled') {
      // Flatten all groups into individual paths
      return [];
    }

    const usedTargets = new Set<number>();
    
    sourceGroups.forEach((source, sourceIndex) => {
      let bestMatch = -1;
      let bestScore = -1;
      
      if (this.options.groupMatching === 'automatic') {
        targetGroups.forEach((target, targetIndex) => {
          if (usedTargets.has(targetIndex)) return;
          
          const score = this.calculateGroupSimilarity(source, target);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = targetIndex;
          }
        });
      }
      
      const id = `morph-group-${sourceIndex}`;
      if (bestMatch >= 0 && bestScore > 0.3) {
        usedTargets.add(bestMatch);
        pairs.push({
          source,
          target: targetGroups[bestMatch],
          id,
        });
      } else {
        pairs.push({ source, id });
      }
    });
    
    // Add unmatched target groups
    targetGroups.forEach((target, targetIndex) => {
      if (!usedTargets.has(targetIndex)) {
        pairs.push({
          target,
          id: `morph-group-new-${targetIndex}`,
        });
      }
    });
    
    return pairs;
  }

  private matchPaths(
    sourcePaths: SVGPath[],
    targetPaths: SVGPath[]
  ): Array<{ source?: SVGPath; target?: SVGPath; id: string }> {
    const pairs: Array<{ source?: SVGPath; target?: SVGPath; id: string }> = [];
    const usedTargets = new Set<number>();
    
    sourcePaths.forEach((source, sourceIndex) => {
      let bestMatch = -1;
      let bestScore = -1;
      
      if (this.options.pathMatching === 'similarity') {
        targetPaths.forEach((target, targetIndex) => {
          if (usedTargets.has(targetIndex)) return;
          
          const score = this.calculatePathSimilarity(source, target);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = targetIndex;
          }
        });
      } else if (this.options.pathMatching === 'order') {
        if (sourceIndex < targetPaths.length) {
          bestMatch = sourceIndex;
          bestScore = 1;
        }
      }
      
      const id = `morph-path-${sourceIndex}`;
      if (bestMatch >= 0 && bestScore > 0.2) {
        usedTargets.add(bestMatch);
        pairs.push({
          source,
          target: targetPaths[bestMatch],
          id,
        });
      } else {
        pairs.push({ source, id });
      }
    });
    
    // Add unmatched target paths
    targetPaths.forEach((target, targetIndex) => {
      if (!usedTargets.has(targetIndex)) {
        pairs.push({
          target,
          id: `morph-path-new-${targetIndex}`,
        });
      }
    });
    
    return pairs;
  }

  private calculateGroupSimilarity(group1: SVGGroup, group2: SVGGroup): number {
    let score = 0;
    
    // Compare number of paths
    const pathCountDiff = Math.abs(group1.paths.length - group2.paths.length);
    const maxPaths = Math.max(group1.paths.length, group2.paths.length);
    score += maxPaths > 0 ? (1 - pathCountDiff / maxPaths) * 0.4 : 0.4;
    
    // Compare transforms (simplified)
    if (group1.transform === group2.transform) {
      score += 0.2;
    }
    
    // Compare path similarities
    if (group1.paths.length > 0 && group2.paths.length > 0) {
      let pathSimilaritySum = 0;
      const minPaths = Math.min(group1.paths.length, group2.paths.length);
      
      for (let i = 0; i < minPaths; i++) {
        pathSimilaritySum += this.calculatePathSimilarity(group1.paths[i], group2.paths[i]);
      }
      
      score += (pathSimilaritySum / minPaths) * 0.4;
    }
    
    return Math.min(score, 1);
  }

  private calculatePathSimilarity(path1: SVGPath, path2: SVGPath): number {
    let score = 0;
    
    // Compare path complexity
    const complexity1 = this.calculatePathComplexity(path1.d);
    const complexity2 = this.calculatePathComplexity(path2.d);
    const complexityDiff = Math.abs(complexity1 - complexity2);
    const maxComplexity = Math.max(complexity1, complexity2);
    score += maxComplexity > 0 ? (1 - complexityDiff / maxComplexity) * 0.3 : 0.3;
    
    // Compare fill colors
    if (path1.fill === path2.fill) {
      score += 0.2;
    } else if (path1.fill && path2.fill) {
      // Could implement color distance calculation here
      score += 0.1;
    }
    
    // Compare stroke properties
    if (path1.stroke === path2.stroke) {
      score += 0.2;
    }
    
    if (Math.abs((path1.strokeWidth || 0) - (path2.strokeWidth || 0)) < 2) {
      score += 0.1;
    }
    
    // Compare opacity
    const opacityDiff = Math.abs((path1.opacity || 1) - (path2.opacity || 1));
    score += (1 - opacityDiff) * 0.2;
    
    return Math.min(score, 1);
  }

  private calculatePathComplexity(pathData: string): number {
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || [];
    let complexity = commands.length;
    
    // Add complexity for curve commands
    commands.forEach(command => {
      if ('CcSsQqTt'.includes(command)) {
        complexity += 2;
      } else if ('Aa'.includes(command)) {
        complexity += 3;
      }
    });
    
    return complexity;
  }

  private interpolateGroups(
    source: SVGGroup,
    target: SVGGroup,
    progress: number,
    id: string
  ): SVGGroup {
    const morphedPaths: SVGPath[] = [];
    
    // Match and interpolate paths within groups
    const pathPairs = this.matchPaths(source.paths, target.paths);
    pathPairs.forEach(({ source: srcPath, target: tgtPath, id: pathId }) => {
      if (srcPath && tgtPath) {
        morphedPaths.push(this.interpolatePaths(srcPath, tgtPath, progress, pathId));
      } else if (srcPath) {
        const fadedPath = { ...srcPath, id: pathId };
        fadedPath.opacity = (fadedPath.opacity || 1) * (1 - progress);
        morphedPaths.push(fadedPath);
      } else if (tgtPath) {
        const fadedPath = { ...tgtPath, id: pathId };
        fadedPath.opacity = (fadedPath.opacity || 1) * progress;
        morphedPaths.push(fadedPath);
      }
    });

    return {
      id,
      paths: morphedPaths,
      transform: this.options.interpolateTransforms && source.transform && target.transform
        ? this.interpolateTransform(source.transform, target.transform, progress)
        : (progress < 0.5 ? source.transform : target.transform),
      opacity: interpolate(source.opacity || 1, target.opacity || 1)(progress),
      clipPath: progress < 0.5 ? source.clipPath : target.clipPath,
      mask: progress < 0.5 ? source.mask : target.mask,
    };
  }

  private interpolatePaths(
    source: SVGPath,
    target: SVGPath,
    progress: number,
    id: string
  ): SVGPath {
    // Normalize paths for better interpolation
    const normalizedSource = this.normalizePath(source);
    const normalizedTarget = this.normalizePath(target);
    
    const pathInterpolator = interpolate(normalizedSource.d, normalizedTarget.d);
    
    return {
      id,
      d: pathInterpolator(progress),
      fill: source.fill && target.fill ? interpolate(source.fill, target.fill)(progress) : (progress < 0.5 ? source.fill : target.fill),
      stroke: source.stroke && target.stroke ? interpolate(source.stroke, target.stroke)(progress) : (progress < 0.5 ? source.stroke : target.stroke),
      strokeWidth: interpolate(source.strokeWidth || 0, target.strokeWidth || 0)(progress) || undefined,
      opacity: interpolate(source.opacity || 1, target.opacity || 1)(progress),
      transform: this.options.interpolateTransforms && source.transform && target.transform
        ? this.interpolateTransform(source.transform, target.transform, progress)
        : (progress < 0.5 ? source.transform : target.transform),
      fillRule: progress < 0.5 ? source.fillRule : target.fillRule,
      strokeLinecap: progress < 0.5 ? source.strokeLinecap : target.strokeLinecap,
      strokeLinejoin: progress < 0.5 ? source.strokeLinejoin : target.strokeLinejoin,
      strokeDasharray: progress < 0.5 ? source.strokeDasharray : target.strokeDasharray,
      strokeDashoffset: interpolate(source.strokeDashoffset || 0, target.strokeDashoffset || 0)(progress) || undefined,
      pathLength: interpolate(source.pathLength || 0, target.pathLength || 0)(progress) || undefined,
    };
  }

  private normalizePath(path: SVGPath): SVGPath {
    try {
      // Use SVGPathCommander to normalize the path
      const normalized = new SVGPathCommander(path.d).normalize().toString();
      return { ...path, d: normalized };
    } catch (error) {
      console.warn('Failed to normalize path:', error);
      return path;
    }
  }

  private splitComplexPaths(paths: SVGPath[]): SVGPath[] {
    const result: SVGPath[] = [];
    
    paths.forEach(path => {
      const complexity = this.calculatePathComplexity(path.d);
      if (complexity > this.options.complexityThreshold) {
        // Split complex path into simpler segments
        const segments = this.splitPathIntoSegments(path);
        result.push(...segments);
      } else {
        result.push(path);
      }
    });
    
    return result;
  }

  private splitPathIntoSegments(path: SVGPath): SVGPath[] {
    // Simplified path splitting - in a real implementation, you'd use more sophisticated algorithms
    const commands = path.d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    const segments: SVGPath[] = [];
    
    let currentSegment = '';
    let segmentCount = 0;
    
    commands.forEach((command, index) => {
      currentSegment += command;
      segmentCount++;
      
      if (segmentCount >= 10 || index === commands.length - 1) {
        segments.push({
          ...path,
          id: `${path.id}-segment-${segments.length}`,
          d: currentSegment,
        });
        currentSegment = '';
        segmentCount = 0;
      }
    });
    
    return segments.length > 1 ? segments : [path];
  }

  private interpolateTransform(
    sourceTransform: string,
    targetTransform: string,
    progress: number
  ): string {
    // Simplified transform interpolation
    // In a full implementation, you'd parse and interpolate individual transform functions
    try {
      const sourceInterpolator = interpolate(sourceTransform, targetTransform);
      return sourceInterpolator(progress);
    } catch (_error) {
      return progress < 0.5 ? sourceTransform : targetTransform;
    }
  }

  private generateGroupSVG(group: SVGGroup): string {
    const attrs = [
      `id="${group.id}"`,
      group.transform ? `transform="${group.transform}"` : '',
      group.opacity !== undefined && group.opacity !== 1 ? `opacity="${group.opacity}"` : '',
      group.clipPath ? `clip-path="${group.clipPath}"` : '',
      group.mask ? `mask="${group.mask}"` : '',
    ].filter(Boolean).join(' ');

    const pathElements = group.paths.map(path => `  ${this.generatePathSVG(path)}`).join('\n');

    return `<g ${attrs}>
${pathElements}
</g>`;
  }

  private generatePathSVG(path: SVGPath): string {
    const attrs = [
      `id="${path.id}"`,
      `d="${path.d}"`,
      path.fill ? `fill="${path.fill}"` : '',
      path.stroke ? `stroke="${path.stroke}"` : '',
      path.strokeWidth ? `stroke-width="${path.strokeWidth}"` : '',
      path.opacity !== undefined && path.opacity !== 1 ? `opacity="${path.opacity}"` : '',
      path.transform ? `transform="${path.transform}"` : '',
      path.fillRule ? `fill-rule="${path.fillRule}"` : '',
      path.strokeLinecap ? `stroke-linecap="${path.strokeLinecap}"` : '',
      path.strokeLinejoin ? `stroke-linejoin="${path.strokeLinejoin}"` : '',
      path.strokeDasharray ? `stroke-dasharray="${path.strokeDasharray}"` : '',
      path.strokeDashoffset ? `stroke-dashoffset="${path.strokeDashoffset}"` : '',
      path.pathLength ? `pathLength="${path.pathLength}"` : '',
    ].filter(Boolean).join(' ');

    return `<path ${attrs} />`;
  }
}

// Export singleton instance
export const multiPathProcessor = new MultiPathProcessor();

// Utility functions
export function createMultiPathMorphOptions(overrides: Partial<MultiPathMorphOptions> = {}): MultiPathMorphOptions {
  return {
    groupMatching: 'automatic',
    pathMatching: 'similarity',
    preserveGroupStructure: true,
    interpolateTransforms: true,
    handleMissingPaths: 'fade',
    complexityThreshold: 100,
    maxPathsPerGroup: 50,
    ...overrides,
  };
}
