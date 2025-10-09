import { create } from 'zustand';

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

interface MorphState {
  sourceSVG: string | null;
  targetSVG: string | null;
  animationSettings: AnimationSettings;
  isAnimating: boolean;
  currentProgress: number;
  manualModeEnabled: boolean;
  nodePairs: NodePair[];
  animationId: number | null;
  
  // Actions
  setSourceSVG: (svg: string) => void;
  setTargetSVG: (svg: string) => void;
  updateAnimationSettings: (settings: Partial<AnimationSettings>) => void;
  toggleManualMode: () => void;
  addNodePair: (pair: NodePair) => void;
  removeNodePair: (pairId: string) => void;
  clearNodePairs: () => void;
  startAnimation: () => void;
  pauseAnimation: () => void;
  resetAnimation: () => void;
  setProgress: (progress: number) => void;
}

const defaultAnimationSettings: AnimationSettings = {
  duration: 2,
  easing: 'easeInOut',
  colorInterpolation: true,
  strokeWidthInterpolation: true,
  loop: false,
  reverse: false,
};

export const useMorphStore = create<MorphState>((set, get) => ({
  sourceSVG: null,
  targetSVG: null,
  animationSettings: defaultAnimationSettings,
  isAnimating: false,
  currentProgress: 0,
  manualModeEnabled: false,
  nodePairs: [],
  animationId: null,

  setSourceSVG: (svg) => set({ sourceSVG: svg }),
  setTargetSVG: (svg) => set({ targetSVG: svg }),
  
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

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let progress = Math.min(elapsed / duration, 1);

      // Apply easing
      progress = applyEasing(progress, state.animationSettings.easing);

      set({ currentProgress: progress });

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

  setProgress: (progress) => set({ currentProgress: progress }),
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