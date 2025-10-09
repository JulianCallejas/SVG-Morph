import { interpolate } from 'd3-interpolate';

export interface GradientStop {
  offset: number;
  color: string;
  opacity?: number;
}

export interface SVGGradient {
  id: string;
  type: 'linear' | 'radial';
  stops: GradientStop[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  gradientTransform?: string;
}

export interface GradientMorphOptions {
  preserveStopCount: boolean;
  colorSpace: 'rgb' | 'hsl' | 'lab';
  interpolateOpacity: boolean;
  smoothTransition: boolean;
}

export class GradientMorpher {
  private options: GradientMorphOptions;

  constructor(options: Partial<GradientMorphOptions> = {}) {
    this.options = {
      preserveStopCount: true,
      colorSpace: 'rgb',
      interpolateOpacity: true,
      smoothTransition: true,
      ...options,
    };
  }

  /**
   * Extract gradients from SVG content
   */
  extractGradients(svgContent: string): SVGGradient[] {
    const gradients: SVGGradient[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    
    // Extract linear gradients
    const linearGradients = doc.querySelectorAll('linearGradient');
    linearGradients.forEach(gradient => {
      const stops = this.extractStops(gradient);
      if (stops.length > 0) {
        gradients.push({
          id: gradient.id || `linear-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'linear',
          stops,
          x1: parseFloat(gradient.getAttribute('x1') || '0'),
          y1: parseFloat(gradient.getAttribute('y1') || '0'),
          x2: parseFloat(gradient.getAttribute('x2') || '1'),
          y2: parseFloat(gradient.getAttribute('y2') || '0'),
          gradientUnits: (gradient.getAttribute('gradientUnits') as any) || 'objectBoundingBox',
          gradientTransform: gradient.getAttribute('gradientTransform') || undefined,
        });
      }
    });

    // Extract radial gradients
    const radialGradients = doc.querySelectorAll('radialGradient');
    radialGradients.forEach(gradient => {
      const stops = this.extractStops(gradient);
      if (stops.length > 0) {
        gradients.push({
          id: gradient.id || `radial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'radial',
          stops,
          cx: parseFloat(gradient.getAttribute('cx') || '0.5'),
          cy: parseFloat(gradient.getAttribute('cy') || '0.5'),
          r: parseFloat(gradient.getAttribute('r') || '0.5'),
          fx: parseFloat(gradient.getAttribute('fx') || gradient.getAttribute('cx') || '0.5'),
          fy: parseFloat(gradient.getAttribute('fy') || gradient.getAttribute('cy') || '0.5'),
          gradientUnits: (gradient.getAttribute('gradientUnits') as any) || 'objectBoundingBox',
          gradientTransform: gradient.getAttribute('gradientTransform') || undefined,
        });
      }
    });

    return gradients;
  }

  /**
   * Create morphed gradient at specific progress
   */
  morphGradients(
    sourceGradients: SVGGradient[],
    targetGradients: SVGGradient[],
    progress: number
  ): SVGGradient[] {
    const morphedGradients: SVGGradient[] = [];
    
    // Match gradients by type and position
    const gradientPairs = this.matchGradients(sourceGradients, targetGradients);
    
    gradientPairs.forEach(({ source, target, id }) => {
      if (source && target) {
        // Morph between two gradients
        morphedGradients.push(this.interpolateGradients(source, target, progress, id));
      } else if (source) {
        // Fade out source gradient
        const fadedGradient = { ...source, id };
        fadedGradient.stops = fadedGradient.stops.map(stop => ({
          ...stop,
          opacity: (stop.opacity || 1) * (1 - progress),
        }));
        morphedGradients.push(fadedGradient);
      } else if (target) {
        // Fade in target gradient
        const fadedGradient = { ...target, id };
        fadedGradient.stops = fadedGradient.stops.map(stop => ({
          ...stop,
          opacity: (stop.opacity || 1) * progress,
        }));
        morphedGradients.push(fadedGradient);
      }
    });

    return morphedGradients;
  }

  /**
   * Generate SVG gradient definitions
   */
  generateGradientDefs(gradients: SVGGradient[]): string {
    const defs = gradients.map(gradient => {
      const stops = gradient.stops.map(stop => 
        `<stop offset="${stop.offset * 100}%" stop-color="${stop.color}"${
          stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : ''
        } />`
      ).join('\n    ');

      if (gradient.type === 'linear') {
        return `  <linearGradient id="${gradient.id}"${
          gradient.x1 !== undefined ? ` x1="${gradient.x1}"` : ''
        }${
          gradient.y1 !== undefined ? ` y1="${gradient.y1}"` : ''
        }${
          gradient.x2 !== undefined ? ` x2="${gradient.x2}"` : ''
        }${
          gradient.y2 !== undefined ? ` y2="${gradient.y2}"` : ''
        }${
          gradient.gradientUnits ? ` gradientUnits="${gradient.gradientUnits}"` : ''
        }${
          gradient.gradientTransform ? ` gradientTransform="${gradient.gradientTransform}"` : ''
        }>
    ${stops}
  </linearGradient>`;
      } else {
        return `  <radialGradient id="${gradient.id}"${
          gradient.cx !== undefined ? ` cx="${gradient.cx}"` : ''
        }${
          gradient.cy !== undefined ? ` cy="${gradient.cy}"` : ''
        }${
          gradient.r !== undefined ? ` r="${gradient.r}"` : ''
        }${
          gradient.fx !== undefined ? ` fx="${gradient.fx}"` : ''
        }${
          gradient.fy !== undefined ? ` fy="${gradient.fy}"` : ''
        }${
          gradient.gradientUnits ? ` gradientUnits="${gradient.gradientUnits}"` : ''
        }${
          gradient.gradientTransform ? ` gradientTransform="${gradient.gradientTransform}"` : ''
        }>
    ${stops}
  </radialGradient>`;
      }
    }).join('\n');

    return defs ? `<defs>\n${defs}\n</defs>` : '';
  }

  /**
   * Apply gradient morphing to SVG content
   */
  applyGradientMorphing(
    sourceSVG: string,
    targetSVG: string,
    progress: number
  ): string {
    const sourceGradients = this.extractGradients(sourceSVG);
    const targetGradients = this.extractGradients(targetSVG);
    
    if (sourceGradients.length === 0 && targetGradients.length === 0) {
      return sourceSVG; // No gradients to morph
    }

    const morphedGradients = this.morphGradients(sourceGradients, targetGradients, progress);
    const gradientDefs = this.generateGradientDefs(morphedGradients);
    
    // Replace or add gradient definitions
    const parser = new DOMParser();
    const doc = parser.parseFromString(sourceSVG, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) return sourceSVG;

    // Remove existing defs with gradients
    const existingDefs = svgElement.querySelector('defs');
    if (existingDefs) {
      const gradientElements = existingDefs.querySelectorAll('linearGradient, radialGradient');
      gradientElements.forEach(el => el.remove());
      
      if (existingDefs.children.length === 0) {
        existingDefs.remove();
      }
    }

    // Add new gradient definitions
    if (gradientDefs) {
      const defsElement = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defsElement.innerHTML = gradientDefs.replace('<defs>', '').replace('</defs>', '');
      svgElement.insertBefore(defsElement, svgElement.firstChild);
    }

    return new XMLSerializer().serializeToString(doc);
  }

  private extractStops(gradientElement: Element): GradientStop[] {
    const stops: GradientStop[] = [];
    const stopElements = gradientElement.querySelectorAll('stop');
    
    stopElements.forEach(stop => {
      const offset = parseFloat(stop.getAttribute('offset') || '0');
      const color = stop.getAttribute('stop-color') || '#000000';
      const opacity = stop.getAttribute('stop-opacity');
      
      stops.push({
        offset: offset > 1 ? offset / 100 : offset, // Handle percentage values
        color,
        opacity: opacity ? parseFloat(opacity) : undefined,
      });
    });

    return stops.sort((a, b) => a.offset - b.offset);
  }

  private matchGradients(
    sourceGradients: SVGGradient[],
    targetGradients: SVGGradient[]
  ): Array<{ source?: SVGGradient; target?: SVGGradient; id: string }> {
    const pairs: Array<{ source?: SVGGradient; target?: SVGGradient; id: string }> = [];
    const usedTargets = new Set<number>();
    
    // Match by type and similarity
    sourceGradients.forEach((source, sourceIndex) => {
      let bestMatch = -1;
      let bestScore = -1;
      
      targetGradients.forEach((target, targetIndex) => {
        if (usedTargets.has(targetIndex)) return;
        
        const score = this.calculateGradientSimilarity(source, target);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = targetIndex;
        }
      });
      
      const id = `morph-gradient-${sourceIndex}`;
      if (bestMatch >= 0 && bestScore > 0.3) {
        usedTargets.add(bestMatch);
        pairs.push({
          source,
          target: targetGradients[bestMatch],
          id,
        });
      } else {
        pairs.push({ source, id });
      }
    });
    
    // Add unmatched target gradients
    targetGradients.forEach((target, targetIndex) => {
      if (!usedTargets.has(targetIndex)) {
        pairs.push({
          target,
          id: `morph-gradient-new-${targetIndex}`,
        });
      }
    });
    
    return pairs;
  }

  private calculateGradientSimilarity(gradient1: SVGGradient, gradient2: SVGGradient): number {
    if (gradient1.type !== gradient2.type) return 0;
    
    let score = 0.5; // Base score for same type
    
    // Compare stop count
    const stopCountDiff = Math.abs(gradient1.stops.length - gradient2.stops.length);
    score += (1 - stopCountDiff / Math.max(gradient1.stops.length, gradient2.stops.length)) * 0.3;
    
    // Compare colors (simplified)
    const minStops = Math.min(gradient1.stops.length, gradient2.stops.length);
    if (minStops > 0) {
      let colorSimilarity = 0;
      for (let i = 0; i < minStops; i++) {
        const color1 = gradient1.stops[i].color;
        const color2 = gradient2.stops[i].color;
        if (color1 === color2) colorSimilarity += 1;
      }
      score += (colorSimilarity / minStops) * 0.2;
    }
    
    return Math.min(score, 1);
  }

  private interpolateGradients(
    source: SVGGradient,
    target: SVGGradient,
    progress: number,
    id: string
  ): SVGGradient {
    const morphed: SVGGradient = {
      id,
      type: source.type,
      stops: [],
    };

    // Interpolate gradient properties
    if (source.type === 'linear' && target.type === 'linear') {
      morphed.x1 = interpolate(source.x1 || 0, target.x1 || 0)(progress);
      morphed.y1 = interpolate(source.y1 || 0, target.y1 || 0)(progress);
      morphed.x2 = interpolate(source.x2 || 1, target.x2 || 1)(progress);
      morphed.y2 = interpolate(source.y2 || 0, target.y2 || 0)(progress);
    } else if (source.type === 'radial' && target.type === 'radial') {
      morphed.cx = interpolate(source.cx || 0.5, target.cx || 0.5)(progress);
      morphed.cy = interpolate(source.cy || 0.5, target.cy || 0.5)(progress);
      morphed.r = interpolate(source.r || 0.5, target.r || 0.5)(progress);
      morphed.fx = interpolate(source.fx || source.cx || 0.5, target.fx || target.cx || 0.5)(progress);
      morphed.fy = interpolate(source.fy || source.cy || 0.5, target.fy || target.cy || 0.5)(progress);
    }

    // Interpolate gradient stops
    morphed.stops = this.interpolateGradientStops(source.stops, target.stops, progress);
    
    // Use source gradient units and transform (could be enhanced to interpolate these too)
    morphed.gradientUnits = source.gradientUnits;
    morphed.gradientTransform = source.gradientTransform;

    return morphed;
  }

  private interpolateGradientStops(
    sourceStops: GradientStop[],
    targetStops: GradientStop[],
    progress: number
  ): GradientStop[] {
    if (this.options.preserveStopCount) {
      return this.interpolatePreserveStops(sourceStops, targetStops, progress);
    } else {
      return this.interpolateAdaptiveStops(sourceStops, targetStops, progress);
    }
  }

  private interpolatePreserveStops(
    sourceStops: GradientStop[],
    targetStops: GradientStop[],
    progress: number
  ): GradientStop[] {
    const maxStops = Math.max(sourceStops.length, targetStops.length);
    const morphedStops: GradientStop[] = [];

    for (let i = 0; i < maxStops; i++) {
      const sourceStop = sourceStops[i] || sourceStops[sourceStops.length - 1];
      const targetStop = targetStops[i] || targetStops[targetStops.length - 1];

      const colorInterpolator = interpolate(sourceStop.color, targetStop.color);
      const offsetInterpolator = interpolate(sourceStop.offset, targetStop.offset);
      
      const morphedStop: GradientStop = {
        offset: offsetInterpolator(progress),
        color: colorInterpolator(progress),
      };

      if (this.options.interpolateOpacity && (sourceStop.opacity !== undefined || targetStop.opacity !== undefined)) {
        const sourceOpacity = sourceStop.opacity ?? 1;
        const targetOpacity = targetStop.opacity ?? 1;
        morphedStop.opacity = interpolate(sourceOpacity, targetOpacity)(progress);
      }

      morphedStops.push(morphedStop);
    }

    return morphedStops.sort((a, b) => a.offset - b.offset);
  }

  private interpolateAdaptiveStops(
    sourceStops: GradientStop[],
    targetStops: GradientStop[],
    progress: number
  ): GradientStop[] {
    // For adaptive stops, we create a unified set of stop positions
    // and interpolate colors at those positions
    const allOffsets = new Set<number>();
    
    sourceStops.forEach(stop => allOffsets.add(stop.offset));
    targetStops.forEach(stop => allOffsets.add(stop.offset));
    
    const sortedOffsets = Array.from(allOffsets).sort((a, b) => a - b);
    const morphedStops: GradientStop[] = [];

    sortedOffsets.forEach(offset => {
      const sourceColor = this.getColorAtOffset(sourceStops, offset);
      const targetColor = this.getColorAtOffset(targetStops, offset);
      
      const colorInterpolator = interpolate(sourceColor.color, targetColor.color);
      
      const morphedStop: GradientStop = {
        offset,
        color: colorInterpolator(progress),
      };

      if (this.options.interpolateOpacity) {
        const sourceOpacity = sourceColor.opacity ?? 1;
        const targetOpacity = targetColor.opacity ?? 1;
        morphedStop.opacity = interpolate(sourceOpacity, targetOpacity)(progress);
      }

      morphedStops.push(morphedStop);
    });

    return morphedStops;
  }

  private getColorAtOffset(stops: GradientStop[], offset: number): { color: string; opacity?: number } {
    if (stops.length === 0) return { color: '#000000' };
    
    // Find the exact stop or interpolate between adjacent stops
    const exactStop = stops.find(stop => stop.offset === offset);
    if (exactStop) return { color: exactStop.color, opacity: exactStop.opacity };
    
    // Find adjacent stops
    let beforeStop = stops[0];
    let afterStop = stops[stops.length - 1];
    
    for (let i = 0; i < stops.length - 1; i++) {
      if (stops[i].offset <= offset && stops[i + 1].offset >= offset) {
        beforeStop = stops[i];
        afterStop = stops[i + 1];
        break;
      }
    }
    
    if (beforeStop.offset === afterStop.offset) {
      return { color: beforeStop.color, opacity: beforeStop.opacity };
    }
    
    // Interpolate between adjacent stops
    const t = (offset - beforeStop.offset) / (afterStop.offset - beforeStop.offset);
    const colorInterpolator = interpolate(beforeStop.color, afterStop.color);
    
    const result: { color: string; opacity?: number } = {
      color: colorInterpolator(t),
    };
    
    if (beforeStop.opacity !== undefined || afterStop.opacity !== undefined) {
      const beforeOpacity = beforeStop.opacity ?? 1;
      const afterOpacity = afterStop.opacity ?? 1;
      result.opacity = interpolate(beforeOpacity, afterOpacity)(t);
    }
    
    return result;
  }
}

// Export singleton instance
export const gradientMorpher = new GradientMorpher();

// Utility functions
export function createGradientMorphOptions(overrides: Partial<GradientMorphOptions> = {}): GradientMorphOptions {
  return {
    preserveStopCount: true,
    colorSpace: 'rgb',
    interpolateOpacity: true,
    smoothTransition: true,
    ...overrides,
  };
}
