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

  describe('loop direction', () => {
    // plays the animation on fake timers and records which passes ran, in order
    const passesAfter = (ms: number): boolean[] => {
      const passes: boolean[] = [];
      const original = useMorphStore.getState().playPass;
      useMorphStore.setState({
        playPass: (backward: boolean) => {
          passes.push(backward);
          original(backward);
        },
      });
      useMorphStore.getState().startAnimation();
      vi.advanceTimersByTime(ms);
      useMorphStore.getState().pauseAnimation();
      return passes;
    };

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'performance'] });
      useMorphStore.getState().updateAnimationSettings({ duration: 1 });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('plays a single pass when there is no loop', () => {
      expect(passesAfter(3000)).toEqual([false]);
    });

    it('repeats the forward pass in a forward loop', () => {
      useMorphStore.getState().updateAnimationSettings({ loop: true, loopDirection: 'forward' });

      expect(passesAfter(2500).slice(0, 3)).toEqual([false, false, false]);
    });

    it('alternates forward and backward in a both-ways loop, each leg half of the duration', () => {
      useMorphStore.getState().updateAnimationSettings({ loop: true, loopDirection: 'both' });

      // a leg lasts 0.5 s (+ the 0.1 s pause): three legs fit in 2 s
      expect(passesAfter(2000).slice(0, 3)).toEqual([false, true, false]);
    });

    it('runs the backward leg from the target back to the source', () => {
      useMorphStore.getState().updateAnimationSettings({ loop: true, loopDirection: 'both', easing: 'linear' });
      const seen: number[] = [];
      const unsubscribe = useMorphStore.subscribe((state) => seen.push(state.currentProgress));

      passesAfter(1400);
      unsubscribe();

      expect(Math.max(...seen)).toBe(1);
      // after reaching the target the progress comes back down
      const peak = seen.indexOf(1);
      expect(seen.slice(peak + 1).some((p) => p < 0.9)).toBe(true);
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

describe('contour UI state', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useMorphStore.setState(initialState, true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with the boxes and the nodes shown and nothing hovered or picked', () => {
    const state = useMorphStore.getState();

    expect(state.showContourBoxes).toBe(true);
    expect(state.showContourNodes).toBe(true);
    expect(state.contourHover).toBeNull();
    expect(state.contourSelection).toBeNull();
  });

  it('keeps what the panel and the preview share in the store', () => {
    const store = useMorphStore.getState();

    store.setContourHover(2);
    store.setContourSelection({ side: 'source', id: 's1.2' });
    store.setShowContourNodes(false);
    store.setShowContourBoxes(false);

    expect(useMorphStore.getState()).toMatchObject({
      contourHover: 2,
      contourSelection: { side: 'source', id: 's1.2' },
      showContourNodes: false,
      showContourBoxes: false,
    });
  });

  it('forgets a hovered or picked contour when new SVGs bring new contours', async () => {
    await useMorphStore.getState().setSourceSVG(CLOUD_ARROW_SVG);
    await useMorphStore.getState().setTargetSVG(CLOUD_BOLT_SVG);
    useMorphStore.getState().setContourHover(1);
    useMorphStore.getState().setContourSelection({ side: 'target', id: 't1.1' });

    await useMorphStore.getState().setSourceSVG(SQUARE_SVG);

    expect(useMorphStore.getState().contourHover).toBeNull();
    expect(useMorphStore.getState().contourSelection).toBeNull();
  });

  describe('selectContour', () => {
    beforeEach(async () => {
      await useMorphStore.getState().setSourceSVG(CLOUD_ARROW_SVG);
      await useMorphStore.getState().setTargetSVG(CLOUD_BOLT_SVG);
    });

    it('picks a contour and drops the pick when it is chosen again', async () => {
      await useMorphStore.getState().selectContour('source', 's1.3');
      expect(useMorphStore.getState().contourSelection).toEqual({ side: 'source', id: 's1.3' });

      await useMorphStore.getState().selectContour('source', 's1.3');
      expect(useMorphStore.getState().contourSelection).toBeNull();
    });

    it('moves the pick to another contour of the same side', async () => {
      await useMorphStore.getState().selectContour('source', 's1.3');
      await useMorphStore.getState().selectContour('source', 's1.4');

      expect(useMorphStore.getState().contourSelection).toEqual({ side: 'source', id: 's1.4' });
    });

    it('pairs the two contours when the second pick is on the other side', async () => {
      await useMorphStore.getState().selectContour('source', 's1.3');
      await useMorphStore.getState().selectContour('target', 't1.2');

      const state = useMorphStore.getState();
      expect(state.contourSelection).toBeNull();
      expect(state.contourPlanCustomized).toBe(true);
      expect(state.contourPlan!.some((e) => e.sourceId === 's1.3' && e.targetId === 't1.2' && e.mode === 'morph')).toBe(true);
    });

    it('does nothing when there is no plan', async () => {
      useMorphStore.setState({ contourPlan: null });

      await useMorphStore.getState().selectContour('source', 's1.1');

      expect(useMorphStore.getState().contourSelection).toBeNull();
    });
  });

  it('keeps the hover while the plan is edited, so a slider does not lose its highlight', async () => {
    await useMorphStore.getState().setSourceSVG(CLOUD_ARROW_SVG);
    await useMorphStore.getState().setTargetSVG(CLOUD_BOLT_SVG);
    useMorphStore.getState().setContourHover(1);

    await useMorphStore.getState().setContourPlan(useMorphStore.getState().contourPlan!);

    expect(useMorphStore.getState().contourHover).toBe(1);
  });
});

describe('morphStore output size', () => {
  const SMALL_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L24 0 L24 24 L0 24 Z" fill="#ff0000" stroke="#000000" stroke-width="2"/></svg>`;
  const BIG_SVG = `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L240 0 L240 240 L0 240 Z" fill="#0000ff" stroke="none"/></svg>`;

  beforeEach(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useMorphStore.setState(initialState, true);
    await useMorphStore.getState().setSourceSVG(SMALL_SVG);
    await useMorphStore.getState().setTargetSVG(BIG_SVG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "asIs": both SVGs keep their own box and parsed data', () => {
    const state = useMorphStore.getState();
    expect(state.outputSizeMode).toBe('asIs');
    expect(state.sourceSVGData?.viewBox).toBe('0 0 24 24');
    expect(state.targetSVGData?.viewBox).toBe('0 0 240 240');
    expect(state.sourceSVGData).toBe(state.rawSourceSVGData);
    expect(state.targetSVGData).toBe(state.rawTargetSVGData);
  });

  it('"larger" scales the small SVG up to the big box, strokes included', async () => {
    await useMorphStore.getState().setOutputSizeMode('larger');
    const { sourceSVGData, targetSVGData } = useMorphStore.getState();
    expect(sourceSVGData?.viewBox).toBe('0 0 240 240');
    expect(targetSVGData?.viewBox).toBe('0 0 240 240');
    expect(sourceSVGData?.paths[0].strokeWidth).toBeCloseTo(20);
  });

  it('"smaller" shrinks the big SVG, and going back to "asIs" restores both', async () => {
    await useMorphStore.getState().setOutputSizeMode('smaller');
    expect(useMorphStore.getState().targetSVGData?.viewBox).toBe('0 0 24 24');

    await useMorphStore.getState().setOutputSizeMode('asIs');
    const { sourceSVGData, targetSVGData } = useMorphStore.getState();
    expect(sourceSVGData?.viewBox).toBe('0 0 24 24');
    expect(targetSVGData?.viewBox).toBe('0 0 240 240');
    expect(sourceSVGData?.paths[0].strokeWidth).toBe(2);
  });

  it('uploading a new SVG fits it against the other one as uploaded, not as already scaled', async () => {
    await useMorphStore.getState().setOutputSizeMode('target');
    expect(useMorphStore.getState().sourceSVGData?.viewBox).toBe('0 0 240 240');

    await useMorphStore.getState().setTargetSVG(SMALL_SVG);
    await useMorphStore.getState().setOutputSizeMode('larger');
    // both are 24 wide now; if the source were still the scaled one the box would stay 240
    expect(useMorphStore.getState().sourceSVGData?.viewBox).toBe('0 0 24 24');
    expect(useMorphStore.getState().targetSVGData?.viewBox).toBe('0 0 24 24');
  });

  it('still produces an interpolated SVG in the chosen box', async () => {
    await useMorphStore.getState().setOutputSizeMode('larger');
    expect(useMorphStore.getState().interpolatedSVG).toContain('viewBox="0 0 240 240"');
  });
});
