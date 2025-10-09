export interface ExportOptions {
  format: 'svg' | 'css' | 'smil' | 'json';
  resolution: 1 | 2 | 4;
  optimize: boolean;
  includeAnimation: boolean;
  duration: number;
  easing: string;
  loop: boolean;
  filename?: string;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ExportHistory {
  id: string;
  timestamp: number;
  options: ExportOptions;
  filename: string;
  size: number;
}

export class ExportSystem {
  private history: ExportHistory[] = [];
  private readonly maxHistorySize = 50;

  constructor() {
    this.loadHistory();
  }

  /**
   * Export SVG morph animation in various formats
   */
  async exportAnimation(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    let content: string;
    let mimeType: string;
    let filename: string;

    // Optimize SVGs if requested
    const optimizedSourceSVG = options.optimize ? await this.optimizeSVG(sourceSVG) : sourceSVG;
    const optimizedTargetSVG = options.optimize ? await this.optimizeSVG(targetSVG) : targetSVG;

    switch (options.format) {
      case 'svg':
        content = await this.exportSVGFormat(optimizedSourceSVG, optimizedTargetSVG, options);
        mimeType = 'image/svg+xml';
        filename = options.filename || `morph-animation.svg`;
        break;
      
      case 'css':
        content = await this.exportCSSFormat(optimizedSourceSVG, optimizedTargetSVG, options);
        mimeType = 'text/css';
        filename = options.filename || `morph-animation.css`;
        break;
      
      case 'smil':
        content = await this.exportSMILFormat(optimizedSourceSVG, optimizedTargetSVG, options);
        mimeType = 'image/svg+xml';
        filename = options.filename || `morph-animation-smil.svg`;
        break;
      
      case 'json':
        content = await this.exportJSONFormat(optimizedSourceSVG, optimizedTargetSVG, options);
        mimeType = 'application/json';
        filename = options.filename || `morph-data.json`;
        break;
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Apply resolution scaling if needed
    if (options.resolution > 1 && options.format === 'svg') {
      content = this.scaleResolution(content, options.resolution);
    }

    const result: ExportResult = {
      content,
      filename,
      mimeType,
      size: new Blob([content]).size,
    };

    // Add to history
    this.addToHistory(options, result);

    return result;
  }

  /**
   * Export multiple formats at once
   */
  async batchExport(
    sourceSVG: string,
    targetSVG: string,
    formats: ExportOptions[]
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const options of formats) {
      try {
        const result = await this.exportAnimation(sourceSVG, targetSVG, options);
        results.push(result);
      } catch (error) {
        console.error(`Failed to export format ${options.format}:`, error);
      }
    }

    return results;
  }

  /**
   * Download exported content
   */
  downloadResult(result: ExportResult): void {
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get export history
   */
  getHistory(): ExportHistory[] {
    return [...this.history].reverse(); // Most recent first
  }

  /**
   * Clear export history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  private async exportSVGFormat(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<string> {
    if (!options.includeAnimation) {
      return sourceSVG;
    }

    // Create animated SVG with CSS animations
    const animationCSS = this.generateCSSAnimation(options);
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <defs>
          <style>
            ${animationCSS}
          </style>
        </defs>
        <g class="morph-container">
          <g class="source-svg" opacity="1">
            ${this.extractSVGContent(sourceSVG)}
          </g>
          <g class="target-svg" opacity="0">
            ${this.extractSVGContent(targetSVG)}
          </g>
        </g>
      </svg>
    `.trim();
  }

  private async exportCSSFormat(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<string> {
    const animationCSS = this.generateCSSAnimation(options);
    
    return `
/* SVG Morph Animation CSS */
.morph-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.source-svg,
.target-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

${animationCSS}

/* Usage: Apply .morph-container class to your SVG container */
    `.trim();
  }

  private async exportSMILFormat(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<string> {
    const duration = `${options.duration}s`;
    const repeatCount = options.loop ? 'indefinite' : '1';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <g>
          <g opacity="1">
            <animateTransform
              attributeName="opacity"
              type="opacity"
              values="1;0;1"
              dur="${duration}"
              repeatCount="${repeatCount}"
            />
            ${this.extractSVGContent(sourceSVG)}
          </g>
          <g opacity="0">
            <animateTransform
              attributeName="opacity"
              type="opacity"
              values="0;1;0"
              dur="${duration}"
              repeatCount="${repeatCount}"
            />
            ${this.extractSVGContent(targetSVG)}
          </g>
        </g>
      </svg>
    `.trim();
  }

  private async exportJSONFormat(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<string> {
    const data = {
      version: '1.0',
      type: 'svg-morph-animation',
      options: {
        duration: options.duration,
        easing: options.easing,
        loop: options.loop,
        resolution: options.resolution,
      },
      source: {
        svg: sourceSVG,
        optimized: options.optimize,
      },
      target: {
        svg: targetSVG,
        optimized: options.optimize,
      },
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(data, null, 2);
  }

  private generateCSSAnimation(options: ExportOptions): string {
    const duration = `${options.duration}s`;
    const easing = this.convertEasingToCSSFunction(options.easing);
    const iteration = options.loop ? 'infinite' : '1';

    return `
@keyframes morphSourceOut {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes morphTargetIn {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 1; }
}

.source-svg {
  animation: morphSourceOut ${duration} ${easing} ${iteration};
}

.target-svg {
  animation: morphTargetIn ${duration} ${easing} ${iteration};
}
    `.trim();
  }

  private convertEasingToCSSFunction(easing: string): string {
    const easingMap: Record<string, string> = {
      'linear': 'linear',
      'easeIn': 'ease-in',
      'easeOut': 'ease-out',
      'easeInOut': 'ease-in-out',
      'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    };

    return easingMap[easing] || 'ease-in-out';
  }

  private extractSVGContent(svgString: string): string {
    // Extract content between <svg> tags
    const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    return match ? match[1] : svgString;
  }

  private scaleResolution(svgContent: string, scale: number): string {
    // Scale SVG dimensions and viewBox
    return svgContent.replace(
      /viewBox="([^"]*?)"/g,
      (match, viewBox) => {
        const values = viewBox.split(' ').map((v: string) => parseFloat(v));
        if (values.length === 4) {
          values[2] *= scale; // width
          values[3] *= scale; // height
          return `viewBox="${values.join(' ')}"`;
        }
        return match;
      }
    ).replace(
      /(width|height)="([^"]*?)"/g,
      (match, attr, value) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          return `${attr}="${numValue * scale}"`;
        }
        return match;
      }
    );
  }

  private async optimizeSVG(svgContent: string): Promise<string> {
    // Basic SVG optimization (in a real implementation, you'd use SVGO)
    return svgContent
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s*=\s*/g, '=') // Remove spaces around equals
      .replace(/;\s*/g, ';') // Normalize semicolons
      .trim();
  }

  private addToHistory(options: ExportOptions, result: ExportResult): void {
    const historyItem: ExportHistory = {
      id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      options: { ...options },
      filename: result.filename,
      size: result.size,
    };

    this.history.push(historyItem);

    // Keep only the most recent exports
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    this.saveHistory();
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('svg-morph-export-history');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load export history:', error);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem('svg-morph-export-history', JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to save export history:', error);
    }
  }
}

// Utility functions for easy access
export const exportSystem = new ExportSystem();

export function createExportOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'svg',
    resolution: 1,
    optimize: true,
    includeAnimation: true,
    duration: 2,
    easing: 'easeInOut',
    loop: false,
    ...overrides,
  };
}
