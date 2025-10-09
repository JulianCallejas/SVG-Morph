import { useEffect, useCallback } from 'react';
import { useMorphStore } from '../store/morphStore';
import { useTutorial } from '../components/InteractiveTutorial';
import { usePerformanceMonitor } from '../components/PerformanceMonitor';
import { useKeyboardShortcuts, createDefaultShortcuts } from '../components/KeyboardShortcuts';
import { useAnimationPresets } from '../components/AnimationPresets';
import { useRecentFiles } from '../components/RecentFilesHistory';
import { useErrorHandler } from '../components/ErrorBoundary';

export const usePhase3Features = () => {
  const store = useMorphStore();
  const tutorial = useTutorial();
  const performanceMonitor = usePerformanceMonitor();
  const { shortcuts, addShortcut } = useKeyboardShortcuts();
  const animationPresets = useAnimationPresets();
  const recentFiles = useRecentFiles();
  const { handleError } = useErrorHandler();

  // Initialize keyboard shortcuts
  useEffect(() => {
    const defaultShortcuts = createDefaultShortcuts({
      uploadSource: () => {
        const input = document.querySelector('[data-tutorial="upload-source"] input') as HTMLInputElement;
        input?.click();
      },
      uploadTarget: () => {
        const input = document.querySelector('[data-tutorial="upload-target"] input') as HTMLInputElement;
        input?.click();
      },
      playAnimation: () => {
        if (store.isAnimating) {
          store.pauseAnimation();
        } else {
          store.startAnimation();
        }
      },
      pauseAnimation: store.pauseAnimation,
      resetAnimation: store.resetAnimation,
      exportAnimation: () => {
        // This would trigger export functionality
        console.log('Export triggered via keyboard shortcut');
      },
      openSettings: () => {
        // This would open settings panel
        console.log('Settings opened via keyboard shortcut');
      },
      toggleFullscreen: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      },
      undo: () => {
        // This would trigger undo functionality
        console.log('Undo triggered via keyboard shortcut');
      },
      redo: () => {
        // This would trigger redo functionality
        console.log('Redo triggered via keyboard shortcut');
      },
      save: () => {
        // This would save the current project
        console.log('Save triggered via keyboard shortcut');
      },
      togglePreview: () => {
        // This would toggle preview mode
        console.log('Preview toggled via keyboard shortcut');
      }
    });

    defaultShortcuts.forEach(shortcut => {
      addShortcut(shortcut);
    });
  }, [addShortcut, store]);

  // Auto-start tutorial for new users
  useEffect(() => {
    if (!tutorial.hasCompletedTutorial) {
      const timer = setTimeout(() => {
        tutorial.startTutorial();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tutorial]);

  // Performance monitoring setup
  useEffect(() => {
    if (performanceMonitor.isEnabled) {
      // Enable performance monitoring
      console.log('Performance monitoring enabled');
    }
  }, [performanceMonitor.isEnabled]);

  // Error handling setup
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleError(new Error(event.message), 'Unhandled Error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(new Error(event.reason), 'Unhandled Promise Rejection');
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  // File handling utilities
  const handleFileUpload = useCallback(async (file: File, isTarget = false) => {
    try {
      const svgContent = await file.text();
      
      if (isTarget) {
        await store.setTargetSVG(svgContent);
      } else {
        await store.setSourceSVG(svgContent);
      }

      // Add to recent files
      recentFiles.addRecentFile({
        name: file.name,
        svgContent,
        size: file.size,
        tags: ['uploaded'],
        metadata: {
          pathCount: (svgContent.match(/<path/g) || []).length,
          elementCount: (svgContent.match(/<[^/][^>]*>/g) || []).length,
          complexity: calculateComplexity(svgContent)
        }
      });

    } catch (error) {
      handleError(error as Error, 'File Upload');
    }
  }, [store, recentFiles, handleError]);

  // Animation preset utilities
  const applyAnimationPreset = useCallback((preset: any) => {
    try {
      store.updateAnimationSettings(preset.settings);
      
      if (preset.customEasing) {
        store.setCustomEasingCurve(preset.name, preset.customEasing);
        store.updateAnimationSettings({ 
          easing: 'custom', 
          customEasing: preset.customEasing 
        });
      }
    } catch (error) {
      handleError(error as Error, 'Apply Animation Preset');
    }
  }, [store, handleError]);

  // Keyframe management utilities
  const addKeyframeAtCurrentTime = useCallback(() => {
    try {
      const newKeyframe = {
        id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        time: store.currentProgress,
        value: store.currentProgress,
        easing: 'easeInOut' as const,
        label: `Keyframe ${store.keyframes.length + 1}`
      };
      
      store.addKeyframe(newKeyframe);
    } catch (error) {
      handleError(error as Error, 'Add Keyframe');
    }
  }, [store, handleError]);

  // Real-time parameter adjustment
  const adjustParameter = useCallback((parameterId: string, value: number) => {
    try {
      switch (parameterId) {
        case 'duration':
          store.updateAnimationSettings({ duration: value });
          break;
        case 'playbackSpeed':
          store.updateAnimationSettings({ playbackSpeed: value });
          break;
        case 'colorBlending':
          store.updateAnimationSettings({ colorInterpolation: value > 0.5 });
          break;
        case 'strokeBlending':
          store.updateAnimationSettings({ strokeWidthInterpolation: value > 0.5 });
          break;
        default:
          console.log(`Parameter ${parameterId} adjusted to ${value}`);
      }
    } catch (error) {
      handleError(error as Error, 'Parameter Adjustment');
    }
  }, [store, handleError]);

  // Export utilities
  const exportAnimation = useCallback(async (format: string, options: any = {}) => {
    try {
      // This would integrate with the existing export system from Phase 2
      console.log(`Exporting animation as ${format}`, options);
      
      // For now, just log the action
      // In a real implementation, this would call the export system
    } catch (error) {
      handleError(error as Error, 'Export Animation');
    }
  }, [handleError]);

  // Batch processing utilities
  const processBatchFiles = useCallback(async (files: File[]) => {
    try {
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Process each file
        const result = await handleFileUpload(file, i % 2 === 1); // Alternate between source and target
        results.push(result);
      }
      
      return results;
    } catch (error) {
      handleError(error as Error, 'Batch Processing');
      return [];
    }
  }, [handleFileUpload, handleError]);

  return {
    // Store state and actions
    ...store,
    
    // Tutorial system
    tutorial,
    
    // Performance monitoring
    performanceMonitor,
    
    // Keyboard shortcuts
    shortcuts,
    
    // Animation presets
    animationPresets,
    
    // Recent files
    recentFiles,
    
    // Utility functions
    handleFileUpload,
    applyAnimationPreset,
    addKeyframeAtCurrentTime,
    adjustParameter,
    exportAnimation,
    processBatchFiles,
    
    // Error handling
    handleError
  };
};

// Helper function to calculate SVG complexity
function calculateComplexity(svgContent: string): 'low' | 'medium' | 'high' | 'extreme' {
  const pathCount = (svgContent.match(/<path/g) || []).length;
  const elementCount = (svgContent.match(/<[^/][^>]*>/g) || []).length;
  const fileSize = new Blob([svgContent]).size;

  if (elementCount > 500 || pathCount > 200 || fileSize > 1024 * 1024) {
    return 'extreme';
  } else if (elementCount > 200 || pathCount > 100 || fileSize > 512 * 1024) {
    return 'high';
  } else if (elementCount > 50 || pathCount > 25 || fileSize > 100 * 1024) {
    return 'medium';
  } else {
    return 'low';
  }
}
