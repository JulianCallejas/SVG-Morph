import { create } from 'zustand';
import { workerManager } from '../utils/workerManager';
import { SVGData } from '../workers/pathProcessor';
import { NodeMatcher, MatchingOptions, NodeMatch } from '../utils/nodeMatching';
import { Point } from '../utils/kdTree';

export interface AnimationSettings {
  duration: number;
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut' | 'bounce' | 'elastic';
  colorInterpolation: boolean;
  strokeWidthInterpolation: boolean;
  loop: boolean;
  reverse: boolean;
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
  
  // New Phase 2 properties
  sourcePoints: Point[];
  targetPoints: Point[];
  nodeMatches: NodeMatch[];
  matchingOptions: MatchingOptions;
  
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
  
  // New Phase 2 actions
  autoMatchNodes: () => void;
  updateMatchingOptions: (options: Partial<MatchingOptions>) => void;
  setSourcePoints: (points: Point[]) => void;
  setTargetPoints: (points: Point[]) => void;
}

const defaultAnimationSettings: AnimationSettings = {
  duration: 2,
  easing: 'easeInOut',
  colorInterpolation: true,
  strokeWidthInterpolation: true,
  loop: false,
  reverse: false,
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
  
  // New Phase 2 state
  sourcePoints: [],
  targetPoints: [],
  nodeMatches: [],
  matchingOptions: defaultMatchingOptions,

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

  // New Phase 2 actions
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
}));

function applyEasing(t: number, easing: AnimationSettings['easing']): number {
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
    default:
      return t;
  }
}