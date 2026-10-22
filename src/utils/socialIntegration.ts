export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  maxFileSize: number; // in bytes
  supportedFormats: string[];
  aspectRatios: { name: string; ratio: number }[];
  description: string;
}

export interface ShareOptions {
  platform: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  url?: string;
  file?: Blob;
  filename?: string;
}

export interface ShareResult {
  success: boolean;
  platform: string;
  shareUrl?: string;
  error?: string;
}

export class SocialIntegrator {
  private platforms: Map<string, SocialPlatform> = new Map();

  constructor() {
    this.initializePlatforms();
  }

  /**
   * Get all available social platforms
   */
  getPlatforms(): SocialPlatform[] {
    return Array.from(this.platforms.values());
  }

  /**
   * Get specific platform by ID
   */
  getPlatform(platformId: string): SocialPlatform | undefined {
    return this.platforms.get(platformId);
  }

  /**
   * Share content to social platform
   */
  async shareToSocial(options: ShareOptions): Promise<ShareResult> {
    const platform = this.platforms.get(options.platform);
    
    if (!platform) {
      return {
        success: false,
        platform: options.platform,
        error: 'Platform not supported',
      };
    }

    try {
      switch (options.platform) {
        case 'twitter':
          return await this.shareToTwitter(options, platform);
        case 'facebook':
          return await this.shareToFacebook(options, platform);
        case 'instagram':
          return await this.shareToInstagram(options, platform);
        case 'linkedin':
          return await this.shareToLinkedIn(options, platform);
        case 'pinterest':
          return await this.shareToPinterest(options, platform);
        case 'reddit':
          return await this.shareToReddit(options, platform);
        case 'tumblr':
          return await this.shareToTumblr(options, platform);
        default:
          return await this.shareGeneric(options, platform);
      }
    } catch (error) {
      return {
        success: false,
        platform: options.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate shareable link for animation
   */
  async generateShareableLink(
    sourceSVG: string,
    targetSVG: string,
    animationSettings: any
  ): Promise<string> {
    // In a real implementation, this would upload to a server and return a URL
    // For now, we'll create a data URL or use local storage
    
    const shareData = {
      source: sourceSVG,
      target: targetSVG,
      settings: animationSettings,
      timestamp: Date.now(),
    };

    // Compress and encode the data
    const compressed = this.compressData(JSON.stringify(shareData));
    const encoded = btoa(compressed);
    
    // Create a shareable URL (in practice, this would be a proper URL)
    return `${window.location.origin}/shared/${encoded}`;
  }

  /**
   * Create social media preview image
   */
  async createPreviewImage(
    svgContent: string,
    width: number = 1200,
    height: number = 630
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#262a23');
    gradient.addColorStop(1, '#5cbe2c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add SVG content
    const img = await this.svgToImage(svgContent);
    const aspectRatio = img.width / img.height;
    const maxWidth = width * 0.6;
    const maxHeight = height * 0.6;
    
    let drawWidth = maxWidth;
    let drawHeight = maxWidth / aspectRatio;
    
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = maxHeight * aspectRatio;
    }
    
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    
    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Add branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SVG Morph', width / 2, height - 60);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/png');
    });
  }

  /**
   * Validate file for platform requirements
   */
  validateFileForPlatform(file: Blob, platformId: string): { valid: boolean; errors: string[] } {
    const platform = this.platforms.get(platformId);
    const errors: string[] = [];

    if (!platform) {
      errors.push('Platform not supported');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > platform.maxFileSize) {
      errors.push(`File size exceeds ${this.formatFileSize(platform.maxFileSize)} limit`);
    }

    // Check file format
    const fileType = file.type;
    if (!platform.supportedFormats.some(format => fileType.includes(format))) {
      errors.push(`File format not supported. Supported formats: ${platform.supportedFormats.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get optimal settings for platform
   */
  getOptimalSettingsForPlatform(platformId: string): {
    width: number;
    height: number;
    format: string;
    maxDuration: number;
  } {
    const platform = this.platforms.get(platformId);
    
    if (!platform) {
      return { width: 800, height: 600, format: 'mp4', maxDuration: 30 };
    }

    const settings: Record<string, any> = {
      twitter: { width: 1280, height: 720, format: 'mp4', maxDuration: 140 },
      facebook: { width: 1280, height: 720, format: 'mp4', maxDuration: 240 },
      instagram: { width: 1080, height: 1080, format: 'mp4', maxDuration: 60 },
      linkedin: { width: 1280, height: 720, format: 'mp4', maxDuration: 600 },
      pinterest: { width: 1000, height: 1500, format: 'gif', maxDuration: 15 },
      reddit: { width: 800, height: 600, format: 'gif', maxDuration: 60 },
      tumblr: { width: 540, height: 540, format: 'gif', maxDuration: 30 },
    };

    return settings[platformId] || { width: 800, height: 600, format: 'mp4', maxDuration: 30 };
  }

  private initializePlatforms(): void {
    const platforms: SocialPlatform[] = [
      {
        id: 'twitter',
        name: 'Twitter',
        icon: '🐦',
        color: '#1DA1F2',
        maxFileSize: 512 * 1024 * 1024, // 512MB
        supportedFormats: ['mp4', 'gif'],
        aspectRatios: [
          { name: 'Landscape', ratio: 16/9 },
          { name: 'Square', ratio: 1 },
          { name: 'Portrait', ratio: 9/16 },
        ],
        description: 'Share your SVG animations on Twitter with up to 2:20 video length',
      },
      {
        id: 'facebook',
        name: 'Facebook',
        icon: '📘',
        color: '#4267B2',
        maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
        supportedFormats: ['mp4', 'gif'],
        aspectRatios: [
          { name: 'Landscape', ratio: 16/9 },
          { name: 'Square', ratio: 1 },
          { name: 'Portrait', ratio: 4/5 },
        ],
        description: 'Share on Facebook with support for longer videos and high quality',
      },
      {
        id: 'instagram',
        name: 'Instagram',
        icon: '📷',
        color: '#E4405F',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['mp4'],
        aspectRatios: [
          { name: 'Square', ratio: 1 },
          { name: 'Portrait', ratio: 4/5 },
          { name: 'Story', ratio: 9/16 },
        ],
        description: 'Perfect for Instagram posts and stories with square or portrait format',
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: '💼',
        color: '#0077B5',
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
        supportedFormats: ['mp4'],
        aspectRatios: [
          { name: 'Landscape', ratio: 16/9 },
          { name: 'Square', ratio: 1 },
        ],
        description: 'Share professional animations on LinkedIn with extended video support',
      },
      {
        id: 'pinterest',
        name: 'Pinterest',
        icon: '📌',
        color: '#BD081C',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['gif', 'mp4'],
        aspectRatios: [
          { name: 'Portrait', ratio: 2/3 },
          { name: 'Square', ratio: 1 },
        ],
        description: 'Pin your animations with Pinterest\'s vertical format preference',
      },
      {
        id: 'reddit',
        name: 'Reddit',
        icon: '🤖',
        color: '#FF4500',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['gif', 'mp4'],
        aspectRatios: [
          { name: 'Any', ratio: 0 }, // Reddit is flexible
        ],
        description: 'Share on Reddit communities with GIF and video support',
      },
      {
        id: 'tumblr',
        name: 'Tumblr',
        icon: '📝',
        color: '#00CF35',
        maxFileSize: 100 * 1024 * 1024, // 100MB
        supportedFormats: ['gif', 'mp4'],
        aspectRatios: [
          { name: 'Square', ratio: 1 },
          { name: 'Landscape', ratio: 16/9 },
        ],
        description: 'Perfect for Tumblr\'s creative community with GIF support',
      },
    ];

    platforms.forEach(platform => {
      this.platforms.set(platform.id, platform);
    });
  }

  private async shareToTwitter(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const text = this.buildTwitterText(options);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    this.openShareWindow(url);
    
    return {
      success: true,
      platform: 'twitter',
      shareUrl: url,
    };
  }

  private async shareToFacebook(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const url = options.url || window.location.href;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    
    this.openShareWindow(shareUrl);
    
    return {
      success: true,
      platform: 'facebook',
      shareUrl,
    };
  }

  private async shareToInstagram(_options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    // Instagram doesn't support direct web sharing, so we provide instructions
    return {
      success: true,
      platform: 'instagram',
      error: 'Please download the video and share it manually on Instagram',
    };
  }

  private async shareToLinkedIn(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const url = options.url || window.location.href;
    const title = options.title || 'SVG Morph Animation';
    const summary = options.description || 'Check out this amazing SVG morphing animation!';
    
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;
    
    this.openShareWindow(shareUrl);
    
    return {
      success: true,
      platform: 'linkedin',
      shareUrl,
    };
  }

  private async shareToPinterest(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const url = options.url || window.location.href;
    const description = options.description || 'Amazing SVG morphing animation created with SVG Morph';
    
    // Pinterest requires an image URL, so we'd need to upload the preview first
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(description)}`;
    
    this.openShareWindow(shareUrl);
    
    return {
      success: true,
      platform: 'pinterest',
      shareUrl,
    };
  }

  private async shareToReddit(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const url = options.url || window.location.href;
    const title = options.title || 'Amazing SVG Morphing Animation';
    
    const shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    
    this.openShareWindow(shareUrl);
    
    return {
      success: true,
      platform: 'reddit',
      shareUrl,
    };
  }

  private async shareToTumblr(options: ShareOptions, _platform: SocialPlatform): Promise<ShareResult> {
    const url = options.url || window.location.href;
    const caption = options.description || 'Check out this SVG morphing animation!';
    
    const shareUrl = `https://www.tumblr.com/widgets/share/tool?posttype=link&title=${encodeURIComponent(options.title || '')}&caption=${encodeURIComponent(caption)}&content=${encodeURIComponent(url)}`;
    
    this.openShareWindow(shareUrl);
    
    return {
      success: true,
      platform: 'tumblr',
      shareUrl,
    };
  }

  private async shareGeneric(options: ShareOptions, platform: SocialPlatform): Promise<ShareResult> {
    // Fallback to Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.description,
          url: options.url,
        });
        
        return {
          success: true,
          platform: platform.id,
        };
      } catch (_error) {
        return {
          success: false,
          platform: platform.id,
          error: 'Share cancelled or failed',
        };
      }
    }
    
    return {
      success: false,
      platform: platform.id,
      error: 'Platform not supported for direct sharing',
    };
  }

  private buildTwitterText(options: ShareOptions): string {
    let text = options.title || 'Check out this amazing SVG morphing animation!';
    
    if (options.description) {
      text += ` ${options.description}`;
    }
    
    if (options.hashtags && options.hashtags.length > 0) {
      text += ` ${options.hashtags.map(tag => `#${tag}`).join(' ')}`;
    }
    
    if (options.url) {
      text += ` ${options.url}`;
    }
    
    // Twitter has a 280 character limit
    if (text.length > 280) {
      text = text.substring(0, 277) + '...';
    }
    
    return text;
  }

  private openShareWindow(url: string): void {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
      url,
      'share',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  }

  private async svgToImage(svgContent: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load SVG'));
      
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
    });
  }

  private compressData(data: string): string {
    // Simple compression (in practice, you'd use a proper compression library)
    return data.replace(/\s+/g, ' ').trim();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const socialIntegrator = new SocialIntegrator();

// Utility functions
export function createShareOptions(overrides: Partial<ShareOptions> = {}): ShareOptions {
  return {
    platform: 'twitter',
    title: 'Amazing SVG Morphing Animation',
    description: 'Created with SVG Morph - the ultimate tool for SVG animations',
    hashtags: ['SVGMorph', 'Animation', 'WebDev'],
    ...overrides,
  };
}

export function getSuggestedHashtags(animationType: string): string[] {
  const baseTags = ['SVGMorph', 'Animation', 'WebDev', 'Creative'];
  
  const typeTags: Record<string, string[]> = {
    spring: ['SpringAnimation', 'Physics'],
    elastic: ['ElasticAnimation', 'Bounce'],
    gradient: ['GradientMorph', 'ColorTransition'],
    text: ['TextAnimation', 'Typography'],
    multipath: ['ComplexAnimation', 'SVGArt'],
  };
  
  return [...baseTags, ...(typeTags[animationType] || [])];
}
