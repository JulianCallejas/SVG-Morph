import { create } from 'zustand';
import { workerManager } from '../utils/workerManager';
import { SVGData } from '../workers/pathProcessor';
import { NodeMatcher, MatchingOptions, NodeMatch } from '../utils/nodeMatching';
import { Point } from '../utils/kdTree';
import { BezierCurve } from '../components/BezierEasingEditor';
import { Keyframe } from '../components/KeyframeTimeline';
import { RecentFile } from '../components/RecentFilesHistory';

export interface AnimationSettings {
  duration: number;
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut' | 'bounce' | 'elastic' | 'custom';
  colorInterpolation: boolean;
  strokeWidthInterpolation: boolean;
  loop: boolean;
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
  
  // Actions
  setSourceSVG: (svg: string) => Promise<void>;
  setTargetSVG: (svg: string) => Promise<void>;
  updateAnimationSettings: (settings: Partial<AnimationSettings>) => void;
  toggleManualMode: () => void;
  addNodePair: (pair: NodePair) => void;
  removeNodePair: (pairId: string) => void;
  clearNodePairs: () => void;
  startAnimation: () => void;
  pauseAnimation: () => void;
  resetAnimation: () => void;
  setProgress: (progress: number) => Promise<void>;
  
  // New Web Worker actions
  processSVGs: () => Promise<void>;
  generateInterpolatedSVG: (progress: number) => Promise<void>;
  setProcessingState: (state: Partial<ProcessingState>) => void;
  
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
}

const defaultAnimationSettings: AnimationSettings = {
  duration: 2,
  easing: 'easeInOut',
  colorInterpolation: true,
  strokeWidthInterpolation: true,
  loop: false,
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

  toggleManualMode: () =>
    set((state) => ({ manualModeEnabled: !state.manualModeEnabled })),

  addNodePair: (pair) =>
    set((state) => ({ nodePairs: [...state.nodePairs, pair] })),

  removeNodePair: (pairId) =>
    set((state) => ({
      nodePairs: state.nodePairs.filter((pair) => pair.sourceId !== pairId),
    })),

  clearNodePairs: () => set({ nodePairs: [] }),

  startAnimation: () => {
    const state = get();
    if (state.animationId) {
      cancelAnimationFrame(state.animationId);
    }

    const startTime = performance.now();
    const duration = state.animationSettings.duration * 1000;

    const animate = async (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let progress = Math.min(elapsed / duration, 1);

      // Apply easing
      progress = applyEasing(progress, state.animationSettings.easing);

      set({ currentProgress: progress });

      // Generate interpolated SVG using Web Worker
      if (state.sourceSVG && state.targetSVG) {
        await get().generateInterpolatedSVG(progress);
      }

      if (progress < 1) {
        const animationId = requestAnimationFrame(animate);
        set({ animationId });
      } else {
        set({ isAnimating: false, animationId: null });
        
        if (state.animationSettings.loop) {
          // Restart animation after a brief pause
          setTimeout(() => {
            get().startAnimation();
          }, 100);
        }
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
    set({ isAnimating: false, currentProgress: 0, animationId: null });
  },

  setProgress: async (progress) => {
    set({ currentProgress: progress });
    const state = get();
    if (state.sourceSVG && state.targetSVG) {
      await get().generateInterpolatedSVG(progress);
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

      set({
        sourceSVGData,
        targetSVGData,
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
      const interpolatedSVG = await workerManager.createInterpolatedSVG(
        state.sourceSVG,
        state.targetSVG,
        progress
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
      const { [name]: removed, ...rest } = state.customEasingCurves;
      return { customEasingCurves: rest };
    }),
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
    case 'bounce':
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
    case 'elastic':
      const c4 = (2 * Math.PI) / 3;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
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