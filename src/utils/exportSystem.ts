import { SVGData } from '../workers/pathProcessor';
import { videoExporter, VideoExportOptions, VideoExportProgress } from './videoExport';
import { workerManager } from './workerManager';
import { NodeMatch } from './nodeMatching';

export interface ExportOptions {
  format: 'svg' | 'css' | 'smil' | 'json' | 'javascript' | 'video';
  resolution: 1 | 2 | 4;
  optimize: boolean;
  includeAnimation: boolean;
  duration: number;
  easing: string;
  loop: boolean;
  filename?: string;
  nodeMatches?: NodeMatch[];
  useManualMatching?: boolean;
}

export interface JavaScriptExportOptions extends ExportOptions {
  format: 'javascript';
  library: 'vanilla' | 'gsap' | 'anime';
  includeLibraryImport: boolean;
  functionName: string;
  exportType: 'function' | 'class' | 'module';
  minified: boolean;
  includeTypeScript: boolean;
}

export interface VideoExportOptionsExtended extends ExportOptions {
  format: 'video';
  videoFormat: 'gif' | 'mp4' | 'webm';
  width: number;
  height: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  backgroundColor?: string;
}

export interface ExportResult {
  content: string | Blob;
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
    options: ExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<ExportResult> {
    let content: string | Blob;
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
      
      case 'javascript':
        content = await this.exportJavaScriptFormat(optimizedSourceSVG, optimizedTargetSVG, options as JavaScriptExportOptions);
        mimeType = 'text/javascript';
        filename = options.filename || `morph-animation.js`;
        break;
      
      case 'video':
        return await this.exportVideoFormat(optimizedSourceSVG, optimizedTargetSVG, options as VideoExportOptionsExtended, onProgress);
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    // Apply resolution scaling if needed
    if (options.resolution > 1 && options.format === 'svg') {
      content = this.scaleResolution(content as string, options.resolution);
    }

    const result: ExportResult = {
      content,
      filename,
      mimeType,
      size: content instanceof Blob ? content.size : new Blob([content as string]).size,
    };

    // Add to history
    this.addToHistory(options, result);

    return result;
  }

  /**
   * Export video format using the video export system
   */
  private async exportVideoFormat(
    sourceSVG: string,
    targetSVG: string,
    options: VideoExportOptionsExtended,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<ExportResult> {
    const videoOptions: VideoExportOptions = {
      format: options.videoFormat,
      width: options.width,
      height: options.height,
      fps: options.fps,
      duration: options.duration,
      quality: options.quality,
      loop: options.loop,
      backgroundColor: options.backgroundColor,
      filename: options.filename,
    };

    try {
      const videoBlob = await videoExporter.exportVideo(
        sourceSVG,
        targetSVG,
        videoOptions,
        onProgress
      );

      const mimeTypeMap = {
        gif: 'image/gif',
        mp4: 'video/mp4',
        webm: 'video/webm',
      };

      const extensionMap = {
        gif: 'gif',
        mp4: 'mp4',
        webm: 'webm',
      };

      const filename = options.filename || `morph-animation.${extensionMap[options.videoFormat]}`;
      const mimeType = mimeTypeMap[options.videoFormat];

      const result: ExportResult = {
        content: videoBlob,
        filename,
        mimeType,
        size: videoBlob.size,
      };

      this.addToHistory(options, result);
      return result;
    } catch (error) {
      console.error('Video export failed:', error);
      throw new Error(`Video export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download exported content
   */
  downloadResult(result: ExportResult): void {
    if (result.content instanceof Blob) {
      const url = URL.createObjectURL(result.content);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
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
  }

  // Enhanced implementations using proper path morphing
  private async exportSVGFormat(sourceSVG: string, targetSVG: string, options: ExportOptions): Promise<string> {
    if (!options.includeAnimation) {
      return sourceSVG;
    }
    // Use proper SMIL animation with path morphing
    return this.generateSVGWithSMILAnimation(sourceSVG, targetSVG, options);
  }

  private async exportCSSFormat(_sourceSVG: string, _targetSVG: string, options: ExportOptions): Promise<string> {
    const duration = `${options.duration}s`;
    const iteration = options.loop ? 'infinite' : '1';
    
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
  animation: morphSourceOut ${duration} ease-in-out ${iteration};
}

.target-svg {
  animation: morphTargetIn ${duration} ease-in-out ${iteration};
}
    `.trim();
  }

  private async exportSMILFormat(sourceSVG: string, targetSVG: string, options: ExportOptions): Promise<string> {
    return this.generateSVGWithSMILAnimation(sourceSVG, targetSVG, options);
  }

  private async exportJSONFormat(sourceSVG: string, targetSVG: string, options: ExportOptions): Promise<string> {
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

  private async exportJavaScriptFormat(sourceSVG: string, _targetSVG: string, options: JavaScriptExportOptions): Promise<string> {
    // Simplified JavaScript export
    return `
/**
 * SVG Morphing Animation Function
 * Generated by SVG-Morph
 */
function ${options.functionName}(containerId, userOptions = {}) {
  const defaultOptions = {
    duration: ${options.duration * 1000},
    easing: '${options.easing}',
    loop: ${options.loop}
  };
  
  const config = { ...defaultOptions, ...userOptions };
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  
  if (!container) {
    throw new Error('Container element not found');
  }
  
  // Basic morphing implementation
  container.innerHTML = \`${sourceSVG.replace(/`/g, '\\`')}\`;
  
  return {
    play: () => console.log('Animation started'),
    pause: () => console.log('Animation paused'),
    restart: () => console.log('Animation restarted'),
    destroy: () => container.innerHTML = ''
  };
}
    `.trim();
  }

  /**
   * Generate SVG with SMIL animation using proper path morphing
   */
  private async generateSVGWithSMILAnimation(sourceSVG: string, targetSVG: string, options: ExportOptions): Promise<string> {
    try {
      const duration = `${options.duration}s`;
      const repeatCount = options.loop ? 'indefinite' : '1';
      
      // Parse SVGs to get path data
      const sourceSVGData = await workerManager.parseSVG(sourceSVG);
      const targetSVGData = await workerManager.parseSVG(targetSVG);
      
      if (!sourceSVGData?.paths?.length || !targetSVGData?.paths?.length) {
        console.warn('No paths found in SVGs, falling back to opacity animation');
        return this.generateOpacityFallbackSVG(sourceSVG, targetSVG, options);
      }
      
      // Generate interpolated paths for smooth SMIL animation
      const startPath = sourceSVGData.paths[0].d;
      const endPath = targetSVGData.paths[0].d;
      
      // Create three keyframe paths for smooth animation (0, 0.5, 1)
      // Use manual node matches if available
      let midPath: string;
      if (options.nodeMatches && options.nodeMatches.length > 0) {
        console.log('SMIL Export - Using manual node matches:', options.nodeMatches.length, 'matches');
        midPath = await workerManager.interpolateWithMatches(startPath, endPath, 0.5, options.nodeMatches);
      } else {
        console.log('SMIL Export - Using default interpolation');
        midPath = await workerManager.interpolatePaths(startPath, endPath, 0.5);
      }
      
      console.log('SMIL Export - Path interpolation:', {
        startPath: startPath.substring(0, 50) + '...',
        midPath: midPath.substring(0, 50) + '...',
        endPath: endPath.substring(0, 50) + '...'
      });
      
      // Build the animated SVG
      let animatedSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sourceSVGData.viewBox || '0 0 400 400'}">`;
      
      // Add the morphing path
      animatedSVG += `<path d="${startPath}"`;
      
      // Handle fill properly - always add fill attribute to avoid browser defaults
      const sourceFill = sourceSVGData.paths[0].fill;
      if (sourceFill !== undefined) {
        animatedSVG += ` fill="${sourceFill}"`;
      } else {
        // Explicitly set fill to none if not defined to prevent black fill
        animatedSVG += ` fill="none"`;
      }
      
      // Add stroke if available
      const sourceStroke = sourceSVGData.paths[0].stroke;
      if (sourceStroke && sourceStroke !== 'none') {
        animatedSVG += ` stroke="${sourceStroke}"`;
      }
      
      // Add stroke-width if available
      if (sourceSVGData.paths[0].strokeWidth) {
        animatedSVG += ` stroke-width="${sourceSVGData.paths[0].strokeWidth}"`;
      }
      
      animatedSVG += '>';
      
      // Add path morphing animation
      animatedSVG += `
        <animate
          attributeName="d"
          values="${startPath};${midPath};${endPath}"
          dur="${duration}"
          repeatCount="${repeatCount}"
          calcMode="spline"
          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
          keyTimes="0;0.5;1"
        />`;
      
      // Add fill animation if colors are different
      if (sourceSVGData.paths[0].fill && targetSVGData.paths[0].fill && 
          sourceSVGData.paths[0].fill !== targetSVGData.paths[0].fill) {
        animatedSVG += `
        <animate
          attributeName="fill"
          values="${sourceSVGData.paths[0].fill};${targetSVGData.paths[0].fill}"
          dur="${duration}"
          repeatCount="${repeatCount}"
        />`;
      }
      
      // Add stroke-width animation if different
      if (sourceSVGData.paths[0].strokeWidth && targetSVGData.paths[0].strokeWidth && 
          sourceSVGData.paths[0].strokeWidth !== targetSVGData.paths[0].strokeWidth) {
        animatedSVG += `
        <animate
          attributeName="stroke-width"
          values="${sourceSVGData.paths[0].strokeWidth};${targetSVGData.paths[0].strokeWidth}"
          dur="${duration}"
          repeatCount="${repeatCount}"
        />`;
      }
      
      animatedSVG += '</path></svg>';
      
      console.log('SMIL Export - Generated SVG length:', animatedSVG.length);
      return animatedSVG;
      
    } catch (error) {
      console.error('SMIL generation failed:', error);
      return this.generateOpacityFallbackSVG(sourceSVG, targetSVG, options);
    }
  }
  
  /**
   * Fallback to opacity-based animation when path morphing fails
   */
  private generateOpacityFallbackSVG(sourceSVG: string, targetSVG: string, options: ExportOptions): string {
    const duration = `${options.duration}s`;
    const repeatCount = options.loop ? 'indefinite' : '1';

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <g>
          <g opacity="1">
            <animate
              attributeName="opacity"
              values="1;0;1"
              dur="${duration}"
              repeatCount="${repeatCount}"
            />
            ${this.extractSVGContent(sourceSVG)}
          </g>
          <g opacity="0">
            <animate
              attributeName="opacity"
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

  private extractSVGContent(svgString: string): string {
    const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    return match ? match[1] : svgString;
  }

  private scaleResolution(svgContent: string, scale: number): string {
    return svgContent.replace(
      /viewBox="([^"]*?)"/g,
      (match, viewBox) => {
        const values = viewBox.split(' ').map((v: string) => parseFloat(v));
        if (values.length === 4) {
          values[2] *= scale;
          values[3] *= scale;
          return `viewBox="${values.join(' ')}"`;
        }
        return match;
      }
    );
  }

  private async optimizeSVG(svgContent: string): Promise<string> {
    return svgContent
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s*=\s*/g, '=')
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

  getHistory(): ExportHistory[] {
    return [...this.history].reverse();
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  async batchExport(sourceSVG: string, targetSVG: string, formats: ExportOptions[]): Promise<ExportResult[]> {
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

export function createJavaScriptExportOptions(overrides: Partial<JavaScriptExportOptions> = {}): JavaScriptExportOptions {
  return {
    format: 'javascript',
    resolution: 1,
    optimize: true,
    includeAnimation: true,
    duration: 2,
    easing: 'easeInOut',
    loop: false,
    library: 'vanilla',
    includeLibraryImport: true,
    functionName: 'createSVGMorph',
    exportType: 'function',
    minified: false,
    includeTypeScript: false,
    ...overrides,
  };
}

export function createVideoExportOptions(overrides: Partial<VideoExportOptionsExtended> = {}): VideoExportOptionsExtended {
  return {
    format: 'video',
    resolution: 1,
    optimize: true,
    includeAnimation: true,
    duration: 3,
    easing: 'easeInOut',
    loop: false,
    videoFormat: 'mp4',
    width: 800,
    height: 600,
    fps: 30,
    quality: 'high',
    backgroundColor: '#ffffff',
    ...overrides,
  };
}