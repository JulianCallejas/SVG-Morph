import { create } from 'zustand';
import { workerManager } from '../utils/workerManager';
import { SVGData } from '../workers/pathProcessor';
import { NodeMatcher, MatchingOptions, NodeMatch } from '../utils/nodeMatching';
import { Point } from '../utils/kdTree';
import { BezierCurve } from '../components/BezierEasingEditor';
import { Keyframe } from '../components/KeyframeTimeline';
import { RecentFile } from '../components/RecentFilesHistory';
import { GradientMorphOptions } from '../utils/gradientMorphing';
import { TextMorphOptions } from '../utils/textPathMorphing';
import { MultiPathMorphOptions } from '../utils/multiPathSupport';
import { PhysicsOptions } from '../utils/physicsSimulation';
import { VideoExportOptions } from '../utils/videoExport';
import { ShareOptions } from '../utils/socialIntegration';
import { CanvasRenderOptions } from '../utils/canvasRenderer';
import { activeContourPlan, planContours, type StyledContour } from '../utils/contourSvg';
import type { ContourPlanEntry } from '../utils/contourPairing';
import { pairManually } from '../utils/contourPlanEditing';

/** A contour picked on one side, waiting for a partner on the other side. */
export type ContourSelection = { side: 'source' | 'target'; id: string } | null;

export type LoopDirection = 'forward' | 'both';

export interface AnimationSettings {
  duration: number;
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut' | 'bounce' | 'elastic' | 'custom';
  colorInterpolation: boolean;
  strokeWidthInterpolation: boolean;
  loop: boolean;
  /** What a loop repeats: the forward pass again, or forward then backward. Only used when `loop` is on. */
  loopDirection: LoopDirection;
  reverse: boolean;
  customEasing?: BezierCurve;
  playbackSpeed?: number;
}

export interface NodePair {
  sourceId: string;
  targetId: string;
  color: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  currentTask: string | null;
  progress: number;
  error: string | null;
}

interface MorphState {
  sourceSVG: string | null;
  targetSVG: string | null;
  sourceSVGData: SVGData | null;
  targetSVGData: SVGData | null;
  animationSettings: AnimationSettings;
  isAnimating: boolean;
  currentProgress: number;
  manualModeEnabled: boolean;
  nodePairs: NodePair[];
  animationId: number | null;
  processingState: ProcessingState;
  interpolatedSVG: string | null;

  // Contour plan: each subpath of each path is a contour with its own mode (morph/swap/static)
  sourceContours: StyledContour[];
  targetContours: StyledContour[];
  contourPlan: ContourPlanEntry[] | null;
  contourPlanCustomized: boolean;
  // What the contour boxes show, shared by the Contours panel and the boxes over the preview
  /** Index of the plan entry under the pointer or focus. */
  contourHover: number | null;
  contourSelection: ContourSelection;
  showContourNodes: boolean;
  /** Boxes and labels over the SVGs of the split preview. */
  showContourBoxes: boolean;

  // Phase 2 properties
  sourcePoints: Point[];
  targetPoints: Point[];
  nodeMatches: NodeMatch[];
  matchingOptions: MatchingOptions;
  
  // Phase 3 properties
  keyframes: Keyframe[];
  recentFiles: RecentFile[];
  showTutorial: boolean;
  showPerformanceMonitor: boolean;
  realTimeAdjustmentEnabled: boolean;
  customEasingCurves: { [key: string]: BezierCurve };
  
  // Phase 4 properties
  gradientMorphOptions: GradientMorphOptions;
  textMorphOptions: TextMorphOptions;
  multiPathMorphOptions: MultiPathMorphOptions;
  physicsOptions: PhysicsOptions;
  videoExportOptions: VideoExportOptions;
  shareOptions: ShareOptions;
  canvasRenderOptions: CanvasRenderOptions;
  enableHardwareAcceleration: boolean;
  enableMemoryOptimization: boolean;
  enableProgressiveLoading: boolean;
  debouncedUpdatesEnabled: boolean;
  animationType: 'standard' | 'spring' | 'elastic' | 'damped';
  renderMode: '2d' | 'webgl' | 'offscreen';
  
  // Actions
  setSourceSVG: (svg: string) => Promise<void>;
  setTargetSVG: (svg: string) => Promise<void>;
  updateAnimationSettings: (settings: Partial<AnimationSettings>) => void;
  setManualMode: (enabled: boolean) => void;
  addNodePair: (pair: NodePair) => void;
  removeNodePair: (pairId: string) => void;
  clearNodePairs: () => void;
  startAnimation: () => void;
  /** One pass of the animation, forward or backward; a loop chains passes. Use `startAnimation` from the UI. */
  playPass: (backward: boolean) => void;
  pauseAnimation: () => void;
  resetAnimation: () => void;
  setProgress: (progress: number) => Promise<void>;
  
  // New Web Worker actions
  processSVGs: () => Promise<void>;
  generateInterpolatedSVG: (progress: number) => Promise<void>;
  setProcessingState: (state: Partial<ProcessingState>) => void;

  // Contour plan actions
  setContourPlan: (plan: ContourPlanEntry[]) => Promise<void>;
  resetContourPlan: () => Promise<void>;
  setContourHover: (entryIndex: number | null) => void;
  setContourSelection: (selection: ContourSelection) => void;
  /** Pick a contour: the second pick, on the other side, pairs the two as a morph. */
  selectContour: (side: 'source' | 'target', id: string) => Promise<void>;
  setShowContourNodes: (show: boolean) => void;
  setShowContourBoxes: (show: boolean) => void;

  // Phase 2 actions
  autoMatchNodes: () => void;
  updateMatchingOptions: (options: Partial<MatchingOptions>) => void;
  setSourcePoints: (points: Point[]) => void;
  setTargetPoints: (points: Point[]) => void;
  
  // Phase 3 actions
  setKeyframes: (keyframes: Keyframe[]) => void;
  addKeyframe: (keyframe: Keyframe) => void;
  removeKeyframe: (keyframeId: string) => void;
  updateKeyframe: (keyframeId: string, updates: Partial<Keyframe>) => void;
  addRecentFile: (file: Omit<RecentFile, 'id' | 'lastUsed' | 'isFavorite'>) => void;
  removeRecentFile: (fileId: string) => void;
  toggleTutorial: () => void;
  togglePerformanceMonitor: () => void;
  toggleRealTimeAdjustment: () => void;
  setCustomEasingCurve: (name: string, curve: BezierCurve) => void;
  removeCustomEasingCurve: (name: string) => void;
  
  // Phase 4 actions
  updateGradientMorphOptions: (options: Partial<GradientMorphOptions>) => void;
  updateTextMorphOptions: (options: Partial<TextMorphOptions>) => void;
  updateMultiPathMorphOptions: (options: Partial<MultiPathMorphOptions>) => void;
  updatePhysicsOptions: (options: Partial<PhysicsOptions>) => void;
  updateVideoExportOptions: (options: Partial<VideoExportOptions>) => void;
  updateShareOptions: (options: Partial<ShareOptions>) => void;
  updateCanvasRenderOptions: (options: Partial<CanvasRenderOptions>) => void;
  setAnimationType: (type: 'standard' | 'spring' | 'elastic' | 'damped') => void;
  setRenderMode: (mode: '2d' | 'webgl' | 'offscreen') => void;
  toggleHardwareAcceleration: () => void;
  toggleMemoryOptimization: () => void;
  toggleProgressiveLoading: () => void;
  toggleDebouncedUpdates: () => void;
  optimizePerformance: () => void;
  exportVideo: () => Promise<void>;
  shareToSocial: (platform: string) => Promise<void>;
}

const defaultAnimationSettings: AnimationSettings = {
  duration: 2,
  easing: 'easeInOut',
  colorInterpolation: true,
  strokeWidthInterpolation: true,
  loop: false,
  loopDirection: 'forward',
  reverse: false,
  playbackSpeed: 1,
};

const defaultProcessingState: ProcessingState = {
  isProcessing: false,
  currentTask: null,
  progress: 0,
  error: null,
};

const defaultMatchingOptions: MatchingOptions = {
  distanceMetric: 'euclidean',
  maxDistance: 100,
  confidenceThreshold: 0.3,
  useThinPlateSpline: false,
  balanceMatching: true,
};

export const useMorphStore = create<MorphState>((set, get) => ({
  sourceSVG: null,
  targetSVG: null,
  sourceSVGData: null,
  targetSVGData: null,
  animationSettings: defaultAnimationSettings,
  isAnimating: false,
  currentProgress: 0,
  manualModeEnabled: false,
  nodePairs: [],
  animationId: null,
  processingState: defaultProcessingState,
  interpolatedSVG: null,
  sourceContours: [],
  targetContours: [],
  contourPlan: null,
  contourPlanCustomized: false,
  contourHover: null,
  contourSelection: null,
  showContourNodes: true,
  showContourBoxes: true,

  // Phase 2 state
  sourcePoints: [],
  targetPoints: [],
  nodeMatches: [],
  matchingOptions: defaultMatchingOptions,
  
  // Phase 3 state
  keyframes: [],
  recentFiles: [],
  showTutorial: false,
  showPerformanceMonitor: false,
  realTimeAdjustmentEnabled: false,
  customEasingCurves: {},
  
  // Phase 4 state
  gradientMorphOptions: {
    preserveStopCount: true,
    colorSpace: 'rgb',
    interpolateOpacity: true,
    smoothTransition: true,
  },
  textMorphOptions: {
    morphText: true,
    morphPath: true,
    morphTypography: true,
    preserveReadability: true,
    animateLetterSpacing: true,
    animateWordSpacing: true,
    textTransitionMethod: 'morph',
    pathTransitionMethod: 'bezier',
  },
  multiPathMorphOptions: {
    groupMatching: 'automatic',
    pathMatching: 'similarity',
    preserveGroupStructure: true,
    interpolateTransforms: true,
    handleMissingPaths: 'fade',
    complexityThreshold: 100,
    maxPathsPerGroup: 50,
  },
  physicsOptions: {
    springConfig: {
      stiffness: 100,
      damping: 10,
      mass: 1,
      precision: 0.01,
      velocity: 0,
    },
    enableGravity: false,
    gravityStrength: 9.81,
    enableFriction: false,
    frictionCoefficient: 0.1,
    enableCollisions: false,
    boundaryBehavior: 'bounce',
    timeStep: 1 / 60,
  },
  videoExportOptions: {
    format: 'mp4',
    width: 800,
    height: 600,
    fps: 30,
    duration: 3,
    quality: 'high',
    loop: false,
    backgroundColor: '#ffffff',
  },
  shareOptions: {
    platform: 'twitter',
    title: 'Amazing SVG Morphing Animation',
    description: 'Created with SVG Morph',
    hashtags: ['SVGMorph', 'Animation'],
  },
  canvasRenderOptions: {
    width: 800,
    height: 600,
    devicePixelRatio: window.devicePixelRatio || 1,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  },
  enableHardwareAcceleration: true,
  enableMemoryOptimization: true,
  enableProgressiveLoading: true,
  debouncedUpdatesEnabled: true,
  animationType: 'standard',
  renderMode: '2d',

  setSourceSVG: async (svg) => {
    set({ sourceSVG: svg, sourceSVGData: null });
    if (svg) {
      await get().processSVGs();
    }
  },
  
  setTargetSVG: async (svg) => {
    set({ targetSVG: svg, targetSVGData: null });
    if (svg) {
      await get().processSVGs();
    }
  },
  
  updateAnimationSettings: (settings) =>
    set((state) => ({
      animationSettings: { ...state.animationSettings, ...settings },
    })),

  // false = pair by contours (the plan), true = pair by points of the whole SVG; exactly one is active
  setManualMode: (enabled) => set({ manualModeEnabled: enabled }),

  addNodePair: (pair) =>
    set((state) => {
      const newNodePairs = [...state.nodePairs, pair];
      
      // Convert nodePairs to nodeMatches for animation system
      const nodeMatches = newNodePairs.map(nodePair => {
        // Find the actual points from sourcePoints and targetPoints
        const sourcePoint = state.sourcePoints.find(p => p.id === nodePair.sourceId);
        const targetPoint = state.targetPoints.find(p => p.id === nodePair.targetId);
        
        if (sourcePoint && targetPoint) {
          return {
            sourcePoint: { x: sourcePoint.x, y: sourcePoint.y, id: sourcePoint.id },
            targetPoint: { x: targetPoint.x, y: targetPoint.y, id: targetPoint.id },
            confidence: 1.0 // Manual matches have full confidence
          };
        }
        return null;
      }).filter(Boolean) as NodeMatch[];
      
      console.log('🔄 Store: Updated nodeMatches from nodePairs:', nodeMatches.length, 'matches');
      
      return { 
        nodePairs: newNodePairs,
        nodeMatches
      };
    }),

  removeNodePair: (pairId) =>
    set((state) => {
      const newNodePairs = state.nodePairs.filter(pair => pair.sourceId + '-' + pair.targetId !== pairId);
      
      // Convert nodePairs to nodeMatches for animation system
      const nodeMatches = newNodePairs.map(nodePair => {
        // Find the actual points from sourcePoints and targetPoints
        const sourcePoint = state.sourcePoints.find(p => p.id === nodePair.sourceId);
        const targetPoint = state.targetPoints.find(p => p.id === nodePair.targetId);
        
        if (sourcePoint && targetPoint) {
          return {
            sourcePoint: { x: sourcePoint.x, y: sourcePoint.y, id: sourcePoint.id },
            targetPoint: { x: targetPoint.x, y: targetPoint.y, id: targetPoint.id },
            confidence: 1.0 // Manual matches have full confidence
          };
        }
        return null;
      }).filter(Boolean) as NodeMatch[];
      
      console.log('🔄 Store: Updated nodeMatches after removal:', nodeMatches.length, 'matches');
      
      return { 
        nodePairs: newNodePairs,
        nodeMatches
      };
    }),

  clearNodePairs: () =>
    set({ 
      nodePairs: [],
      nodeMatches: []
    }),

  startAnimation: () => get().playPass(false),

  playPass: (backward) => {
    const state = get();
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
    }

    const { loop, loopDirection } = state.animationSettings;
    const bothWays = loop && loopDirection === 'both';
    const startTime = performance.now();
    // The duration is one full cycle: with both ways that is a forward leg plus a backward leg.
    const duration = (state.animationSettings.duration * 1000) / (bothWays ? 2 : 1);

    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let progress = Math.min(elapsed / duration, 1);

      // Apply easing
      progress = applyEasing(progress, state.animationSettings.easing, state.animationSettings.customEasing);

      // The backward leg of a both-ways loop plays the morph the other way round
      if (backward) {
        progress = 1 - progress;
      }

      // Apply reverse if enabled
      if (state.animationSettings.reverse) {
        progress = 1 - progress;
      }

      set({ currentProgress: progress });

      // Generate interpolated SVG using Web Worker
      if (state.sourceSVG && state.targetSVG) {
        await get().generateInterpolatedSVG(progress);
      }

      if (elapsed >= duration) {
        set({ isAnimating: false, animationId: null });
        
        if (loop) {
          // Next pass after a brief pause: the other way for a both-ways loop, else forward again
          setTimeout(() => {
            get().playPass(bothWays ? !backward : false);
          }, 100);
        }
      } else {
        const animationId = requestAnimationFrame(animate);
        set({ animationId });
      }
    };

    set({ isAnimating: true });
    const animationId = requestAnimationFrame(animate);
    set({ animationId });
  },

  pauseAnimation: () => {
    const state = get();
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
      set({ isAnimating: false, animationId: null });
    }
  },

  resetAnimation: () => {
    const state = get();
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
    }
    
    // Set initial progress based on reverse setting
    const initialProgress = state.animationSettings.reverse ? 1 : 0;
    set({ isAnimating: false, currentProgress: initialProgress, animationId: null });
  },

  setProgress: async (progress) => {
    const state = get();
    let adjustedProgress = progress;
    
    // Apply reverse if enabled
    if (state.animationSettings.reverse) {
      adjustedProgress = 1 - progress;
    }
    
    set({ currentProgress: adjustedProgress });
    if (state.sourceSVG && state.targetSVG) {
      await get().generateInterpolatedSVG(adjustedProgress);
    }
  },

  // New Web Worker methods
  processSVGs: async () => {
    const state = get();
    if (!state.sourceSVG && !state.targetSVG) return;

    try {
      set({
        processingState: {
          isProcessing: true,
          currentTask: 'Parsing SVG files...',
          progress: 0,
          error: null,
        }
      });

      const promises: Promise<SVGData | null>[] = [];

      if (state.sourceSVG && !state.sourceSVGData) {
        promises.push(
          workerManager.parseSVG(state.sourceSVG, (progress) => {
            set((state) => ({
              processingState: {
                ...state.processingState,
                progress: progress * 0.5,
              }
            }));
          })
        );
      } else {
        promises.push(Promise.resolve(state.sourceSVGData));
      }

      if (state.targetSVG && !state.targetSVGData) {
        promises.push(
          workerManager.parseSVG(state.targetSVG, (progress) => {
            set((state) => ({
              processingState: {
                ...state.processingState,
                progress: 50 + (progress * 0.5),
              }
            }));
          })
        );
      } else {
        promises.push(Promise.resolve(state.targetSVGData));
      }

      const [sourceSVGData, targetSVGData] = await Promise.all(promises);

      // A fresh upload gets a fresh suggested plan; null keeps the whole-path pipeline
      const planned = sourceSVGData && targetSVGData ? planContours(sourceSVGData, targetSVGData) : null;

      set({
        sourceSVGData,
        targetSVGData,
        sourceContours: planned?.sourceContours ?? [],
        targetContours: planned?.targetContours ?? [],
        contourPlan: planned?.plan ?? null,
        contourPlanCustomized: false,
        // the contours are new, so whatever pointed at the old ones is stale
        contourHover: null,
        contourSelection: null,
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 100,
          error: null,
        }
      });

      // Generate initial interpolated SVG
      if (sourceSVGData && targetSVGData) {
        await get().generateInterpolatedSVG(state.currentProgress);
      }
    } catch (error) {
      set({
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 0,
          error: error instanceof Error ? error.message : 'Processing failed',
        }
      });
    }
  },

  generateInterpolatedSVG: async (progress) => {
    const state = get();
    if (!state.sourceSVG || !state.targetSVG) return;

    try {
      // Only use manual node matches if Manual Mode is enabled AND there are accepted pairs
      const shouldUseManualMatches = state.manualModeEnabled && state.nodeMatches.length > 0;
      const nodeMatches = shouldUseManualMatches ? state.nodeMatches : undefined;
      
      // Debug logging for manual node matches
      if (shouldUseManualMatches && nodeMatches && nodeMatches.length > 0) {
        console.log('🎯 Store: Manual Mode ENABLED - Passing manual node matches to Web Worker:', nodeMatches.length, 'matches');
        console.log('📍 Node matches:', nodeMatches.slice(0, 3)); // Log first 3 matches
      } else if (state.manualModeEnabled && state.nodeMatches.length === 0) {
        console.log('🟡 Store: Manual Mode enabled but no node pairs created yet, using default interpolation');
      } else {
        console.log('⚡ Store: Manual Mode disabled, using default interpolation');
      }
      
      // Contour pipeline: only for paths with several subpaths or a plan the user edited, and
      // never while the point-matching mode is selected. Everything else keeps the whole-path pipeline.
      const plan = activeContourPlan(
        state.contourPlan,
        state.sourceContours,
        state.targetContours,
        state.contourPlanCustomized,
        state.manualModeEnabled,
      );

      const interpolatedSVG = plan
        ? await workerManager.createContourSVG(state.sourceSVG, state.targetSVG, progress, plan)
        : await workerManager.createInterpolatedSVG(
            state.sourceSVG,
            state.targetSVG,
            progress,
            undefined, // onProgress callback
            nodeMatches
          );

      set({ interpolatedSVG });
    } catch (error) {
      console.error('Failed to generate interpolated SVG:', error);
      // Fallback to simple opacity blending
      const fallbackSVG = `
        <div style="position: relative; width: 100%; height: 100%;">
          <div style="position: absolute; opacity: ${1 - progress};">
            ${state.sourceSVG}
          </div>
          <div style="position: absolute; opacity: ${progress};">
            ${state.targetSVG}
          </div>
        </div>
      `;
      set({ interpolatedSVG: fallbackSVG });
    }
  },

  setProcessingState: (newState) =>
    set((state) => ({
      processingState: { ...state.processingState, ...newState },
    })),

  setContourPlan: async (plan) => {
    set({ contourPlan: plan, contourPlanCustomized: true });
    await get().generateInterpolatedSVG(get().currentProgress);
  },

  resetContourPlan: async () => {
    const { sourceSVGData, targetSVGData } = get();
    const planned = sourceSVGData && targetSVGData ? planContours(sourceSVGData, targetSVGData) : null;
    set({
      sourceContours: planned?.sourceContours ?? [],
      targetContours: planned?.targetContours ?? [],
      contourPlan: planned?.plan ?? null,
      contourPlanCustomized: false,
      contourHover: null,
      contourSelection: null,
    });
    await get().generateInterpolatedSVG(get().currentProgress);
  },

  setContourHover: (entryIndex) => set({ contourHover: entryIndex }),
  setContourSelection: (selection) => set({ contourSelection: selection }),
  selectContour: async (side, id) => {
    const { contourSelection, contourPlan, sourceContours, targetContours } = get();
    if (!contourPlan) return;
    if (contourSelection && contourSelection.side !== side) {
      const [sourceId, targetId] = side === 'source' ? [id, contourSelection.id] : [contourSelection.id, id];
      await get().setContourPlan(pairManually(contourPlan, sourceId, targetId, sourceContours, targetContours));
      set({ contourSelection: null });
      return;
    }
    set({ contourSelection: contourSelection?.id === id ? null : { side, id } });
  },
  setShowContourNodes: (show) => set({ showContourNodes: show }),
  setShowContourBoxes: (show) => set({ showContourBoxes: show }),

  // Phase 2 actions
  autoMatchNodes: () => {
    const state = get();
    if (state.sourcePoints.length === 0 || state.targetPoints.length === 0) return;

    const matcher = new NodeMatcher(state.matchingOptions);
    const result = matcher.autoMatchNodes(state.sourcePoints, state.targetPoints);
    
    // Convert matches to node pairs
    const newNodePairs = result.matches.map((match, index) => ({
      sourceId: match.sourcePoint.id!,
      targetId: match.targetPoint.id!,
      color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`, // Golden angle for color distribution
    }));

    set({ 
      nodeMatches: result.matches,
      nodePairs: newNodePairs,
    });
  },

  updateMatchingOptions: (options) =>
    set((state) => ({
      matchingOptions: { ...state.matchingOptions, ...options },
    })),

  setSourcePoints: (points) => set({ sourcePoints: points }),
  
  setTargetPoints: (points) => set({ targetPoints: points }),
  
  // Phase 3 actions
  setKeyframes: (keyframes) => set({ keyframes }),
  
  addKeyframe: (keyframe) => 
    set((state) => ({
      keyframes: [...state.keyframes, keyframe].sort((a, b) => a.time - b.time)
    })),
  
  removeKeyframe: (keyframeId) =>
    set((state) => ({
      keyframes: state.keyframes.filter(kf => kf.id !== keyframeId)
    })),
  
  updateKeyframe: (keyframeId, updates) =>
    set((state) => ({
      keyframes: state.keyframes.map(kf => 
        kf.id === keyframeId ? { ...kf, ...updates } : kf
      )
    })),
  
  addRecentFile: (file) => {
    const newFile: RecentFile = {
      ...file,
      id: `recent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUsed: new Date(),
      isFavorite: false
    };
    
    set((state) => {
      const filtered = state.recentFiles.filter(f => f.svgContent !== file.svgContent);
      const updated = [newFile, ...filtered].slice(0, 50);
      
      // Save to localStorage
      try {
        localStorage.setItem('svg-morph-recent-files', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent files:', error);
      }
      
      return { recentFiles: updated };
    });
  },
  
  removeRecentFile: (fileId) =>
    set((state) => {
      const updated = state.recentFiles.filter(f => f.id !== fileId);
      
      try {
        localStorage.setItem('svg-morph-recent-files', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recent files:', error);
      }
      
      return { recentFiles: updated };
    }),
  
  toggleTutorial: () => set((state) => ({ showTutorial: !state.showTutorial })),
  
  togglePerformanceMonitor: () => set((state) => ({ showPerformanceMonitor: !state.showPerformanceMonitor })),
  
  toggleRealTimeAdjustment: () => set((state) => ({ realTimeAdjustmentEnabled: !state.realTimeAdjustmentEnabled })),
  
  setCustomEasingCurve: (name, curve) =>
    set((state) => ({
      customEasingCurves: { ...state.customEasingCurves, [name]: curve }
    })),
  
  removeCustomEasingCurve: (name) =>
    set((state) => {
      const { [name]: _removed, ...rest } = state.customEasingCurves;
      return { customEasingCurves: rest };
    }),
  
  // Phase 4 actions
  updateGradientMorphOptions: (options) =>
    set((state) => ({
      gradientMorphOptions: { ...state.gradientMorphOptions, ...options },
    })),
  
  updateTextMorphOptions: (options) =>
    set((state) => ({
      textMorphOptions: { ...state.textMorphOptions, ...options },
    })),
  
  updateMultiPathMorphOptions: (options) =>
    set((state) => ({
      multiPathMorphOptions: { ...state.multiPathMorphOptions, ...options },
    })),
  
  updatePhysicsOptions: (options) =>
    set((state) => ({
      physicsOptions: { ...state.physicsOptions, ...options },
    })),
  
  updateVideoExportOptions: (options) =>
    set((state) => ({
      videoExportOptions: { ...state.videoExportOptions, ...options },
    })),
  
  updateShareOptions: (options) =>
    set((state) => ({
      shareOptions: { ...state.shareOptions, ...options },
    })),
  
  updateCanvasRenderOptions: (options) =>
    set((state) => ({
      canvasRenderOptions: { ...state.canvasRenderOptions, ...options },
    })),
  
  setAnimationType: (type) => set({ animationType: type }),
  
  setRenderMode: (mode) => set({ renderMode: mode }),
  
  toggleHardwareAcceleration: () =>
    set((state) => ({ enableHardwareAcceleration: !state.enableHardwareAcceleration })),
  
  toggleMemoryOptimization: () =>
    set((state) => ({ enableMemoryOptimization: !state.enableMemoryOptimization })),
  
  toggleProgressiveLoading: () =>
    set((state) => ({ enableProgressiveLoading: !state.enableProgressiveLoading })),
  
  toggleDebouncedUpdates: () =>
    set((state) => ({ debouncedUpdatesEnabled: !state.debouncedUpdatesEnabled })),
  
  optimizePerformance: () => {
    const state = get();
    
    // Enable memory optimization
    if (!state.enableMemoryOptimization) {
      set({ enableMemoryOptimization: true });
    }
    
    // Enable hardware acceleration if available
    if (!state.enableHardwareAcceleration) {
      set({ enableHardwareAcceleration: true });
    }
    
    // Enable debounced updates
    if (!state.debouncedUpdatesEnabled) {
      set({ debouncedUpdatesEnabled: true });
    }
    
    // Optimize physics settings for better performance
    set({
      physicsOptions: {
        ...state.physicsOptions,
        timeStep: 1 / 30, // Lower frame rate for better performance
        springConfig: {
          ...state.physicsOptions.springConfig,
          precision: 0.1, // Lower precision for faster calculations
        },
      },
    });
  },
  
  exportVideo: async () => {
    const state = get();
    if (!state.sourceSVG || !state.targetSVG) return;
    
    try {
      set({
        processingState: {
          isProcessing: true,
          currentTask: 'Exporting video...',
          progress: 0,
          error: null,
        },
      });
      
      // Video export logic would go here
      // This is a placeholder for the actual implementation
      
      set({
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 100,
          error: null,
        },
      });
    } catch (error) {
      set({
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 0,
          error: error instanceof Error ? error.message : 'Video export failed',
        },
      });
    }
  },
  
  shareToSocial: async (platform: string) => {
    const _state = get();
    
    try {
      set({
        processingState: {
          isProcessing: true,
          currentTask: `Sharing to ${platform}...`,
          progress: 0,
          error: null,
        },
      });
      
      // Social sharing logic would go here
      // This is a placeholder for the actual implementation
      
      set({
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 100,
          error: null,
        },
      });
    } catch (error) {
      set({
        processingState: {
          isProcessing: false,
          currentTask: null,
          progress: 0,
          error: error instanceof Error ? error.message : 'Social sharing failed',
        },
      });
    }
  },
}));

function applyEasing(t: number, easing: AnimationSettings['easing'], customCurve?: BezierCurve): number {
  switch (easing) {
    case 'linear':
      return t;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        return n1 * (t -= 1.5 / d1) * t + 0.75;
      } else if (t < 2.5 / d1) {
        return n1 * (t -= 2.25 / d1) * t + 0.9375;
      } else {
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
      }
    }
    case 'elastic': {
      const c4 = (2 * Math.PI) / 3;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    case 'custom':
      if (customCurve) {
        return evaluateBezierCurve(t, customCurve);
      }
      return t;
    default:
      return t;
  }
}

// Evaluate Bézier curve for custom easing
function evaluateBezierCurve(t: number, curve: BezierCurve): number {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  
  return mt2 * mt * 0 + 3 * mt2 * t * curve.p1.y + 3 * mt * t2 * curve.p2.y + t2 * t * 1;
}