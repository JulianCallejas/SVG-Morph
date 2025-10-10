import SVGPathCommander from 'svg-path-commander';

export interface ExtractedKeyframe {
  time: number;
  progress: number;
  pathData: string;
  attributes?: Record<string, string>;
}

export interface ExtractedAnimation {
  type: 'path' | 'css' | 'smil' | 'javascript';
  duration: number;
  easing?: string;
  keyframes: ExtractedKeyframe[];
  sourceElement?: Element;
  targetElement?: Element;
  morphingPaths?: {
    source: string;
    target: string;
  };
}

export interface AnalysisResult {
  animations: ExtractedAnimation[];
  metadata: {
    totalAnimations: number;
    animationTypes: string[];
    complexity: 'low' | 'medium' | 'high';
    estimatedParameters: {
      duration?: number;
      easing?: string;
      morphingType?: string;
    };
  };
  extractedSVGs?: {
    source: string;
    target: string;
  };
}

export class AnimationAnalyzer {
  private svgContent: string;
  private parser: DOMParser;

  constructor(svgContent: string) {
    this.svgContent = svgContent;
    this.parser = new DOMParser();
  }

  /**
   * Main analysis method that extracts all animation data
   */
  public analyze(): AnalysisResult {
    const doc = this.parser.parseFromString(this.svgContent, 'image/svg+xml');
    const animations: ExtractedAnimation[] = [];

    // Analyze SMIL animations
    animations.push(...this.analyzeSMILAnimations(doc));

    // Analyze CSS animations
    animations.push(...this.analyzeCSSAnimations(doc));

    // Analyze JavaScript animations (if embedded)
    animations.push(...this.analyzeJavaScriptAnimations(doc));

    // Generate metadata
    const metadata = this.generateMetadata(animations);

    // Extract source and target SVGs if possible
    const extractedSVGs = this.extractSourceTargetSVGs(animations);

    return {
      animations,
      metadata,
      extractedSVGs
    };
  }

  /**
   * Analyze SMIL (SVG) animations
   */
  private analyzeSMILAnimations(doc: Document): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    const animateElements = doc.querySelectorAll('animate, animateTransform');

    animateElements.forEach(element => {
      const animation = this.extractSMILAnimation(element);
      if (animation) {
        animations.push(animation);
      }
    });

    return animations;
  }

  /**
   * Extract data from a single SMIL animation element
   */
  private extractSMILAnimation(element: Element): ExtractedAnimation | null {
    const attributeName = element.getAttribute('attributeName');
    const values = element.getAttribute('values');
    const dur = element.getAttribute('dur');
    const keyTimes = element.getAttribute('keyTimes');
    const keySplines = element.getAttribute('keySplines');

    if (!attributeName || !values || !dur) {
      return null;
    }

    // Parse duration
    const duration = this.parseDuration(dur);
    
    // Parse values into keyframes
    const valueArray = values.split(';');
    const timeArray = keyTimes ? keyTimes.split(';').map(Number) : 
                     valueArray.map((_, i) => i / (valueArray.length - 1));

    const keyframes: ExtractedKeyframe[] = valueArray.map((value, index) => ({
      time: timeArray[index] * duration,
      progress: timeArray[index],
      pathData: value.trim(),
      attributes: {
        [attributeName]: value.trim()
      }
    }));

    // Determine easing from keySplines
    let easing = 'linear';
    if (keySplines) {
      easing = this.parseKeySplines(keySplines);
    }

    const animation: ExtractedAnimation = {
      type: 'smil',
      duration,
      easing,
      keyframes,
      sourceElement: element.parentElement || undefined
    };

    // If this is a path morphing animation, extract source and target
    if (attributeName === 'd' && keyframes.length >= 2) {
      animation.morphingPaths = {
        source: keyframes[0].pathData,
        target: keyframes[keyframes.length - 1].pathData
      };
    }

    return animation;
  }

  /**
   * Analyze CSS animations
   */
  private analyzeCSSAnimations(doc: Document): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    const styleElements = doc.querySelectorAll('style');

    styleElements.forEach(styleElement => {
      const cssText = styleElement.textContent || '';
      const cssAnimations = this.extractCSSAnimations(cssText);
      animations.push(...cssAnimations);
    });

    return animations;
  }

  /**
   * Extract CSS animations from CSS text
   */
  private extractCSSAnimations(cssText: string): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    
    // Match @keyframes rules
    const keyframesRegex = /@keyframes\s+([^{]+)\s*{([^}]+)}/g;
    let match;

    while ((match = keyframesRegex.exec(cssText)) !== null) {
      const animationName = match[1].trim();
      const keyframesContent = match[2];
      
      const animation = this.parseKeyframesContent(animationName, keyframesContent);
      if (animation) {
        animations.push(animation);
      }
    }

    return animations;
  }

  /**
   * Parse CSS keyframes content
   */
  private parseKeyframesContent(_animationName: string, content: string): ExtractedAnimation | null {
    const keyframes: ExtractedKeyframe[] = [];
    
    // Match individual keyframe rules
    const keyframeRegex = /(\d+%|from|to)\s*{([^}]+)}/g;
    let match;

    while ((match = keyframeRegex.exec(content)) !== null) {
      const timeStr = match[1].trim();
      const properties = match[2];

      let progress: number;
      if (timeStr === 'from') progress = 0;
      else if (timeStr === 'to') progress = 1;
      else progress = parseInt(timeStr) / 100;

      // Extract path data if present
      const pathMatch = properties.match(/d:\s*path\(['"]([^'"]+)['"]\)/);
      const pathData = pathMatch ? pathMatch[1] : '';

      if (pathData) {
        keyframes.push({
          time: progress * 1000, // Default 1s duration
          progress,
          pathData,
          attributes: { d: pathData }
        });
      }
    }

    if (keyframes.length === 0) return null;

    return {
      type: 'css',
      duration: 1000, // Default duration, should be extracted from animation property
      easing: 'ease', // Default easing
      keyframes
    };
  }

  /**
   * Analyze embedded JavaScript animations
   */
  private analyzeJavaScriptAnimations(doc: Document): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    const scriptElements = doc.querySelectorAll('script');

    scriptElements.forEach(scriptElement => {
      const jsContent = scriptElement.textContent || '';
      const jsAnimations = this.extractJavaScriptAnimations(jsContent);
      animations.push(...jsAnimations);
    });

    return animations;
  }

  /**
   * Extract JavaScript animations from script content
   */
  private extractJavaScriptAnimations(jsContent: string): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];

    // Look for common animation patterns
    const patterns = [
      // GSAP morphSVG
      /morphSVG:\s*['"]([^'"]+)['"]/g,
      // Anime.js path morphing
      /d:\s*['"]([^'"]+)['"]/g,
      // Custom morphing functions
      /interpolatePath\s*\([^)]*['"]([^'"]+)['"][^)]*['"]([^'"]+)['"]/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(jsContent)) !== null) {
        // This is a simplified extraction - real implementation would be more complex
        const animation: ExtractedAnimation = {
          type: 'javascript',
          duration: 1000, // Default
          keyframes: [
            { time: 0, progress: 0, pathData: match[1] || '' },
            { time: 1000, progress: 1, pathData: match[2] || match[1] || '' }
          ]
        };

        if (match[1] && match[2]) {
          animation.morphingPaths = {
            source: match[1],
            target: match[2]
          };
        }

        animations.push(animation);
      }
    });

    return animations;
  }

  /**
   * Generate metadata about the extracted animations
   */
  private generateMetadata(animations: ExtractedAnimation[]): AnalysisResult['metadata'] {
    const animationTypes = [...new Set(animations.map(a => a.type))];
    
    // Determine complexity based on number of animations and keyframes
    let complexity: 'low' | 'medium' | 'high' = 'low';
    const totalKeyframes = animations.reduce((sum, a) => sum + a.keyframes.length, 0);
    
    if (animations.length > 5 || totalKeyframes > 20) {
      complexity = 'high';
    } else if (animations.length > 2 || totalKeyframes > 10) {
      complexity = 'medium';
    }

    // Extract common parameters
    const durations = animations.map(a => a.duration).filter(Boolean);
    const easings = animations.map(a => a.easing).filter(Boolean);
    
    const estimatedParameters = {
      duration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : undefined,
      easing: easings.length > 0 ? this.getMostCommon(easings) : undefined,
      morphingType: animations.some(a => a.morphingPaths) ? 'path-morphing' : 'property-animation'
    };

    return {
      totalAnimations: animations.length,
      animationTypes,
      complexity,
      estimatedParameters
    };
  }

  /**
   * Extract source and target SVGs from animations
   */
  private extractSourceTargetSVGs(animations: ExtractedAnimation[]): AnalysisResult['extractedSVGs'] | undefined {
    // Find the best morphing animation to extract SVGs from
    const morphingAnimation = animations.find(a => a.morphingPaths);
    
    if (!morphingAnimation?.morphingPaths) return undefined;

    // Create complete SVG documents
    const sourceTemplate = this.createSVGTemplate(morphingAnimation.morphingPaths.source);
    const targetTemplate = this.createSVGTemplate(morphingAnimation.morphingPaths.target);

    return {
      source: sourceTemplate,
      target: targetTemplate
    };
  }

  /**
   * Create a complete SVG document from a path
   */
  private createSVGTemplate(pathData: string): string {
    // Calculate bounding box for the path
    const bbox = this.calculatePathBounds(pathData);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}" width="400" height="400">
  <path d="${pathData}" fill="none" stroke="#000" stroke-width="2"/>
</svg>`;
  }

  /**
   * Calculate bounding box for a path
   */
  private calculatePathBounds(pathData: string): { x: number; y: number; width: number; height: number } {
    try {
      const path = new SVGPathCommander(pathData);
      const bbox = path.getBBox();
      return {
        x: bbox.x - 10,
        y: bbox.y - 10,
        width: bbox.width + 20,
        height: bbox.height + 20
      };
    } catch {
      // Fallback bounding box
      return { x: 0, y: 0, width: 400, height: 400 };
    }
  }

  /**
   * Parse duration string to milliseconds
   */
  private parseDuration(dur: string): number {
    if (dur.endsWith('s')) {
      return parseFloat(dur) * 1000;
    } else if (dur.endsWith('ms')) {
      return parseFloat(dur);
    }
    return parseFloat(dur) * 1000; // Assume seconds if no unit
  }

  /**
   * Parse keySplines to determine easing
   */
  private parseKeySplines(keySplines: string): string {
    // This is a simplified mapping - real implementation would be more sophisticated
    const splines = keySplines.split(';')[0].trim();
    
    // Common easing mappings
    const easingMap: Record<string, string> = {
      '0 0 1 1': 'linear',
      '0.25 0.1 0.25 1': 'ease',
      '0.42 0 1 1': 'ease-in',
      '0 0 0.58 1': 'ease-out',
      '0.42 0 0.58 1': 'ease-in-out',
      '0.68 -0.55 0.265 1.55': 'bounce'
    };

    return easingMap[splines] || `cubic-bezier(${splines})`;
  }

  /**
   * Get the most common item from an array
   */
  private getMostCommon<T>(arr: T[]): T | undefined {
    const counts = arr.reduce((acc, item) => {
      acc[String(item)] = (acc[String(item)] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let maxCount = 0;
    let mostCommon: T | undefined;

    for (const [item, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = arr.find(x => String(x) === item);
      }
    }

    return mostCommon;
  }
}

/**
 * Utility function to analyze SVG animation content
 */
export function analyzeAnimation(svgContent: string): AnalysisResult {
  const analyzer = new AnimationAnalyzer(svgContent);
  return analyzer.analyze();
}

/**
 * Extract morphing parameters that can be used in SVG-Morph
 */
export function extractMorphingParameters(analysisResult: AnalysisResult) {
  const { animations, metadata } = analysisResult;
  
  // Find the best animation for morphing
  const morphingAnimation = animations.find(a => a.morphingPaths) || animations[0];
  
  if (!morphingAnimation) {
    return null;
  }

  return {
    duration: morphingAnimation.duration || metadata.estimatedParameters.duration || 2000,
    easing: morphingAnimation.easing || metadata.estimatedParameters.easing || 'ease-in-out',
    loop: false, // Default
    direction: 'normal' as const,
    sourcePath: morphingAnimation.morphingPaths?.source || '',
    targetPath: morphingAnimation.morphingPaths?.target || '',
    keyframes: morphingAnimation.keyframes.map(kf => ({
      time: kf.progress,
      pathData: kf.pathData
    }))
  };
}
