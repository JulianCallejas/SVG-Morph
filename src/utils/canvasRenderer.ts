export interface CanvasRenderOptions {
  width: number;
  height: number;
  devicePixelRatio: number;
  antialias: boolean;
  alpha: boolean;
  preserveDrawingBuffer: boolean;
  powerPreference: 'default' | 'high-performance' | 'low-power';
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  vertexCount: number;
  memoryUsage: number;
}

export interface AnimationFrame {
  svgContent: string;
  timestamp: number;
  progress: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private webglCtx: WebGLRenderingContext | null = null;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private renderMode: '2d' | 'webgl' | 'offscreen' = '2d';
  private animationId: number | null = null;
  private isRendering = false;
  
  // Performance tracking
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private renderStats: RenderStats = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    vertexCount: 0,
    memoryUsage: 0,
  };

  // Animation state
  private currentFrames: AnimationFrame[] = [];
  private currentFrameIndex = 0;
  private playbackSpeed = 1;
  private isLooping = false;

  constructor(canvas: HTMLCanvasElement, options: Partial<CanvasRenderOptions> = {}) {
    this.canvas = canvas;
    this.initializeRenderer(options);
  }

  /**
   * Initialize the renderer with optimal settings
   */
  private initializeRenderer(options: Partial<CanvasRenderOptions>): void {
    const defaultOptions: CanvasRenderOptions = {
      width: 800,
      height: 600,
      devicePixelRatio: window.devicePixelRatio || 1,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Set canvas size
    this.canvas.width = finalOptions.width * finalOptions.devicePixelRatio;
    this.canvas.height = finalOptions.height * finalOptions.devicePixelRatio;
    this.canvas.style.width = `${finalOptions.width}px`;
    this.canvas.style.height = `${finalOptions.height}px`;

    // Try to initialize WebGL first for hardware acceleration
    try {
      this.webglCtx = this.canvas.getContext('webgl', {
        antialias: finalOptions.antialias,
        alpha: finalOptions.alpha,
        preserveDrawingBuffer: finalOptions.preserveDrawingBuffer,
        powerPreference: finalOptions.powerPreference,
      }) || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;

      if (this.webglCtx) {
        this.renderMode = 'webgl';
        this.setupWebGL();
      }
    } catch (error) {
      console.warn('WebGL not available, falling back to 2D canvas:', error);
    }

    // Fallback to 2D canvas
    if (!this.webglCtx) {
      this.ctx = this.canvas.getContext('2d');
      if (this.ctx) {
        this.renderMode = '2d';
        this.setup2D(finalOptions);
      }
    }

    // Try OffscreenCanvas for better performance
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        this.offscreenCanvas = new OffscreenCanvas(
          finalOptions.width * finalOptions.devicePixelRatio,
          finalOptions.height * finalOptions.devicePixelRatio
        );
        this.renderMode = 'offscreen';
      } catch (error) {
        console.warn('OffscreenCanvas not available:', error);
      }
    }
  }

  /**
   * Setup WebGL context for hardware acceleration
   */
  private setupWebGL(): void {
    if (!this.webglCtx) return;

    const gl = this.webglCtx;

    // Enable depth testing and blending
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Set viewport
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Create shaders for SVG rendering
    this.createWebGLShaders();
  }

  /**
   * Setup 2D canvas context
   */
  private setup2D(options: CanvasRenderOptions): void {
    if (!this.ctx) return;

    // Scale for device pixel ratio
    this.ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    // Set rendering quality
    this.ctx.imageSmoothingEnabled = options.antialias;
    if (options.antialias) {
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  /**
   * Render SVG content to canvas with hardware acceleration
   */
  async renderSVG(svgContent: string, clearCanvas = true): Promise<void> {
    const startTime = performance.now();

    if (clearCanvas) {
      this.clear();
    }

    switch (this.renderMode) {
      case 'webgl':
        await this.renderSVGWebGL(svgContent);
        break;
      case 'offscreen':
        await this.renderSVGOffscreen(svgContent);
        break;
      case '2d':
      default:
        await this.renderSVG2D(svgContent);
        break;
    }

    // Update performance stats
    const frameTime = performance.now() - startTime;
    this.updatePerformanceStats(frameTime);
  }

  /**
   * Render animation frames with optimal performance
   */
  async renderAnimation(frames: AnimationFrame[], loop = false): Promise<void> {
    this.currentFrames = frames;
    this.currentFrameIndex = 0;
    this.isLooping = loop;
    this.isRendering = true;

    const renderFrame = async () => {
      if (!this.isRendering || this.currentFrames.length === 0) return;

      const frame = this.currentFrames[this.currentFrameIndex];
      await this.renderSVG(frame.svgContent);

      this.currentFrameIndex++;
      
      if (this.currentFrameIndex >= this.currentFrames.length) {
        if (this.isLooping) {
          this.currentFrameIndex = 0;
        } else {
          this.stopAnimation();
          return;
        }
      }

      // Schedule next frame based on playback speed
      const delay = (1000 / 60) / this.playbackSpeed; // 60 FPS base
      setTimeout(() => {
        this.animationId = requestAnimationFrame(renderFrame);
      }, delay);
    };

    this.animationId = requestAnimationFrame(renderFrame);
  }

  /**
   * Stop current animation
   */
  stopAnimation(): void {
    this.isRendering = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Set playback speed (1.0 = normal, 2.0 = double speed, 0.5 = half speed)
   */
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    switch (this.renderMode) {
      case 'webgl':
        if (this.webglCtx) {
          this.webglCtx.clear(this.webglCtx.COLOR_BUFFER_BIT | this.webglCtx.DEPTH_BUFFER_BIT);
        }
        break;
      case '2d':
      case 'offscreen':
      default:
        if (this.ctx) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        break;
    }
  }

  /**
   * Get current render statistics
   */
  getRenderStats(): RenderStats {
    return { ...this.renderStats };
  }

  /**
   * Check if hardware acceleration is available
   */
  isHardwareAccelerated(): boolean {
    return this.renderMode === 'webgl';
  }

  /**
   * Get supported render modes
   */
  getSupportedModes(): string[] {
    const modes = ['2d'];
    
    if (this.webglCtx) {
      modes.push('webgl');
    }
    
    if (typeof OffscreenCanvas !== 'undefined') {
      modes.push('offscreen');
    }
    
    return modes;
  }

  /**
   * Switch render mode
   */
  switchRenderMode(mode: '2d' | 'webgl' | 'offscreen'): boolean {
    if (!this.getSupportedModes().includes(mode)) {
      return false;
    }
    
    this.renderMode = mode;
    return true;
  }

  /**
   * Capture current canvas as image
   */
  captureFrame(format: 'png' | 'jpeg' | 'webp' = 'png', quality = 0.9): string {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Export canvas as blob
   */
  async exportAsBlob(format: 'png' | 'jpeg' | 'webp' = 'png', quality = 0.9): Promise<Blob> {
    return new Promise((resolve) => {
      this.canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, `image/${format}`, quality);
    });
  }

  private async renderSVG2D(svgContent: string): Promise<void> {
    if (!this.ctx) return;

    const img = await this.svgToImage(svgContent);
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    this.renderStats.drawCalls++;
  }

  private async renderSVGWebGL(svgContent: string): Promise<void> {
    if (!this.webglCtx) return;

    // Convert SVG to texture and render with WebGL
    const img = await this.svgToImage(svgContent);
    const texture = this.createTextureFromImage(img);
    
    if (texture) {
      this.renderTextureWebGL(texture);
      this.renderStats.drawCalls++;
    }
  }

  private async renderSVGOffscreen(svgContent: string): Promise<void> {
    if (!this.offscreenCanvas || !this.ctx) return;

    // Render to offscreen canvas first, then copy to main canvas
    const offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    const img = await this.svgToImage(svgContent);
    offscreenCtx.drawImage(img, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    
    // Copy from offscreen to main canvas
    this.ctx.drawImage(this.offscreenCanvas as any, 0, 0);
    this.renderStats.drawCalls++;
  }

  private async svgToImage(svgContent: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load SVG'));
      };
      
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      img.src = URL.createObjectURL(svgBlob);
    });
  }

  private createTextureFromImage(img: HTMLImageElement): WebGLTexture | null {
    if (!this.webglCtx) return null;

    const gl = this.webglCtx;
    const texture = gl.createTexture();
    
    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
  }

  private renderTextureWebGL(texture: WebGLTexture): void {
    if (!this.webglCtx) return;

    const gl = this.webglCtx;
    
    // Bind texture and render quad
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // This is a simplified WebGL rendering
    // In a full implementation, you'd have proper shaders and geometry
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private createWebGLShaders(): void {
    if (!this.webglCtx) return;

    const gl = this.webglCtx;

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (vertexShader && fragmentShader) {
      const program = gl.createProgram();
      if (program) {
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);
      }
    }
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.webglCtx) return null;

    const gl = this.webglCtx;
    const shader = gl.createShader(type);
    
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private updatePerformanceStats(frameTime: number): void {
    this.frameCount++;
    this.renderStats.frameTime = frameTime;
    
    // Calculate FPS
    const now = performance.now();
    if (now - this.lastFrameTime >= 1000) {
      this.renderStats.fps = this.frameCount;
      this.fpsHistory.push(this.renderStats.fps);
      
      // Keep only last 60 seconds of FPS history
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    // Estimate memory usage (simplified)
    // `performance.memory` only exists in Chromium, so it is not in the standard typings
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    if (memory) {
      this.renderStats.memoryUsage = memory.usedJSHeapSize;
    }
  }

  /**
   * Get average FPS over time
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  /**
   * Check if rendering performance is good
   */
  isPerformanceGood(): boolean {
    return this.renderStats.fps >= 30 && this.renderStats.frameTime < 33; // 30 FPS, <33ms frame time
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.renderStats.fps < 30) {
      recommendations.push('Consider reducing animation complexity or frame rate');
    }
    
    if (this.renderStats.frameTime > 50) {
      recommendations.push('Frame rendering is slow, try hardware acceleration');
    }
    
    if (!this.isHardwareAccelerated()) {
      recommendations.push('Enable WebGL for better performance');
    }
    
    if (this.renderStats.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected, consider optimizing SVG complexity');
    }
    
    return recommendations;
  }
}

// Utility functions
export function createCanvasRenderOptions(overrides: Partial<CanvasRenderOptions> = {}): CanvasRenderOptions {
  return {
    width: 800,
    height: 600,
    devicePixelRatio: window.devicePixelRatio || 1,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    ...overrides,
  };
}

export function detectOptimalRenderSettings(): Partial<CanvasRenderOptions> {
  const settings: Partial<CanvasRenderOptions> = {};
  
  // Detect device capabilities
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  
  if (isMobile || isLowEnd) {
    settings.powerPreference = 'low-power';
    settings.antialias = false;
    settings.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  } else {
    settings.powerPreference = 'high-performance';
    settings.antialias = true;
    settings.devicePixelRatio = window.devicePixelRatio || 1;
  }
  
  return settings;
}
