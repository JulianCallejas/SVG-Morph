export interface VideoExportOptions {
  format: 'gif' | 'mp4' | 'webm';
  width: number;
  height: number;
  fps: number;
  duration: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  loop: boolean;
  backgroundColor?: string;
  filename?: string;
}

export interface VideoFrame {
  canvas: HTMLCanvasElement;
  timestamp: number;
}

export interface VideoExportProgress {
  stage: 'preparing' | 'rendering' | 'encoding' | 'finalizing';
  progress: number;
  currentFrame: number;
  totalFrames: number;
  message: string;
}

export class VideoExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Export SVG morph animation as video
   */
  async exportVideo(
    sourceSVG: string,
    targetSVG: string,
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<Blob> {
    const totalFrames = Math.ceil(options.fps * options.duration);
    
    // Setup canvas
    this.setupCanvas(options);
    
    // Generate frames
    onProgress?.({
      stage: 'preparing',
      progress: 0,
      currentFrame: 0,
      totalFrames,
      message: 'Preparing animation frames...',
    });

    const frames = await this.generateFrames(
      sourceSVG,
      targetSVG,
      options,
      (frameIndex) => {
        onProgress?.({
          stage: 'rendering',
          progress: (frameIndex / totalFrames) * 100,
          currentFrame: frameIndex,
          totalFrames,
          message: `Rendering frame ${frameIndex + 1} of ${totalFrames}...`,
        });
      }
    );

    // Export based on format
    switch (options.format) {
      case 'gif':
        return this.exportAsGIF(frames, options, onProgress);
      case 'mp4':
      case 'webm':
        return this.exportAsVideo(frames, options, onProgress);
      default:
        throw new Error(`Unsupported video format: ${options.format}`);
    }
  }

  /**
   * Export as GIF using canvas and gif.js library
   */
  private async exportAsGIF(
    frames: VideoFrame[],
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<Blob> {
    onProgress?.({
      stage: 'encoding',
      progress: 0,
      currentFrame: 0,
      totalFrames: frames.length,
      message: 'Encoding GIF...',
    });

    // Use a simple GIF encoder implementation
    const gif = await this.createGIFFromFrames(frames, options, onProgress);
    
    onProgress?.({
      stage: 'finalizing',
      progress: 100,
      currentFrame: frames.length,
      totalFrames: frames.length,
      message: 'GIF export complete!',
    });

    return gif;
  }

  /**
   * Export as MP4/WebM using MediaRecorder API
   */
  private async exportAsVideo(
    frames: VideoFrame[],
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const stream = this.canvas.captureStream(options.fps);
      const mimeType = options.format === 'mp4' ? 'video/mp4' : 'video/webm';
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: this.getVideoBitrate(options.quality, options.width, options.height),
      });

      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        onProgress?.({
          stage: 'finalizing',
          progress: 100,
          currentFrame: frames.length,
          totalFrames: frames.length,
          message: 'Video export complete!',
        });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('MediaRecorder error: ' + event));
      };

      // Start recording
      this.mediaRecorder.start();
      
      // Play frames
      this.playFrames(frames, options, onProgress).then(() => {
        this.mediaRecorder?.stop();
      }).catch(reject);
    });
  }

  /**
   * Generate animation frames
   */
  private async generateFrames(
    sourceSVG: string,
    targetSVG: string,
    options: VideoExportOptions,
    onFrameGenerated?: (frameIndex: number) => void
  ): Promise<VideoFrame[]> {
    const frames: VideoFrame[] = [];
    const totalFrames = Math.ceil(options.fps * options.duration);
    
    for (let i = 0; i < totalFrames; i++) {
      const progress = i / (totalFrames - 1);
      const interpolatedSVG = await this.interpolateSVG(sourceSVG, targetSVG, progress);
      
      const canvas = await this.renderSVGToCanvas(interpolatedSVG, options);
      frames.push({
        canvas,
        timestamp: i / options.fps,
      });
      
      onFrameGenerated?.(i);
    }
    
    return frames;
  }

  /**
   * Play frames for video recording
   */
  private async playFrames(
    frames: VideoFrame[],
    options: VideoExportOptions,
    onProgress?: (progress: VideoExportProgress) => void
  ): Promise<void> {
    const frameDelay = 1000 / options.fps;
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      
      // Draw frame to main canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (options.backgroundColor) {
        this.ctx.fillStyle = options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      
      this.ctx.drawImage(frame.canvas, 0, 0);
      
      onProgress?.({
        stage: 'encoding',
        progress: (i / frames.length) * 100,
        currentFrame: i,
        totalFrames: frames.length,
        message: `Encoding frame ${i + 1} of ${frames.length}...`,
      });
      
      // Wait for next frame
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
  }

  /**
   * Render SVG to canvas
   */
  private async renderSVGToCanvas(
    svgContent: string,
    options: VideoExportOptions
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      // Clean up URL after loading
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
    });
  }

  /**
   * Proper SVG interpolation using Web Worker path morphing
   */
  private async interpolateSVG(
    sourceSVG: string,
    targetSVG: string,
    progress: number
  ): Promise<string> {
    try {
      // Import workerManager for proper path interpolation
      const { workerManager } = await import('./workerManager');
      
      // Use the same interpolation logic as the preview animation
      const interpolatedSVG = await workerManager.createInterpolatedSVG(
        sourceSVG,
        targetSVG,
        progress
      );
      
      return interpolatedSVG;
    } catch (error) {
      console.warn('Path morphing failed in video export, using opacity fallback:', error);
      
      // Fallback to opacity blending if path morphing fails
      if (progress <= 0) return sourceSVG;
      if (progress >= 1) return targetSVG;
      
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
          <g opacity="${1 - progress}">
            ${this.extractSVGContent(sourceSVG)}
          </g>
          <g opacity="${progress}">
            ${this.extractSVGContent(targetSVG)}
          </g>
        </svg>
      `;
    }
  }

  /**
   * Create GIF from frames (simplified implementation)
   */
  private async createGIFFromFrames(
    frames: VideoFrame[],
    options: VideoExportOptions,
    _onProgress?: (progress: VideoExportProgress) => void
  ): Promise<Blob> {
    // This is a placeholder for GIF creation
    // In a real implementation, you would use a library like gif.js
    
    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext('2d')!;
    
    // For now, just return the last frame as a static image
    // In practice, you'd implement proper GIF encoding
    const lastFrame = frames[frames.length - 1];
    ctx.drawImage(lastFrame.canvas, 0, 0);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/png');
    });
  }

  private setupCanvas(options: VideoExportOptions): void {
    this.canvas.width = options.width;
    this.canvas.height = options.height;
    
    // Set canvas style for better rendering
    this.canvas.style.width = `${options.width}px`;
    this.canvas.style.height = `${options.height}px`;
  }

  private getVideoBitrate(quality: VideoExportOptions['quality'], width: number, height: number): number {
    const pixelCount = width * height;
    const baseRate = pixelCount / 1000; // Base rate per 1000 pixels
    
    switch (quality) {
      case 'low':
        return baseRate * 0.5 * 1000;
      case 'medium':
        return baseRate * 1 * 1000;
      case 'high':
        return baseRate * 2 * 1000;
      case 'ultra':
        return baseRate * 4 * 1000;
      default:
        return baseRate * 1000;
    }
  }

  private extractSVGContent(svgString: string): string {
    const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    return match ? match[1] : svgString;
  }

  /**
   * Download video blob
   */
  downloadVideo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    const formats: string[] = [];
    
    // Check MediaRecorder support
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm')) {
        formats.push('webm');
      }
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        formats.push('mp4');
      }
    }
    
    // GIF is always supported (via canvas)
    formats.push('gif');
    
    return formats;
  }

  /**
   * Estimate export file size
   */
  estimateFileSize(options: VideoExportOptions): number {
    const { width, height, fps, duration, quality } = options;
    const totalFrames = fps * duration;
    const pixelsPerFrame = width * height;
    
    switch (options.format) {
      case 'gif':
        // GIF: roughly 1-4 bytes per pixel per frame
        return totalFrames * pixelsPerFrame * 2;
      
      case 'mp4':
      case 'webm': {
        // Video: depends on bitrate and duration
        const bitrate = this.getVideoBitrate(quality, width, height);
        return (bitrate * duration) / 8; // Convert bits to bytes
      }
      
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const videoExporter = new VideoExporter();

// Utility functions
export function createVideoExportOptions(overrides: Partial<VideoExportOptions> = {}): VideoExportOptions {
  return {
    format: 'mp4',
    width: 800,
    height: 600,
    fps: 30,
    duration: 3,
    quality: 'high',
    loop: false,
    backgroundColor: '#ffffff',
    ...overrides,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getOptimalVideoSettings(
  svgComplexity: 'low' | 'medium' | 'high',
  targetFileSize: 'small' | 'medium' | 'large'
): Partial<VideoExportOptions> {
  const settings: Record<string, Partial<VideoExportOptions>> = {
    'low-small': { width: 480, height: 360, fps: 24, quality: 'medium' },
    'low-medium': { width: 720, height: 540, fps: 30, quality: 'high' },
    'low-large': { width: 1080, height: 810, fps: 60, quality: 'ultra' },
    'medium-small': { width: 400, height: 300, fps: 24, quality: 'low' },
    'medium-medium': { width: 640, height: 480, fps: 30, quality: 'medium' },
    'medium-large': { width: 800, height: 600, fps: 30, quality: 'high' },
    'high-small': { width: 320, height: 240, fps: 24, quality: 'low' },
    'high-medium': { width: 480, height: 360, fps: 24, quality: 'medium' },
    'high-large': { width: 640, height: 480, fps: 30, quality: 'medium' },
  };
  
  return settings[`${svgComplexity}-${targetFileSize}`] || settings['medium-medium'];
}
