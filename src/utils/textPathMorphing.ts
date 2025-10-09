import { interpolate } from 'd3-interpolate';

export interface TextPathElement {
  id: string;
  text: string;
  pathId: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  startOffset?: number;
  textLength?: number;
  lengthAdjust?: 'spacing' | 'spacingAndGlyphs';
  method?: 'align' | 'stretch';
  spacing?: 'auto' | 'exact';
}

export interface PathDefinition {
  id: string;
  d: string;
  length: number;
}

export interface TextMorphOptions {
  morphText: boolean;
  morphPath: boolean;
  morphTypography: boolean;
  preserveReadability: boolean;
  animateLetterSpacing: boolean;
  animateWordSpacing: boolean;
  textTransitionMethod: 'fade' | 'typewriter' | 'slide' | 'morph';
  pathTransitionMethod: 'direct' | 'bezier' | 'arc';
}

export class TextPathMorpher {
  private options: TextMorphOptions;

  constructor(options: Partial<TextMorphOptions> = {}) {
    this.options = {
      morphText: true,
      morphPath: true,
      morphTypography: true,
      preserveReadability: true,
      animateLetterSpacing: true,
      animateWordSpacing: true,
      textTransitionMethod: 'morph',
      pathTransitionMethod: 'bezier',
      ...options,
    };
  }

  /**
   * Extract text paths from SVG content
   */
  extractTextPaths(svgContent: string): { textPaths: TextPathElement[]; paths: PathDefinition[] } {
    const textPaths: TextPathElement[] = [];
    const paths: PathDefinition[] = [];
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // Extract path definitions
    const pathElements = doc.querySelectorAll('path');
    pathElements.forEach(path => {
      const id = path.id || `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const d = path.getAttribute('d') || '';
      
      if (d) {
        paths.push({
          id,
          d,
          length: this.calculatePathLength(d),
        });
      }
    });

    // Extract textPath elements
    const textPathElements = doc.querySelectorAll('textPath');
    textPathElements.forEach(textPath => {
      const parentText = textPath.closest('text');
      if (!parentText) return;

      const id = textPath.id || `textpath-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pathId = textPath.getAttribute('href') || textPath.getAttribute('xlink:href') || '';
      
      textPaths.push({
        id,
        text: textPath.textContent || '',
        pathId: pathId.replace('#', ''),
        fontSize: parseFloat(parentText.getAttribute('font-size') || '16'),
        fontFamily: parentText.getAttribute('font-family') || 'sans-serif',
        fontWeight: parentText.getAttribute('font-weight') || 'normal',
        fill: parentText.getAttribute('fill') || '#000000',
        stroke: parentText.getAttribute('stroke') || undefined,
        strokeWidth: parseFloat(parentText.getAttribute('stroke-width') || '0') || undefined,
        opacity: parseFloat(parentText.getAttribute('opacity') || '1'),
        letterSpacing: parseFloat(parentText.getAttribute('letter-spacing') || '0') || undefined,
        wordSpacing: parseFloat(parentText.getAttribute('word-spacing') || '0') || undefined,
        startOffset: parseFloat(textPath.getAttribute('startOffset') || '0') || undefined,
        textLength: parseFloat(textPath.getAttribute('textLength') || '0') || undefined,
        lengthAdjust: (textPath.getAttribute('lengthAdjust') as any) || undefined,
        method: (textPath.getAttribute('method') as any) || undefined,
        spacing: (textPath.getAttribute('spacing') as any) || undefined,
      });
    });

    return { textPaths, paths };
  }

  /**
   * Create morphed text paths at specific progress
   */
  morphTextPaths(
    sourceData: { textPaths: TextPathElement[]; paths: PathDefinition[] },
    targetData: { textPaths: TextPathElement[]; paths: PathDefinition[] },
    progress: number
  ): { textPaths: TextPathElement[]; paths: PathDefinition[] } {
    const morphedTextPaths: TextPathElement[] = [];
    const morphedPaths: PathDefinition[] = [];

    // Match and morph paths
    const pathPairs = this.matchPaths(sourceData.paths, targetData.paths);
    pathPairs.forEach(({ source, target, id }) => {
      if (source && target) {
        morphedPaths.push(this.interpolatePaths(source, target, progress, id));
      } else if (source) {
        morphedPaths.push({ ...source, id });
      } else if (target) {
        morphedPaths.push({ ...target, id });
      }
    });

    // Match and morph text paths
    const textPathPairs = this.matchTextPaths(sourceData.textPaths, targetData.textPaths);
    textPathPairs.forEach(({ source, target, id }) => {
      if (source && target) {
        morphedTextPaths.push(this.interpolateTextPaths(source, target, progress, id));
      } else if (source) {
        const fadedTextPath = { ...source, id };
        fadedTextPath.opacity = (fadedTextPath.opacity || 1) * (1 - progress);
        morphedTextPaths.push(fadedTextPath);
      } else if (target) {
        const fadedTextPath = { ...target, id };
        fadedTextPath.opacity = (fadedTextPath.opacity || 1) * progress;
        morphedTextPaths.push(fadedTextPath);
      }
    });

    return { textPaths: morphedTextPaths, paths: morphedPaths };
  }

  /**
   * Generate SVG text path elements
   */
  generateTextPathSVG(data: { textPaths: TextPathElement[]; paths: PathDefinition[] }): string {
    const pathDefs = data.paths.map(path => 
      `  <path id="${path.id}" d="${path.d}" />`
    ).join('\n');

    const textElements = data.textPaths.map(textPath => {
      const textAttrs = [
        `font-size="${textPath.fontSize}"`,
        `font-family="${textPath.fontFamily}"`,
        `font-weight="${textPath.fontWeight}"`,
        `fill="${textPath.fill}"`,
        textPath.stroke ? `stroke="${textPath.stroke}"` : '',
        textPath.strokeWidth ? `stroke-width="${textPath.strokeWidth}"` : '',
        textPath.opacity !== undefined ? `opacity="${textPath.opacity}"` : '',
        textPath.letterSpacing ? `letter-spacing="${textPath.letterSpacing}"` : '',
        textPath.wordSpacing ? `word-spacing="${textPath.wordSpacing}"` : '',
      ].filter(Boolean).join(' ');

      const textPathAttrs = [
        `href="#${textPath.pathId}"`,
        textPath.startOffset ? `startOffset="${textPath.startOffset}"` : '',
        textPath.textLength ? `textLength="${textPath.textLength}"` : '',
        textPath.lengthAdjust ? `lengthAdjust="${textPath.lengthAdjust}"` : '',
        textPath.method ? `method="${textPath.method}"` : '',
        textPath.spacing ? `spacing="${textPath.spacing}"` : '',
      ].filter(Boolean).join(' ');

      return `  <text ${textAttrs}>
    <textPath id="${textPath.id}" ${textPathAttrs}>${textPath.text}</textPath>
  </text>`;
    }).join('\n');

    return `<defs>
${pathDefs}
</defs>
${textElements}`;
  }

  /**
   * Apply text path morphing to SVG content
   */
  applyTextPathMorphing(
    sourceSVG: string,
    targetSVG: string,
    progress: number
  ): string {
    const sourceData = this.extractTextPaths(sourceSVG);
    const targetData = this.extractTextPaths(targetSVG);
    
    if (sourceData.textPaths.length === 0 && targetData.textPaths.length === 0) {
      return sourceSVG; // No text paths to morph
    }

    const morphedData = this.morphTextPaths(sourceData, targetData, progress);
    const textPathSVG = this.generateTextPathSVG(morphedData);
    
    // Replace or add text path elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceSVG, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return sourceSVG;

    // Remove existing text paths and related paths
    const existingTextPaths = svgElement.querySelectorAll('textPath');
    existingTextPaths.forEach(el => {
      const parentText = el.closest('text');
      if (parentText) parentText.remove();
    });

    // Remove path definitions that were used by text paths
    const existingPaths = svgElement.querySelectorAll('path');
    existingPaths.forEach(path => {
      if (sourceData.paths.some(p => p.id === path.id) || targetData.paths.some(p => p.id === path.id)) {
        path.remove();
      }
    });

    // Add new text path elements
    if (textPathSVG) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = textPathSVG;
      
      const defsContent = tempDiv.querySelector('defs');
      if (defsContent) {
        let defsElement = svgElement.querySelector('defs');
        if (!defsElement) {
          defsElement = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svgElement.insertBefore(defsElement, svgElement.firstChild);
        }
        defsElement.innerHTML += defsContent.innerHTML;
      }

      const textElements = tempDiv.querySelectorAll('text');
      textElements.forEach(textEl => {
        svgElement.appendChild(doc.importNode(textEl, true));
      });
    }

    return new XMLSerializer().serializeToString(doc);
  }

  private calculatePathLength(pathData: string): number {
    // Simplified path length calculation
    // In a real implementation, you'd use a more accurate method
    const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
    let length = 0;
    let currentX = 0;
    let currentY = 0;

    commands.forEach(command => {
      const type = command[0];
      const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      
      switch (type.toLowerCase()) {
        case 'm':
        case 'l':
          if (coords.length >= 2) {
            const dx = coords[0] - (type === type.toLowerCase() ? 0 : currentX);
            const dy = coords[1] - (type === type.toLowerCase() ? 0 : currentY);
            length += Math.sqrt(dx * dx + dy * dy);
            currentX = type === type.toLowerCase() ? currentX + coords[0] : coords[0];
            currentY = type === type.toLowerCase() ? currentY + coords[1] : coords[1];
          }
          break;
        case 'c':
          if (coords.length >= 6) {
            // Approximate cubic bezier length
            const dx = coords[4] - (type === type.toLowerCase() ? 0 : currentX);
            const dy = coords[5] - (type === type.toLowerCase() ? 0 : currentY);
            length += Math.sqrt(dx * dx + dy * dy) * 1.2; // Rough approximation
            currentX = type === type.toLowerCase() ? currentX + coords[4] : coords[4];
            currentY = type === type.toLowerCase() ? currentY + coords[5] : coords[5];
          }
          break;
      }
    });

    return length;
  }

  private matchPaths(
    sourcePaths: PathDefinition[],
    targetPaths: PathDefinition[]
  ): Array<{ source?: PathDefinition; target?: PathDefinition; id: string }> {
    const pairs: Array<{ source?: PathDefinition; target?: PathDefinition; id: string }> = [];
    const usedTargets = new Set<number>();
    
    sourcePaths.forEach((source, sourceIndex) => {
      let bestMatch = -1;
      let bestScore = -1;
      
      targetPaths.forEach((target, targetIndex) => {
        if (usedTargets.has(targetIndex)) return;
        
        const score = this.calculatePathSimilarity(source, target);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = targetIndex;
        }
      });
      
      const id = `morph-path-${sourceIndex}`;
      if (bestMatch >= 0 && bestScore > 0.3) {
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

  private matchTextPaths(
    sourceTextPaths: TextPathElement[],
    targetTextPaths: TextPathElement[]
  ): Array<{ source?: TextPathElement; target?: TextPathElement; id: string }> {
    const pairs: Array<{ source?: TextPathElement; target?: TextPathElement; id: string }> = [];
    const usedTargets = new Set<number>();
    
    sourceTextPaths.forEach((source, sourceIndex) => {
      let bestMatch = -1;
      let bestScore = -1;
      
      targetTextPaths.forEach((target, targetIndex) => {
        if (usedTargets.has(targetIndex)) return;
        
        const score = this.calculateTextPathSimilarity(source, target);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = targetIndex;
        }
      });
      
      const id = `morph-textpath-${sourceIndex}`;
      if (bestMatch >= 0 && bestScore > 0.3) {
        usedTargets.add(bestMatch);
        pairs.push({
          source,
          target: targetTextPaths[bestMatch],
          id,
        });
      } else {
        pairs.push({ source, id });
      }
    });
    
    // Add unmatched target text paths
    targetTextPaths.forEach((target, targetIndex) => {
      if (!usedTargets.has(targetIndex)) {
        pairs.push({
          target,
          id: `morph-textpath-new-${targetIndex}`,
        });
      }
    });
    
    return pairs;
  }

  private calculatePathSimilarity(path1: PathDefinition, path2: PathDefinition): number {
    // Compare path lengths
    const lengthDiff = Math.abs(path1.length - path2.length);
    const maxLength = Math.max(path1.length, path2.length);
    const lengthSimilarity = maxLength > 0 ? 1 - (lengthDiff / maxLength) : 1;
    
    // Compare path complexity (number of commands)
    const commands1 = (path1.d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || []).length;
    const commands2 = (path2.d.match(/[MmLlHhVvCcSsQqTtAaZz]/g) || []).length;
    const commandDiff = Math.abs(commands1 - commands2);
    const maxCommands = Math.max(commands1, commands2);
    const complexitySimilarity = maxCommands > 0 ? 1 - (commandDiff / maxCommands) : 1;
    
    return (lengthSimilarity * 0.6) + (complexitySimilarity * 0.4);
  }

  private calculateTextPathSimilarity(textPath1: TextPathElement, textPath2: TextPathElement): number {
    let score = 0;
    
    // Text similarity (Levenshtein distance)
    const textSimilarity = this.calculateTextSimilarity(textPath1.text, textPath2.text);
    score += textSimilarity * 0.4;
    
    // Font similarity
    if (textPath1.fontFamily === textPath2.fontFamily) score += 0.2;
    if (textPath1.fontWeight === textPath2.fontWeight) score += 0.1;
    
    // Size similarity
    const sizeDiff = Math.abs(textPath1.fontSize - textPath2.fontSize);
    const maxSize = Math.max(textPath1.fontSize, textPath2.fontSize);
    const sizeSimilarity = maxSize > 0 ? 1 - (sizeDiff / maxSize) : 1;
    score += sizeSimilarity * 0.2;
    
    // Color similarity (simplified)
    if (textPath1.fill === textPath2.fill) score += 0.1;
    
    return Math.min(score, 1);
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1;
    if (text1.length === 0 || text2.length === 0) return 0;
    
    // Simplified Levenshtein distance
    const maxLength = Math.max(text1.length, text2.length);
    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private interpolatePaths(
    source: PathDefinition,
    target: PathDefinition,
    progress: number,
    id: string
  ): PathDefinition {
    if (this.options.pathTransitionMethod === 'direct') {
      // Simple path interpolation using d3-interpolate
      const pathInterpolator = interpolate(source.d, target.d);
      return {
        id,
        d: pathInterpolator(progress),
        length: interpolate(source.length, target.length)(progress),
      };
    } else {
      // For now, use direct interpolation
      // In a full implementation, you'd implement bezier or arc transitions
      const pathInterpolator = interpolate(source.d, target.d);
      return {
        id,
        d: pathInterpolator(progress),
        length: interpolate(source.length, target.length)(progress),
      };
    }
  }

  private interpolateTextPaths(
    source: TextPathElement,
    target: TextPathElement,
    progress: number,
    id: string
  ): TextPathElement {
    const morphed: TextPathElement = {
      id,
      text: this.interpolateText(source.text, target.text, progress),
      pathId: source.pathId, // Use source path ID (paths are handled separately)
      fontSize: interpolate(source.fontSize, target.fontSize)(progress),
      fontFamily: progress < 0.5 ? source.fontFamily : target.fontFamily,
      fontWeight: progress < 0.5 ? source.fontWeight : target.fontWeight,
      fill: interpolate(source.fill, target.fill)(progress),
      opacity: interpolate(source.opacity || 1, target.opacity || 1)(progress),
    };

    // Interpolate optional properties
    if (source.stroke || target.stroke) {
      morphed.stroke = interpolate(source.stroke || source.fill, target.stroke || target.fill)(progress);
    }
    
    if (source.strokeWidth !== undefined || target.strokeWidth !== undefined) {
      morphed.strokeWidth = interpolate(source.strokeWidth || 0, target.strokeWidth || 0)(progress);
    }
    
    if (this.options.animateLetterSpacing && (source.letterSpacing !== undefined || target.letterSpacing !== undefined)) {
      morphed.letterSpacing = interpolate(source.letterSpacing || 0, target.letterSpacing || 0)(progress);
    }
    
    if (this.options.animateWordSpacing && (source.wordSpacing !== undefined || target.wordSpacing !== undefined)) {
      morphed.wordSpacing = interpolate(source.wordSpacing || 0, target.wordSpacing || 0)(progress);
    }
    
    if (source.startOffset !== undefined || target.startOffset !== undefined) {
      morphed.startOffset = interpolate(source.startOffset || 0, target.startOffset || 0)(progress);
    }

    return morphed;
  }

  private interpolateText(sourceText: string, targetText: string, progress: number): string {
    switch (this.options.textTransitionMethod) {
      case 'fade':
        return progress < 0.5 ? sourceText : targetText;
      
      case 'typewriter':
        if (progress < 0.5) {
          // Type out source text backwards
          const chars = Math.floor((1 - progress * 2) * sourceText.length);
          return sourceText.substring(0, chars);
        } else {
          // Type in target text
          const chars = Math.floor((progress - 0.5) * 2 * targetText.length);
          return targetText.substring(0, chars);
        }
      
      case 'slide':
        // Simple character-by-character transition
        const maxLength = Math.max(sourceText.length, targetText.length);
        let result = '';
        for (let i = 0; i < maxLength; i++) {
          const sourceChar = sourceText[i] || '';
          const targetChar = targetText[i] || '';
          result += progress < 0.5 ? sourceChar : targetChar;
        }
        return result;
      
      case 'morph':
      default:
        // Character-by-character morphing with smooth transition
        const minLength = Math.min(sourceText.length, targetText.length);
        const maxLength = Math.max(sourceText.length, targetText.length);
        let result = '';
        
        for (let i = 0; i < maxLength; i++) {
          if (i < minLength) {
            // Morph existing characters
            const sourceChar = sourceText[i];
            const targetChar = targetText[i];
            if (sourceChar === targetChar) {
              result += sourceChar;
            } else {
              result += progress < 0.5 ? sourceChar : targetChar;
            }
          } else if (i < sourceText.length) {
            // Fade out extra source characters
            if (progress < 0.5) result += sourceText[i];
          } else {
            // Fade in extra target characters
            if (progress > 0.5) result += targetText[i];
          }
        }
        
        return result;
    }
  }
}

// Export singleton instance
export const textPathMorpher = new TextPathMorpher();

// Utility functions
export function createTextMorphOptions(overrides: Partial<TextMorphOptions> = {}): TextMorphOptions {
  return {
    morphText: true,
    morphPath: true,
    morphTypography: true,
    preserveReadability: true,
    animateLetterSpacing: true,
    animateWordSpacing: true,
    textTransitionMethod: 'morph',
    pathTransitionMethod: 'bezier',
    ...overrides,
  };
}
