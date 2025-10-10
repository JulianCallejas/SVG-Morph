import { SVGData } from '../types/svg';

export interface AnimationKeyframe {
  time: number;
  progress: number;
  pathData: string;
  properties: {
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    opacity?: string;
    transform?: string;
  };
}

export interface ExtractedAnimation {
  id: string;
  name: string;
  duration: number;
  easing: string;
  keyframes: AnimationKeyframe[];
  sourceType: 'css' | 'smil' | 'javascript' | 'lottie';
  confidence: number;
  metadata: {
    extractedAt: Date;
    originalFormat: string;
    pathCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

export interface ReverseEngineeringOptions {
  sampleRate: number; // How many keyframes to extract per second
  minConfidence: number; // Minimum confidence threshold
  extractProperties: boolean; // Whether to extract fill, stroke, etc.
  simplifyPaths: boolean; // Whether to simplify extracted paths
  detectEasing: boolean; // Whether to detect easing functions
}

export class ReverseEngineeringEngine {
  private defaultOptions: ReverseEngineeringOptions = {
    sampleRate: 30,
    minConfidence: 0.7,
    extractProperties: true,
    simplifyPaths: true,
    detectEasing: true
  };

  /**
   * Analyze SVG content and extract animation data
   */
  async analyzeSVGAnimation(
    svgContent: string,
    options: Partial<ReverseEngineeringOptions> = {}
  ): Promise<ExtractedAnimation[]> {
    const opts = { ...this.defaultOptions, ...options };
    const animations: ExtractedAnimation[] = [];

    try {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svgElement = svgDoc.querySelector('svg');

      if (!svgElement) {
        throw new Error('Invalid SVG content');
      }

      // Extract SMIL animations
      const smilAnimations = await this.extractSMILAnimations(svgElement, opts);
      animations.push(...smilAnimations);

      // Extract CSS animations
      const cssAnimations = await this.extractCSSAnimations(svgElement, opts);
      animations.push(...cssAnimations);

      // Extract JavaScript animations (if embedded)
      const jsAnimations = await this.extractJavaScriptAnimations(svgContent, opts);
      animations.push(...jsAnimations);

      return animations.filter(anim => anim.confidence >= opts.minConfidence);
    } catch (error) {
      console.error('Error analyzing SVG animation:', error);
      return [];
    }
  }

  /**
   * Extract SMIL-based animations
   */
  private async extractSMILAnimations(
    svgElement: SVGElement,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation[]> {
    const animations: ExtractedAnimation[] = [];
    const animateElements = svgElement.querySelectorAll('animate, animateTransform');

    for (const animateEl of Array.from(animateElements)) {
      try {
        const animation = await this.parseSMILAnimation(animateEl as SVGAnimateElement, options);
        if (animation) {
          animations.push(animation);
        }
      } catch (error) {
        console.error('Error parsing SMIL animation:', error);
      }
    }

    return animations;
  }

  /**
   * Parse individual SMIL animation element
   */
  private async parseSMILAnimation(
    animateEl: SVGAnimateElement,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation | null> {
    const attributeName = animateEl.getAttribute('attributeName');
    const values = animateEl.getAttribute('values');
    const dur = animateEl.getAttribute('dur');
    const keyTimes = animateEl.getAttribute('keyTimes');
    const keySplines = animateEl.getAttribute('keySplines');

    if (!attributeName || !values || !dur) {
      return null;
    }

    const duration = this.parseDuration(dur);
    const valueArray = values.split(';');
    const timeArray = keyTimes ? keyTimes.split(';').map(Number) : 
      valueArray.map((_, i) => i / (valueArray.length - 1));

    const keyframes: AnimationKeyframe[] = [];
    
    for (let i = 0; i < valueArray.length; i++) {
      const time = timeArray[i] * duration;
      const progress = timeArray[i];
      
      const keyframe: AnimationKeyframe = {
        time,
        progress,
        pathData: attributeName === 'd' ? valueArray[i] : '',
        properties: {}
      };

      // Set the animated property
      if (attributeName === 'd') {
        keyframe.pathData = valueArray[i];
      } else {
        (keyframe.properties as any)[attributeName] = valueArray[i];
      }

      keyframes.push(keyframe);
    }

    const easing = this.detectEasingFromKeySplines(keySplines);
    const confidence = this.calculateSMILConfidence(animateEl, keyframes);

    return {
      id: `smil_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `SMIL ${attributeName} Animation`,
      duration,
      easing,
      keyframes,
      sourceType: 'smil',
      confidence,
      metadata: {
        extractedAt: new Date(),
        originalFormat: 'SMIL',
        pathCount: attributeName === 'd' ? 1 : 0,
        complexity: this.assessComplexity(keyframes)
      }
    };
  }

  /**
   * Extract CSS-based animations
   */
  private async extractCSSAnimations(
    svgElement: SVGElement,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation[]> {
    const animations: ExtractedAnimation[] = [];
    const styleElements = svgElement.querySelectorAll('style');
    const elementsWithStyle = svgElement.querySelectorAll('[style]');

    // Parse embedded CSS
    for (const styleEl of Array.from(styleElements)) {
      const cssText = styleEl.textContent || '';
      const cssAnimations = await this.parseCSSAnimations(cssText, options);
      animations.push(...cssAnimations);
    }

    // Parse inline styles
    for (const el of Array.from(elementsWithStyle)) {
      const inlineStyle = el.getAttribute('style') || '';
      if (inlineStyle.includes('animation')) {
        const cssAnimations = await this.parseInlineAnimations(inlineStyle, options);
        animations.push(...cssAnimations);
      }
    }

    return animations;
  }

  /**
   * Parse CSS animation rules
   */
  private async parseCSSAnimations(
    cssText: string,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation[]> {
    const animations: ExtractedAnimation[] = [];
    
    // Extract @keyframes rules
    const keyframesRegex = /@keyframes\s+([^{]+)\s*{([^}]+)}/g;
    let match;

    while ((match = keyframesRegex.exec(cssText)) !== null) {
      const animationName = match[1].trim();
      const keyframesContent = match[2];

      try {
        const animation = await this.parseKeyframesRule(animationName, keyframesContent, options);
        if (animation) {
          animations.push(animation);
        }
      } catch (error) {
        console.error('Error parsing CSS keyframes:', error);
      }
    }

    return animations;
  }

  /**
   * Parse CSS @keyframes rule
   */
  private async parseKeyframesRule(
    name: string,
    content: string,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation | null> {
    const keyframes: AnimationKeyframe[] = [];
    
    // Parse keyframe blocks
    const keyframeRegex = /(\d+%|from|to)\s*{([^}]+)}/g;
    let match;

    while ((match = keyframeRegex.exec(content)) !== null) {
      const timeKey = match[1].trim();
      const properties = match[2].trim();

      const progress = this.parseTimeKey(timeKey);
      const parsedProps = this.parseCSS Properties(properties);

      const keyframe: AnimationKeyframe = {
        time: progress * 1000, // Assume 1s duration, will be adjusted
        progress,
        pathData: parsedProps.d || '',
        properties: parsedProps
      };

      keyframes.push(keyframe);
    }

    if (keyframes.length === 0) {
      return null;
    }

    // Sort keyframes by progress
    keyframes.sort((a, b) => a.progress - b.progress);

    const confidence = this.calculateCSSConfidence(keyframes);

    return {
      id: `css_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `CSS ${name} Animation`,
      duration: 1000, // Default 1s, should be extracted from animation property
      easing: 'ease', // Default, should be detected
      keyframes,
      sourceType: 'css',
      confidence,
      metadata: {
        extractedAt: new Date(),
        originalFormat: 'CSS',
        pathCount: keyframes.filter(kf => kf.pathData).length,
        complexity: this.assessComplexity(keyframes)
      }
    };
  }

  /**
   * Extract JavaScript-based animations
   */
  private async extractJavaScriptAnimations(
    svgContent: string,
    options: ReverseEngineeringOptions
  ): Promise<ExtractedAnimation[]> {
    const animations: ExtractedAnimation[] = [];

    // Look for common animation libraries
    const gsapMatches = this.extractGSAPAnimations(svgContent);
    const animeMatches = this.extractAnimeJSAnimations(svgContent);
    const d3Matches = this.extractD3Animations(svgContent);

    animations.push(...gsapMatches, ...animeMatches, ...d3Matches);

    return animations;
  }

  /**
   * Extract GSAP animations from JavaScript code
   */
  private extractGSAPAnimations(content: string): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    
    // Look for GSAP timeline or tween patterns
    const gsapPatterns = [
      /gsap\.to\([^)]+\)/g,
      /gsap\.from\([^)]+\)/g,
      /gsap\.fromTo\([^)]+\)/g,
      /tl\.to\([^)]+\)/g,
      /timeline\.to\([^)]+\)/g
    ];

    for (const pattern of gsapPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          try {
            const animation = this.parseGSAPAnimation(match);
            if (animation) {
              animations.push(animation);
            }
          } catch (error) {
            console.error('Error parsing GSAP animation:', error);
          }
        }
      }
    }

    return animations;
  }

  /**
   * Extract Anime.js animations
   */
  private extractAnimeJSAnimations(content: string): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    
    const animePattern = /anime\(\{[^}]+\}\)/g;
    const matches = content.match(animePattern);

    if (matches) {
      for (const match of matches) {
        try {
          const animation = this.parseAnimeJSAnimation(match);
          if (animation) {
            animations.push(animation);
          }
        } catch (error) {
          console.error('Error parsing Anime.js animation:', error);
        }
      }
    }

    return animations;
  }

  /**
   * Extract D3 animations
   */
  private extractD3Animations(content: string): ExtractedAnimation[] {
    const animations: ExtractedAnimation[] = [];
    
    const d3Pattern = /\.transition\(\)[^;]+/g;
    const matches = content.match(d3Pattern);

    if (matches) {
      for (const match of matches) {
        try {
          const animation = this.parseD3Animation(match);
          if (animation) {
            animations.push(animation);
          }
        } catch (error) {
          console.error('Error parsing D3 animation:', error);
        }
      }
    }

    return animations;
  }

  /**
   * Utility methods
   */
  private parseDuration(dur: string): number {
    if (dur.endsWith('s')) {
      return parseFloat(dur) * 1000;
    } else if (dur.endsWith('ms')) {
      return parseFloat(dur);
    }
    return parseFloat(dur) * 1000; // Assume seconds
  }

  private parseTimeKey(timeKey: string): number {
    if (timeKey === 'from') return 0;
    if (timeKey === 'to') return 1;
    return parseFloat(timeKey) / 100;
  }

  private parseCSSProperties(properties: string): any {
    const props: any = {};
    const declarations = properties.split(';');

    for (const decl of declarations) {
      const [property, value] = decl.split(':').map(s => s.trim());
      if (property && value) {
        props[property] = value;
      }
    }

    return props;
  }

  private detectEasingFromKeySplines(keySplines: string | null): string {
    if (!keySplines) return 'linear';

    // Map common keySplines to easing names
    const easingMap: { [key: string]: string } = {
      '0 0 1 1': 'linear',
      '0.25 0.1 0.25 1': 'ease',
      '0.42 0 1 1': 'ease-in',
      '0 0 0.58 1': 'ease-out',
      '0.42 0 0.58 1': 'ease-in-out'
    };

    return easingMap[keySplines] || 'custom';
  }

  private calculateSMILConfidence(element: SVGAnimateElement, keyframes: AnimationKeyframe[]): number {
    let confidence = 0.8; // Base confidence for SMIL

    // Increase confidence for well-formed animations
    if (keyframes.length >= 2) confidence += 0.1;
    if (element.getAttribute('keyTimes')) confidence += 0.05;
    if (element.getAttribute('keySplines')) confidence += 0.05;

    return Math.min(1, confidence);
  }

  private calculateCSSConfidence(keyframes: AnimationKeyframe[]): number {
    let confidence = 0.7; // Base confidence for CSS

    // Increase confidence based on keyframe quality
    if (keyframes.length >= 3) confidence += 0.1;
    if (keyframes.some(kf => kf.pathData)) confidence += 0.1;
    if (keyframes.some(kf => Object.keys(kf.properties).length > 1)) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private assessComplexity(keyframes: AnimationKeyframe[]): 'low' | 'medium' | 'high' {
    const pathKeyframes = keyframes.filter(kf => kf.pathData).length;
    const propertyCount = keyframes.reduce((sum, kf) => sum + Object.keys(kf.properties).length, 0);

    if (pathKeyframes > 5 || propertyCount > 10) return 'high';
    if (pathKeyframes > 2 || propertyCount > 5) return 'medium';
    return 'low';
  }

  private parseGSAPAnimation(match: string): ExtractedAnimation | null {
    // Simplified GSAP parsing - would need more sophisticated parsing in practice
    const durationMatch = match.match(/duration:\s*([0-9.]+)/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) * 1000 : 1000;

    return {
      id: `gsap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'GSAP Animation',
      duration,
      easing: 'ease',
      keyframes: [], // Would extract actual keyframes
      sourceType: 'javascript',
      confidence: 0.6,
      metadata: {
        extractedAt: new Date(),
        originalFormat: 'GSAP',
        pathCount: 0,
        complexity: 'medium'
      }
    };
  }

  private parseAnimeJSAnimation(match: string): ExtractedAnimation | null {
    // Simplified Anime.js parsing
    const durationMatch = match.match(/duration:\s*([0-9]+)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 1000;

    return {
      id: `anime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Anime.js Animation',
      duration,
      easing: 'easeInOutQuad',
      keyframes: [], // Would extract actual keyframes
      sourceType: 'javascript',
      confidence: 0.6,
      metadata: {
        extractedAt: new Date(),
        originalFormat: 'Anime.js',
        pathCount: 0,
        complexity: 'medium'
      }
    };
  }

  private parseD3Animation(match: string): ExtractedAnimation | null {
    // Simplified D3 parsing
    const durationMatch = match.match(/\.duration\(([0-9]+)\)/);
    const duration = durationMatch ? parseInt(durationMatch[1]) : 1000;

    return {
      id: `d3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'D3 Animation',
      duration,
      easing: 'ease',
      keyframes: [], // Would extract actual keyframes
      sourceType: 'javascript',
      confidence: 0.6,
      metadata: {
        extractedAt: new Date(),
        originalFormat: 'D3',
        pathCount: 0,
        complexity: 'medium'
      }
    };
  }

  /**
   * Convert extracted animation to SVG-Morph format
   */
  convertToMorphingSequence(animation: ExtractedAnimation): {
    sourceSVG: SVGData;
    targetSVG: SVGData;
    settings: {
      duration: number;
      easing: string;
    };
  } | null {
    if (animation.keyframes.length < 2) return null;

    const firstFrame = animation.keyframes[0];
    const lastFrame = animation.keyframes[animation.keyframes.length - 1];

    const sourceSVG: SVGData = {
      width: 100,
      height: 100,
      viewBox: '0 0 100 100',
      paths: [{
        d: firstFrame.pathData || 'M0,0 L100,100',
        fill: firstFrame.properties.fill || '#5cbe2c',
        stroke: firstFrame.properties.stroke || '#262a23',
        strokeWidth: firstFrame.properties.strokeWidth || '2',
        opacity: firstFrame.properties.opacity || '1'
      }]
    };

    const targetSVG: SVGData = {
      width: 100,
      height: 100,
      viewBox: '0 0 100 100',
      paths: [{
        d: lastFrame.pathData || 'M0,0 L100,100',
        fill: lastFrame.properties.fill || '#d6b77c',
        stroke: lastFrame.properties.stroke || '#262a23',
        strokeWidth: lastFrame.properties.strokeWidth || '2',
        opacity: lastFrame.properties.opacity || '1'
      }]
    };

    return {
      sourceSVG,
      targetSVG,
      settings: {
        duration: animation.duration,
        easing: animation.easing
      }
    };
  }
}

// Export singleton instance
export const reverseEngineering = new ReverseEngineeringEngine();
