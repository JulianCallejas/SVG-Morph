import { SVGData } from '../workers/pathProcessor';

export interface ExportOptions {
  format: 'svg' | 'css' | 'smil' | 'json' | 'javascript';
  resolution: 1 | 2 | 4;
  optimize: boolean;
  includeAnimation: boolean;
  duration: number;
  easing: string;
  loop: boolean;
  filename?: string;
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
      
      case 'javascript':
        content = await this.exportJavaScriptFormat(optimizedSourceSVG, optimizedTargetSVG, options as JavaScriptExportOptions);
        mimeType = 'text/javascript';
        filename = options.filename || `morph-animation.js`;
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
    console.log('SVG Export - includeAnimation:', options.includeAnimation);
    
    if (!options.includeAnimation) {
      console.log('SVG Export - Animation disabled, returning source SVG');
      return sourceSVG;
    }

    console.log('SVG Export - Generating morphing animation...');
    // Use Web Worker to create proper morphing animation
    const morphingAnimation = await this.generateMorphingAnimation(sourceSVG, targetSVG, options);
    console.log('SVG Export - Generated animation length:', morphingAnimation.length);
    
    return morphingAnimation;
  }

  private async exportCSSFormat(
    _sourceSVG: string,
    _targetSVG: string,
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

    // Parse SVG data to get path information
    const sourceData = await this.parseSVGData(sourceSVG);
    const targetData = await this.parseSVGData(targetSVG);
    
    if (!sourceData || !targetData || sourceData.paths.length === 0 || targetData.paths.length === 0) {
      // Fallback to opacity animation if parsing fails
      return this.generateOpacityBasedSMIL(sourceSVG, targetSVG, options);
    }

    // Generate SMIL with actual path morphing
    const { viewBox, width, height } = sourceData;
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);
    const animatedPaths: string[] = [];

    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      if (!sourcePath || !targetPath) continue;

      // Normalize paths for proper morphing
      const normalizedSource = await this.normalizePath(sourcePath.d);
      const normalizedTarget = await this.normalizePath(targetPath.d);
      
      const pathId = `path-${i}`;
      
      // Build path element with conditional fill attribute
      let pathElement = `<path id="${pathId}" d="${normalizedSource}"`;
      
      // Only add fill attribute if we have a value
      if (sourcePath.fill !== undefined) {
        pathElement += ` fill="${sourcePath.fill}"`;
      }
      
      pathElement += ` stroke="${sourcePath.stroke || 'none'}"`;
      pathElement += ` stroke-width="${sourcePath.strokeWidth || 1}"`;
      pathElement += ` opacity="${sourcePath.opacity || 1}">`;
      
      // Add path morphing animation
      pathElement += `
          <animate
            attributeName="d"
            values="${normalizedSource};${normalizedTarget};${normalizedSource}"
            dur="${duration}"
            repeatCount="${repeatCount}"
            calcMode="spline"
            keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
            keyTimes="0;0.5;1"
          />`;
      
      // Add fill animation only if both paths have fill values
      if (sourcePath.fill !== undefined && targetPath.fill !== undefined) {
        pathElement += `
          <animate
            attributeName="fill"
            values="${sourcePath.fill};${targetPath.fill};${sourcePath.fill}"
            dur="${duration}"
            repeatCount="${repeatCount}"
          />`;
      }
      
      pathElement += `
          <animate
            attributeName="stroke-width"
            values="${sourcePath.strokeWidth || 1};${targetPath.strokeWidth || 1};${sourcePath.strokeWidth || 1}"
            dur="${duration}"
            repeatCount="${repeatCount}"
          />
          <animate
            attributeName="opacity"
            values="${sourcePath.opacity || 1};${targetPath.opacity || 1};${sourcePath.opacity || 1}"
            dur="${duration}"
            repeatCount="${repeatCount}"
          />
        </path>`;
      
      animatedPaths.push(pathElement);
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
        <defs>
          <style>
            path:not([fill]) { fill: none !important; }
            path[fill=""] { fill: none !important; }
          </style>
        </defs>
        ${animatedPaths.join('')}
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

  /**
   * Generate proper morphing animation using Web Worker
   */
  private async generateMorphingAnimation(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): Promise<string> {
    try {
      console.log('generateMorphingAnimation - Starting...');
      // Import the worker manager dynamically to avoid circular dependencies
      const { workerManager } = await import('./workerManager');
      
      // Parse both SVGs
      console.log('generateMorphingAnimation - Parsing SVGs...');
      const sourceData = await workerManager.parseSVG(sourceSVG);
      const targetData = await workerManager.parseSVG(targetSVG);
      
      if (!sourceData || !targetData) {
        throw new Error('Failed to parse SVG data');
      }

      console.log('generateMorphingAnimation - Parsed successfully, generating animation...');
      // Generate keyframes for the animation
      const keyframes = this.generateKeyframes(options);
      const animationCSS = this.generateAdvancedCSSAnimation(sourceData, targetData, options, keyframes);
      
      const { viewBox, width, height } = sourceData;
      
      const result = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">
          <defs>
            <style>
              path:not([fill]) { fill: none !important; }
              path[fill=""] { fill: none !important; }
              ${animationCSS}
            </style>
          </defs>
          <g class="morph-container">
            ${await this.generateMorphingPaths(sourceData, targetData, options)}
          </g>
        </svg>
      `.trim();
      
      console.log('generateMorphingAnimation - Generated advanced animation');
      return result;
    } catch (error) {
      console.warn('Advanced morphing failed, using fallback:', error);
      const fallback = this.generateFallbackAnimation(sourceSVG, targetSVG, options);
      console.log('generateMorphingAnimation - Using fallback animation');
      return fallback;
    }
  }

  /**
   * Generate morphing paths with proper interpolation
   */
  private async generateMorphingPaths(
    sourceData: SVGData,
    targetData: SVGData,
    _options: ExportOptions
  ): Promise<string> {
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);
    const morphingPaths: string[] = [];

    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      if (!sourcePath || !targetPath) continue;

      const pathId = `morph-path-${i}`;
      const normalizedSource = await this.normalizePath(sourcePath.d);
      const normalizedTarget = await this.normalizePath(targetPath.d);
      
      // Build path element with conditional fill attribute
      let pathElement = `<path id="${pathId}" class="morph-path morph-path-${i}" d="${normalizedSource}"`;
      
      // Only add fill attribute if we have a value
      if (sourcePath.fill !== undefined) {
        pathElement += ` fill="${sourcePath.fill}"`;
      }
      
      pathElement += ` stroke="${sourcePath.stroke || 'none'}"`;
      pathElement += ` stroke-width="${sourcePath.strokeWidth || 1}"`;
      pathElement += ` opacity="${sourcePath.opacity || 1}"`;
      pathElement += ` data-target-d="${normalizedTarget}"`;
      
      // Only add target fill data if we have a value
      if (targetPath.fill !== undefined) {
        pathElement += ` data-target-fill="${targetPath.fill}"`;
      }
      
      pathElement += ` data-target-stroke="${targetPath.stroke || 'none'}"`;
      pathElement += ` data-target-stroke-width="${targetPath.strokeWidth || 1}"`;
      pathElement += ` data-target-opacity="${targetPath.opacity || 1}"`;
      pathElement += ` />`;
      
      morphingPaths.push(pathElement);
    }

    return morphingPaths.join('');
  }

  /**
   * Generate advanced CSS animation with proper morphing
   */
  private generateAdvancedCSSAnimation(
    sourceData: SVGData,
    targetData: SVGData,
    options: ExportOptions,
    _keyframes: string[]
  ): string {
    const duration = `${options.duration}s`;
    const easing = this.convertEasingToCSSFunction(options.easing);
    const iteration = options.loop ? 'infinite' : '1';
    
    let css = '';
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);

    // Generate keyframes for each path
    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      if (!sourcePath || !targetPath) continue;

      // Generate keyframes with proper fill handling
      let keyframeCSS = `@keyframes morphPath${i} {\n`;
      
      // 0% keyframe
      keyframeCSS += `  0% {\n    d: path('${sourcePath.d}');\n`;
      if (sourcePath.fill !== undefined) {
        keyframeCSS += `    fill: ${sourcePath.fill};\n`;
      }
      keyframeCSS += `    stroke: ${sourcePath.stroke || 'none'};\n`;
      keyframeCSS += `    stroke-width: ${sourcePath.strokeWidth || 1};\n`;
      keyframeCSS += `    opacity: ${sourcePath.opacity || 1};\n  }\n`;
      
      // 50% keyframe
      keyframeCSS += `  50% {\n    d: path('${targetPath.d}');\n`;
      if (targetPath.fill !== undefined) {
        keyframeCSS += `    fill: ${targetPath.fill};\n`;
      }
      keyframeCSS += `    stroke: ${targetPath.stroke || 'none'};\n`;
      keyframeCSS += `    stroke-width: ${targetPath.strokeWidth || 1};\n`;
      keyframeCSS += `    opacity: ${targetPath.opacity || 1};\n  }\n`;
      
      // 100% keyframe
      keyframeCSS += `  100% {\n    d: path('${sourcePath.d}');\n`;
      if (sourcePath.fill !== undefined) {
        keyframeCSS += `    fill: ${sourcePath.fill};\n`;
      }
      keyframeCSS += `    stroke: ${sourcePath.stroke || 'none'};\n`;
      keyframeCSS += `    stroke-width: ${sourcePath.strokeWidth || 1};\n`;
      keyframeCSS += `    opacity: ${sourcePath.opacity || 1};\n  }\n}\n\n`;
      
      keyframeCSS += `.morph-path-${i} {\n`;
      keyframeCSS += `  animation: morphPath${i} ${duration} ${easing} ${iteration};\n`;
      keyframeCSS += `}\n`;
      
      css += keyframeCSS;
    }

    return css;
  }

  /**
   * Generate keyframes for animation timing
   */
  private generateKeyframes(_options: ExportOptions): string[] {
    const steps = 60; // 60 steps for smooth animation
    const keyframes: string[] = [];
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      keyframes.push(`${(progress * 100).toFixed(1)}%`);
    }
    
    return keyframes;
  }

  /**
   * Fallback animation using opacity blending
   */
  private generateFallbackAnimation(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): string {
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

  /**
   * Fallback SMIL animation using opacity
   */
  private generateOpacityBasedSMIL(
    sourceSVG: string,
    targetSVG: string,
    options: ExportOptions
  ): string {
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

  /**
   * Parse SVG data using the same method as the Web Worker
   */
  private async parseSVGData(svgString: string): Promise<SVGData | null> {
    try {
      const { workerManager } = await import('./workerManager');
      return await workerManager.parseSVG(svgString);
    } catch (error) {
      console.warn('Failed to parse SVG data:', error);
      return null;
    }
  }

  /**
   * Export JavaScript code format
   */
  private async exportJavaScriptFormat(
    sourceSVG: string,
    targetSVG: string,
    options: JavaScriptExportOptions
  ): Promise<string> {
    // Parse SVG data to get path information
    const sourceData = await this.parseSVGData(sourceSVG);
    const targetData = await this.parseSVGData(targetSVG);
    
    if (!sourceData || !targetData) {
      throw new Error('Failed to parse SVG data for JavaScript export');
    }

    switch (options.library) {
      case 'vanilla':
        return this.generateVanillaJavaScript(sourceData, targetData, options);
      case 'gsap':
        return this.generateGSAPJavaScript(sourceData, targetData, options);
      case 'anime':
        return this.generateAnimeJavaScript(sourceData, targetData, options);
      default:
        throw new Error(`Unsupported JavaScript library: ${options.library}`);
    }
  }

  /**
   * Generate vanilla JavaScript morphing code
   */
  private generateVanillaJavaScript(
    sourceData: SVGData,
    targetData: SVGData,
    options: JavaScriptExportOptions
  ): string {
    const { functionName, exportType, includeTypeScript, minified } = options;
    const duration = options.duration * 1000; // Convert to milliseconds
    
    // Prepare path data
    const pathData = this.preparePathDataForJS(sourceData, targetData);
    
    // Generate the main function code
    let code = '';
    
    // Add TypeScript types if requested
    if (includeTypeScript) {
      code += this.generateTypeScriptDefinitions();
    }
    
    // Generate function based on export type
    switch (exportType) {
      case 'function':
        code += this.generateVanillaFunction(functionName, pathData, options);
        break;
      case 'class':
        code += this.generateVanillaClass(functionName, pathData, options);
        break;
      case 'module':
        code += this.generateVanillaModule(functionName, pathData, options);
        break;
    }
    
    // Add utility functions
    code += this.generateVanillaUtilities();
    
    return minified ? this.minifyCode(code) : this.formatCode(code);
  }

  /**
   * Generate GSAP JavaScript morphing code
   */
  private generateGSAPJavaScript(
    sourceData: SVGData,
    targetData: SVGData,
    options: JavaScriptExportOptions
  ): string {
    const { functionName, includeLibraryImport, minified } = options;
    
    let code = '';
    
    // Add GSAP import if requested
    if (includeLibraryImport) {
      code += '// GSAP Library Required: https://greensock.com/gsap/\n';
      code += '// import { gsap } from "gsap";\n';
      code += '// import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";\n\n';
    }
    
    // Prepare path data
    const pathData = this.preparePathDataForJS(sourceData, targetData);
    
    code += this.generateGSAPFunction(functionName, pathData, options);
    
    return minified ? this.minifyCode(code) : this.formatCode(code);
  }

  /**
   * Generate Anime.js JavaScript morphing code
   */
  private generateAnimeJavaScript(
    sourceData: SVGData,
    targetData: SVGData,
    options: JavaScriptExportOptions
  ): string {
    const { functionName, includeLibraryImport, minified } = options;
    
    let code = '';
    
    // Add Anime.js import if requested
    if (includeLibraryImport) {
      code += '// Anime.js Library Required: https://animejs.com/\n';
      code += '// import anime from "animejs";\n\n';
    }
    
    // Prepare path data
    const pathData = this.preparePathDataForJS(sourceData, targetData);
    
    code += this.generateAnimeFunction(functionName, pathData, options);
    
    return minified ? this.minifyCode(code) : this.formatCode(code);
  }

  /**
   * Prepare path data for JavaScript export
   */
  private preparePathDataForJS(sourceData: SVGData, targetData: SVGData): any {
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);
    const paths = [];
    
    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      paths.push({
        id: `path-${i}`,
        source: {
          d: sourcePath.d,
          fill: sourcePath.fill,
          stroke: sourcePath.stroke || 'none',
          strokeWidth: sourcePath.strokeWidth || 1,
          opacity: sourcePath.opacity || 1
        },
        target: {
          d: targetPath.d,
          fill: targetPath.fill,
          stroke: targetPath.stroke || 'none',
          strokeWidth: targetPath.strokeWidth || 1,
          opacity: targetPath.opacity || 1
        }
      });
    }
    
    return {
      viewBox: sourceData.viewBox,
      width: sourceData.width,
      height: sourceData.height,
      paths
    };
  }

  /**
   * Generate TypeScript definitions
   */
  private generateTypeScriptDefinitions(): string {
    return `
interface MorphOptions {
  duration?: number;
  easing?: string;
  loop?: boolean;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

interface MorphController {
  play(): void;
  pause(): void;
  reverse(): void;
  restart(): void;
  setProgress(progress: number): void;
  destroy(): void;
}

`;
  }

  /**
   * Generate vanilla JavaScript function
   */
  private generateVanillaFunction(
    functionName: string,
    pathData: any,
    options: JavaScriptExportOptions
  ): string {
    const duration = options.duration * 1000;
    
    return `
/**
 * SVG Morphing Animation Function
 * Generated by SVG-Morph
 */
function ${functionName}(containerId, userOptions = {}) {
  const defaultOptions = {
    duration: ${duration},
    easing: '${options.easing}',
    loop: ${options.loop},
    onComplete: null,
    onUpdate: null
  };
  
  const config = { ...defaultOptions, ...userOptions };
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  
  if (!container) {
    throw new Error('Container element not found');
  }
  
  // SVG Data
  const svgData = ${JSON.stringify(pathData, null, 2)};
  
  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', svgData.viewBox);
  svg.setAttribute('width', svgData.width);
  svg.setAttribute('height', svgData.height);
  
  // Create paths
  const paths = svgData.paths.map(pathInfo => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathInfo.source.d);
    path.setAttribute('fill', pathInfo.source.fill || 'none');
    path.setAttribute('stroke', pathInfo.source.stroke);
    path.setAttribute('stroke-width', pathInfo.source.strokeWidth);
    path.setAttribute('opacity', pathInfo.source.opacity);
    path.setAttribute('id', pathInfo.id);
    svg.appendChild(path);
    return { element: path, data: pathInfo };
  });
  
  container.appendChild(svg);
  
  // Animation state
  let animationId = null;
  let isPlaying = false;
  let currentProgress = 0;
  let startTime = null;
  
  // Easing functions
  const easingFunctions = {
    linear: t => t,
    easeIn: t => t * t,
    easeOut: t => 1 - (1 - t) * (1 - t),
    easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    bounce: t => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    elastic: t => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
  };
  
  // Interpolation function
  function interpolateValue(start, end, progress) {
    return start + (end - start) * progress;
  }
  
  function interpolateColor(startColor, endColor, progress) {
    if (!startColor || !endColor || startColor === 'none' || endColor === 'none') {
      return progress < 0.5 ? startColor : endColor;
    }
    
    // Simple color interpolation (can be enhanced)
    return progress < 0.5 ? startColor : endColor;
  }
  
  // Update function
  function updatePaths(progress) {
    const easedProgress = easingFunctions[config.easing] ? 
      easingFunctions[config.easing](progress) : progress;
    
    paths.forEach(({ element, data }) => {
      // For now, we'll use opacity blending as path morphing requires complex interpolation
      if (easedProgress < 0.5) {
        element.setAttribute('d', data.source.d);
        element.setAttribute('opacity', interpolateValue(data.source.opacity, 0, easedProgress * 2));
      } else {
        element.setAttribute('d', data.target.d);
        element.setAttribute('opacity', interpolateValue(0, data.target.opacity, (easedProgress - 0.5) * 2));
      }
      
      // Interpolate other properties
      element.setAttribute('fill', interpolateColor(data.source.fill, data.target.fill, easedProgress));
      element.setAttribute('stroke', interpolateColor(data.source.stroke, data.target.stroke, easedProgress));
      element.setAttribute('stroke-width', interpolateValue(data.source.strokeWidth, data.target.strokeWidth, easedProgress));
    });
    
    if (config.onUpdate) {
      config.onUpdate(progress);
    }
  }
  
  // Animation loop
  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / config.duration, 1);
    
    currentProgress = progress;
    updatePaths(progress);
    
    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      isPlaying = false;
      if (config.onComplete) config.onComplete();
      
      if (config.loop) {
        setTimeout(() => controller.restart(), 100);
      }
    }
  }
  
  // Controller object
  const controller = {
    play() {
      if (!isPlaying) {
        isPlaying = true;
        startTime = null;
        animationId = requestAnimationFrame(animate);
      }
    },
    
    pause() {
      if (isPlaying && animationId) {
        cancelAnimationFrame(animationId);
        isPlaying = false;
      }
    },
    
    reverse() {
      // Simple reverse implementation
      const reversedPaths = paths.map(p => ({
        ...p,
        data: {
          ...p.data,
          source: p.data.target,
          target: p.data.source
        }
      }));
      paths.splice(0, paths.length, ...reversedPaths);
      this.restart();
    },
    
    restart() {
      this.pause();
      currentProgress = 0;
      startTime = null;
      updatePaths(0);
      this.play();
    },
    
    setProgress(progress) {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      currentProgress = clampedProgress;
      updatePaths(clampedProgress);
    },
    
    destroy() {
      this.pause();
      if (svg.parentNode) {
        svg.parentNode.removeChild(svg);
      }
    }
  };
  
  return controller;
}
`;
  }

  /**
   * Generate vanilla JavaScript class
   */
  private generateVanillaClass(
    className: string,
    pathData: any,
    options: JavaScriptExportOptions
  ): string {
    // Similar to function but as a class
    return `
class ${className} {
  constructor(containerId, userOptions = {}) {
    // Class implementation similar to function above
    // ... (implementation details)
  }
  
  play() { /* ... */ }
  pause() { /* ... */ }
  reverse() { /* ... */ }
  restart() { /* ... */ }
  setProgress(progress) { /* ... */ }
  destroy() { /* ... */ }
}
`;
  }

  /**
   * Generate vanilla JavaScript module
   */
  private generateVanillaModule(
    exportName: string,
    pathData: any,
    options: JavaScriptExportOptions
  ): string {
    return `
export function create${exportName}(containerId, userOptions = {}) {
  // Module implementation
  // ... (similar to function implementation)
}

export default create${exportName};
`;
  }

  /**
   * Generate GSAP function
   */
  private generateGSAPFunction(
    functionName: string,
    pathData: any,
    options: JavaScriptExportOptions
  ): string {
    return `
function ${functionName}(containerId, userOptions = {}) {
  // GSAP implementation with MorphSVG plugin
  const config = {
    duration: ${options.duration},
    ease: "${options.easing}",
    repeat: ${options.loop ? -1 : 0},
    ...userOptions
  };
  
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  const svgData = ${JSON.stringify(pathData, null, 2)};
  
  // Create SVG and paths
  // ... GSAP-specific implementation
  
  const tl = gsap.timeline(config);
  
  svgData.paths.forEach((pathInfo, index) => {
    tl.to(\`#\${pathInfo.id}\`, {
      morphSVG: pathInfo.target.d,
      fill: pathInfo.target.fill,
      stroke: pathInfo.target.stroke,
      strokeWidth: pathInfo.target.strokeWidth,
      opacity: pathInfo.target.opacity,
      duration: config.duration
    }, 0);
  });
  
  return tl;
}
`;
  }

  /**
   * Generate Anime.js function
   */
  private generateAnimeFunction(
    functionName: string,
    pathData: any,
    options: JavaScriptExportOptions
  ): string {
    return `
function ${functionName}(containerId, userOptions = {}) {
  // Anime.js implementation
  const config = {
    duration: ${options.duration * 1000},
    easing: '${options.easing}',
    loop: ${options.loop},
    ...userOptions
  };
  
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  const svgData = ${JSON.stringify(pathData, null, 2)};
  
  // Create SVG and paths
  // ... Anime.js-specific implementation
  
  return anime({
    targets: '.morph-path',
    d: pathInfo => pathInfo.target.d,
    fill: pathInfo => pathInfo.target.fill,
    stroke: pathInfo => pathInfo.target.stroke,
    strokeWidth: pathInfo => pathInfo.target.strokeWidth,
    opacity: pathInfo => pathInfo.target.opacity,
    ...config
  });
}
`;
  }

  /**
   * Generate utility functions for vanilla JS
   */
  private generateVanillaUtilities(): string {
    return `
// Utility functions for SVG morphing
// Add any additional helper functions here
`;
  }

  /**
   * Minify JavaScript code
   */
  private minifyCode(code: string): string {
    // Basic minification - remove comments and extra whitespace
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/;\s*}/g, ';}') // Remove space before closing braces
      .trim();
  }

  /**
   * Format JavaScript code
   */
  private formatCode(code: string): string {
    // Basic formatting - ensure proper indentation
    return code.trim();
  }

  /**
   * Normalize path for consistent morphing
   */
  private async normalizePath(pathData: string): Promise<string> {
    try {
      const { workerManager } = await import('./workerManager');
      return await workerManager.normalizePath(pathData, 100);
    } catch (error) {
      console.warn('Failed to normalize path:', error);
      return pathData;
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
