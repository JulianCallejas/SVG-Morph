import { useEffect, useCallback, useRef } from 'react';
import { useMorphStore } from '../store/morphStore';
import { gradientMorpher } from '../utils/gradientMorphing';
import { textPathMorpher } from '../utils/textPathMorphing';
import { multiPathProcessor } from '../utils/multiPathSupport';
import { physicsSimulator } from '../utils/physicsSimulation';
import { videoExporter } from '../utils/videoExport';
import { socialIntegrator } from '../utils/socialIntegration';
import { CanvasRenderer } from '../utils/canvasRenderer';
import { svgUpdateManager } from '../utils/debouncedUpdates';
import { memoryManager, svgMemoryManager } from '../utils/memoryManagement';
import { progressiveLoader } from '../utils/progressiveLoading';

export interface Phase4Features {
  // Gradient morphing
  applyGradientMorphing: (progress: number) => Promise<string>;
  
  // Text path morphing
  applyTextPathMorphing: (progress: number) => Promise<string>;
  
  // Multi-path support
  applyMultiPathMorphing: (progress: number) => Promise<string>;
  
  // Physics simulation
  applyPhysicsAnimation: (type: 'spring' | 'elastic' | 'damped', duration: number) => Promise<string[]>;
  
  // Video export
  exportAsVideo: (format: 'gif' | 'mp4' | 'webm') => Promise<Blob>;
  
  // Social sharing
  shareToSocial: (platform: string, options?: Record<string, unknown>) => Promise<void>;
  
  // Canvas rendering
  renderToCanvas: (canvas: HTMLCanvasElement, svgContent: string) => Promise<void>;
  
  // Performance optimization
  optimizeMemory: () => void;
  optimizePerformance: () => void;
  
  // Progressive loading
  preloadComponents: (components: string[]) => Promise<void>;
  
  // Debounced updates
  enableDebouncedUpdates: (enabled: boolean) => void;
  
  // Utility functions
  getMemoryStats: () => Record<string, unknown>;
  getPerformanceStats: () => Record<string, unknown>;
  getLoadingStats: () => Record<string, unknown>;
}

export function usePhase4Features(): Phase4Features {
  const {
    sourceSVG,
    targetSVG,
    // gradientMorphOptions, // Unused but kept for potential future use
    // textMorphOptions, // Unused but kept for potential future use
    // multiPathMorphOptions, // Unused but kept for potential future use
    physicsOptions,
    videoExportOptions,
    shareOptions,
    canvasRenderOptions,
    enableMemoryOptimization,
    enableProgressiveLoading,
    debouncedUpdatesEnabled,
    animationType,
  } = useMorphStore();

  const canvasRendererRef = useRef<CanvasRenderer | null>(null);
  const memoryOptimizationRef = useRef<boolean>(false);

  // Initialize Phase 4 features
  useEffect(() => {
    // Initialize debounced updates
    if (debouncedUpdatesEnabled) {
      svgUpdateManager.initializeSVGUpdates({
        onAnimationSettingsChange: (settings) => {
          console.log('Animation settings updated:', settings);
        },
        onPhysicsSettingsChange: (settings) => {
          console.log('Physics settings updated:', settings);
        },
      });
    }

    // Initialize memory optimization
    if (enableMemoryOptimization && !memoryOptimizationRef.current) {
      memoryOptimizationRef.current = true;
      
      // Set up automatic memory cleanup
      const cleanupInterval = setInterval(() => {
        const stats = memoryManager.getMemoryStats();
        if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
          memoryManager.handleMemoryPressure();
          svgMemoryManager.handleMemoryPressure();
        }
      }, 30000); // Check every 30 seconds

      return () => {
        clearInterval(cleanupInterval);
        memoryOptimizationRef.current = false;
      };
    }
  }, [debouncedUpdatesEnabled, enableMemoryOptimization]);

  // Initialize progressive loading
  useEffect(() => {
    if (enableProgressiveLoading) {
      // Register Phase 4 components for progressive loading
      progressiveLoader.register('AdvancedGradientPanel', {
        component: () => import('../components/AdvancedGradientPanel'),
        priority: 'medium',
        preload: false,
      });

      progressiveLoader.register('TextPathEditor', {
        component: () => import('../components/TextPathEditor'),
        priority: 'medium',
        preload: false,
      });

      progressiveLoader.register('MultiPathVisualizer', {
        component: () => import('../components/MultiPathVisualizer'),
        priority: 'low',
        preload: false,
      });

      progressiveLoader.register('PhysicsControls', {
        component: () => import('../components/PhysicsControls'),
        priority: 'low',
        preload: false,
      });

      progressiveLoader.register('VideoExportPanel', {
        component: () => import('../components/VideoExportPanel'),
        priority: 'low',
        preload: false,
      });

      progressiveLoader.register('SocialSharingPanel', {
        component: () => import('../components/SocialSharingPanel'),
        priority: 'low',
        preload: false,
      });
    }
  }, [enableProgressiveLoading]);

  // Apply gradient morphing
  const applyGradientMorphing = useCallback(async (progress: number): Promise<string> => {
    if (!sourceSVG || !targetSVG) {
      throw new Error('Source and target SVGs are required');
    }

    try {
      const morphedSVG = gradientMorpher.applyGradientMorphing(sourceSVG, targetSVG, progress);
      
      // Cache the result if memory optimization is enabled
      if (enableMemoryOptimization) {
        svgMemoryManager.cacheSVG(`gradient-${progress}`, morphedSVG, { progress, type: 'gradient' });
      }
      
      return morphedSVG;
    } catch (error) {
      console.error('Gradient morphing failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, enableMemoryOptimization]);

  // Apply text path morphing
  const applyTextPathMorphing = useCallback(async (progress: number): Promise<string> => {
    if (!sourceSVG || !targetSVG) {
      throw new Error('Source and target SVGs are required');
    }

    try {
      const morphedSVG = textPathMorpher.applyTextPathMorphing(sourceSVG, targetSVG, progress);
      
      if (enableMemoryOptimization) {
        svgMemoryManager.cacheSVG(`textpath-${progress}`, morphedSVG, { progress, type: 'textpath' });
      }
      
      return morphedSVG;
    } catch (error) {
      console.error('Text path morphing failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, enableMemoryOptimization]);

  // Apply multi-path morphing
  const applyMultiPathMorphing = useCallback(async (progress: number): Promise<string> => {
    if (!sourceSVG || !targetSVG) {
      throw new Error('Source and target SVGs are required');
    }

    try {
      const sourceData = multiPathProcessor.parseSVG(sourceSVG);
      const targetData = multiPathProcessor.parseSVG(targetSVG);
      const morphedData = multiPathProcessor.morphMultiPathSVGs(sourceData, targetData, progress);
      const morphedSVG = multiPathProcessor.generateSVG(morphedData);
      
      if (enableMemoryOptimization) {
        svgMemoryManager.cacheSVG(`multipath-${progress}`, morphedSVG, { progress, type: 'multipath' });
      }
      
      return morphedSVG;
    } catch (error) {
      console.error('Multi-path morphing failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, enableMemoryOptimization]);

  // Apply physics animation
  const applyPhysicsAnimation = useCallback(async (
    type: 'spring' | 'elastic' | 'damped',
    duration: number
  ): Promise<string[]> => {
    if (!sourceSVG || !targetSVG) {
      throw new Error('Source and target SVGs are required');
    }

    try {
      const frames = physicsSimulator.applyPhysicsToMorph(
        sourceSVG,
        targetSVG,
        type,
        duration,
        physicsOptions
      );
      
      if (enableMemoryOptimization) {
        svgMemoryManager.cacheAnimationFrames(`physics-${type}-${duration}`, frames);
      }
      
      return frames;
    } catch (error) {
      console.error('Physics animation failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, physicsOptions, enableMemoryOptimization]);

  // Export as video
  const exportAsVideo = useCallback(async (format: 'gif' | 'mp4' | 'webm'): Promise<Blob> => {
    if (!sourceSVG || !targetSVG) {
      throw new Error('Source and target SVGs are required');
    }

    try {
      const options = { ...videoExportOptions, format };
      
      const blob = await videoExporter.exportVideo(
        sourceSVG,
        targetSVG,
        options,
        (progress) => {
          console.log('Video export progress:', progress);
        }
      );
      
      return blob;
    } catch (error) {
      console.error('Video export failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, videoExportOptions]);

  // Share to social media
  const shareToSocial = useCallback(async (platform: string, options?: Record<string, unknown>): Promise<void> => {
    try {
      const shareOptions = { ...shareOptions, platform, ...options };
      
      // Generate shareable link if needed
      if (!shareOptions.url && sourceSVG && targetSVG) {
        shareOptions.url = await socialIntegrator.generateShareableLink(
          sourceSVG,
          targetSVG,
          { animationType, duration: 3 }
        );
      }
      
      const result = await socialIntegrator.shareToSocial(shareOptions);
      
      if (!result.success) {
        throw new Error(result.error || 'Social sharing failed');
      }
    } catch (error) {
      console.error('Social sharing failed:', error);
      throw error;
    }
  }, [sourceSVG, targetSVG, animationType]);

  // Render to canvas
  const renderToCanvas = useCallback(async (canvas: HTMLCanvasElement, svgContent: string): Promise<void> => {
    try {
      if (!canvasRendererRef.current) {
        canvasRendererRef.current = new CanvasRenderer(canvas, canvasRenderOptions);
      }
      
      await canvasRendererRef.current.renderSVG(svgContent);
    } catch (error) {
      console.error('Canvas rendering failed:', error);
      throw error;
    }
  }, [canvasRenderOptions]);

  // Optimize memory
  const optimizeMemory = useCallback(() => {
    try {
      const result = memoryManager.optimize();
      const svgResult = svgMemoryManager.optimize();
      
      console.log('Memory optimization completed:', {
        general: result,
        svg: svgResult,
      });
    } catch (error) {
      console.error('Memory optimization failed:', error);
    }
  }, []);

  // Optimize performance
  const optimizePerformance = useCallback(() => {
    try {
      // Clear caches if memory pressure is high
      const memoryStats = memoryManager.getMemoryStats();
      if (memoryStats.memoryPressure === 'high' || memoryStats.memoryPressure === 'critical') {
        optimizeMemory();
      }
      
      // Enable hardware acceleration if available
      if (canvasRendererRef.current && !canvasRendererRef.current.isHardwareAccelerated()) {
        canvasRendererRef.current.switchRenderMode('webgl');
      }
      
      // Enable debounced updates
      if (!debouncedUpdatesEnabled) {
        svgUpdateManager.initializeSVGUpdates({});
      }
      
      console.log('Performance optimization completed');
    } catch (error) {
      console.error('Performance optimization failed:', error);
    }
  }, [debouncedUpdatesEnabled, optimizeMemory]);

  // Preload components
  const preloadComponents = useCallback(async (components: string[]): Promise<void> => {
    try {
      await progressiveLoader.preloadMultiple(components);
    } catch (error) {
      console.error('Component preloading failed:', error);
      throw error;
    }
  }, []);

  // Enable/disable debounced updates
  const enableDebouncedUpdates = useCallback((enabled: boolean) => {
    if (enabled) {
      svgUpdateManager.initializeSVGUpdates({
        onAnimationSettingsChange: (settings) => {
          console.log('Debounced animation settings:', settings);
        },
        onPhysicsSettingsChange: (settings) => {
          console.log('Debounced physics settings:', settings);
        },
      });
    } else {
      svgUpdateManager.cancelAll();
    }
  }, []);

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    const generalStats = memoryManager.getMemoryStats();
    const svgStats = svgMemoryManager.getSVGMemoryStats();
    const cacheStats = memoryManager.getCacheStats();
    
    return {
      ...generalStats,
      ...svgStats,
      cache: cacheStats,
    };
  }, []);

  // Get performance statistics
  const getPerformanceStats = useCallback(() => {
    if (canvasRendererRef.current) {
      const renderStats = canvasRendererRef.current.getRenderStats();
      const isHardwareAccelerated = canvasRendererRef.current.isHardwareAccelerated();
      const averageFPS = canvasRendererRef.current.getAverageFPS();
      const performanceGood = canvasRendererRef.current.isPerformanceGood();
      const recommendations = canvasRendererRef.current.getPerformanceRecommendations();
      
      return {
        ...renderStats,
        isHardwareAccelerated,
        averageFPS,
        performanceGood,
        recommendations,
      };
    }
    
    return null;
  }, []);

  // Get loading statistics
  const getLoadingStats = useCallback(() => {
    const progressiveStats = progressiveLoader.getStats();
    const debouncedStats = {
      pendingUpdates: svgUpdateManager.getPendingCount(),
      hasPendingUpdates: svgUpdateManager.hasPendingUpdates(),
    };
    
    return {
      progressive: progressiveStats,
      debounced: debouncedStats,
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      svgUpdateManager.cancelAll();
      if (canvasRendererRef.current) {
        canvasRendererRef.current.destroy?.();
      }
    };
  }, []);

  return {
    applyGradientMorphing,
    applyTextPathMorphing,
    applyMultiPathMorphing,
    applyPhysicsAnimation,
    exportAsVideo,
    shareToSocial,
    renderToCanvas,
    optimizeMemory,
    optimizePerformance,
    preloadComponents,
    enableDebouncedUpdates,
    getMemoryStats,
    getPerformanceStats,
    getLoadingStats,
  };
}

// Utility hook for Phase 4 performance monitoring
export function usePhase4Performance() {
  const { getMemoryStats, getPerformanceStats } = usePhase4Features();
  
  const [stats, setStats] = React.useState<{
    memory: Record<string, unknown> | null;
    performance: Record<string, unknown> | null;
    lastUpdate: number;
  }>({
    memory: null,
    performance: null,
    lastUpdate: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      const memory = getMemoryStats();
      const performance = getPerformanceStats();
      
      setStats({
        memory,
        performance,
        lastUpdate: Date.now(),
      });
    };

    // Update immediately
    updateStats();
    
    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, [getMemoryStats, getPerformanceStats]);

  return stats;
}

// Global React import (would be imported from 'react' in actual usage)
declare const React: any;
