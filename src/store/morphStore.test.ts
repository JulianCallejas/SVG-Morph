// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMorphStore } from './morphStore';
import { workerManager } from '../utils/workerManager';
import { createInterpolatedSVG } from '../utils/svgMorphing';

const CLOUD_ARROW_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18" stroke="#FFFFFF" stroke-width="2"/>
</svg>`;
const CLOUD_BOLT_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417" stroke="#FFFFFF" stroke-width="2"/>
</svg>`;
// one path, one contour on each side: must keep using the whole-path pipeline
const SQUARE_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 10 L90 90 L10 90 Z" fill="#ff0000" stroke="none"/></svg>`;
const DIAMOND_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 L95 50 L50 95 L5 50 Z" fill="#0000ff" stroke="none"/></svg>`;

const pathCount = (svg: string | null): number => (svg?.match(/<path /g) ?? []).length;

const initialState = useMorphStore.getState();

describe('morphStore contour plan', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useMorphStore.setState(initialState, true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SVGs with several subpaths per path', () => {
    beforeEach(async () => {
      await useMorphStore.getState().setSourceSVG(CLOUD_ARROW_SVG);
      await useMorphStore.getState().setTargetSVG(CLOUD_BOLT_SVG);
    });

    it('suggests a plan with one entry per contour', () => {
      const { sourceContours, targetContours, contourPlan, contourPlanCustomized } = useMorphStore.getState();

      expect(sourceContours).toHaveLength(4);
      expect(targetContours).toHaveLength(2);
      expect(contourPlan?.map((entry) => entry.mode)).toEqual(['morph', 'morph', 'swap', 'swap']);
      expect(contourPlanCustomized).toBe(false);
    });

    it('renders every contour instead of joining them into one shape', () => {
      expect(pathCount(useMorphStore.getState().interpolatedSVG)).toBe(4);
    });

    it('drops the unpaired arrowheads after the swap point', async () => {
      await useMorphStore.getState().setProgress(0.9);

      expect(pathCount(useMorphStore.getState().interpolatedSVG)).toBe(2);
    });

    it('lets the user change a contour mode and rebuilds the frame', async () => {
      const plan = useMorphStore.getState().contourPlan!.map((entry) => ({ ...entry }));
      plan[2] = { ...plan[2], mode: 'static' };
      plan[3] = { ...plan[3], mode: 'static' };

      await useMorphStore.getState().setContourPlan(plan);
      await useMorphStore.getState().setProgress(0.9);

      expect(useMorphStore.getState().contourPlanCustomized).toBe(true);
      // the two arrowheads are now static, so they stay on screen
      expect(pathCount(useMorphStore.getState().interpolatedSVG)).toBe(4);
    });

    it('restores the suggested plan on reset', async () => {
      const plan = useMorphStore.getState().contourPlan!.map((entry) => ({ ...entry, mode: 'static' as const }));
      await useMorphStore.getState().setContourPlan(plan);

      await useMorphStore.getState().resetContourPlan();

      const state = useMorphStore.getState();
      expect(state.contourPlanCustomized).toBe(false);
      expect(state.contourPlan?.map((entry) => entry.mode)).toEqual(['morph', 'morph', 'swap', 'swap']);
    });

    it('drops the customized plan when a new SVG is uploaded', async () => {
      await useMorphStore.getState().setContourPlan(useMorphStore.getState().contourPlan!);

      await useMorphStore.getState().setSourceSVG(SQUARE_SVG);

      expect(useMorphStore.getState().contourPlanCustomized).toBe(false);
    });
  });

  describe('SVGs with a single contour per path', () => {
    it('keeps the whole-path pipeline and renders exactly what it rendered before', async () => {
      const contourPipeline = vi.spyOn(workerManager, 'createContourSVG');

      await useMorphStore.getState().setSourceSVG(SQUARE_SVG);
      await useMorphStore.getState().setTargetSVG(DIAMOND_SVG);
      await useMorphStore.getState().setProgress(0.5);

      expect(contourPipeline).not.toHaveBeenCalled();
      expect(useMorphStore.getState().interpolatedSVG).toBe(createInterpolatedSVG(SQUARE_SVG, DIAMOND_SVG, 0.5));
    });

    it('switches to the contour pipeline once the user customizes the plan', async () => {
      await useMorphStore.getState().setSourceSVG(SQUARE_SVG);
      await useMorphStore.getState().setTargetSVG(DIAMOND_SVG);
      const [entry] = useMorphStore.getState().contourPlan!;

      await useMorphStore.getState().setContourPlan([{ ...entry, mode: 'swap', swapAt: 0.8 }]);

      await useMorphStore.getState().setProgress(0.5);
      const beforeSwap = useMorphStore.getState().interpolatedSVG;
      await useMorphStore.getState().setProgress(0.9);
      const afterSwap = useMorphStore.getState().interpolatedSVG;

      expect(pathCount(beforeSwap)).toBe(1);
      expect(pathCount(afterSwap)).toBe(1);
      expect(beforeSwap).toContain('M10 10');
      expect(afterSwap).toContain('M50 5');
    });
  });

  describe('matching method', () => {
    beforeEach(async () => {
      await useMorphStore.getState().setSourceSVG(CLOUD_ARROW_SVG);
      await useMorphStore.getState().setTargetSVG(CLOUD_BOLT_SVG);
    });

    it('uses the contour plan by default', async () => {
      const contourPipeline = vi.spyOn(workerManager, 'createContourSVG');

      await useMorphStore.getState().setProgress(0.5);

      expect(useMorphStore.getState().manualModeEnabled).toBe(false);
      expect(contourPipeline).toHaveBeenCalled();
    });

    it('leaves the contour plan out while the point method is selected, even without any pair', async () => {
      const contourPipeline = vi.spyOn(workerManager, 'createContourSVG');

      useMorphStore.getState().setManualMode(true);
      await useMorphStore.getState().setProgress(0.5);

      expect(contourPipeline).not.toHaveBeenCalled();

      useMorphStore.getState().setManualMode(false);
      await useMorphStore.getState().setProgress(0.5);

      expect(contourPipeline).toHaveBeenCalled();
    });
  });

  it('falls back to the whole-path pipeline when a path cannot be split', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L5 5 M" /></svg>`;

    await useMorphStore.getState().setSourceSVG(broken);
    await useMorphStore.getState().setTargetSVG(SQUARE_SVG);

    expect(useMorphStore.getState().contourPlan).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(useMorphStore.getState().processingState.error).toBeNull();
  });
});
