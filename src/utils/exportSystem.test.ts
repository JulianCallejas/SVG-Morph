// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportSystem, createExportOptions } from './exportSystem';
import { workerManager } from './workerManager';
import { VideoExporter } from './videoExport';
import { parseSVG } from './svgMorphing';
import { planContours } from './contourSvg';
import { fitPair, serializeSVGData } from './fitSVGData';

const CLOUD_ARROW_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18" stroke="#FFFFFF" stroke-width="2"/>
</svg>`;
const CLOUD_BOLT_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417" stroke="#FFFFFF" stroke-width="2"/>
</svg>`;
const SQUARE_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 10 L90 90 L10 90 Z" fill="#ff0000" stroke="none"/></svg>`;
const DIAMOND_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 L95 50 L50 95 L5 50 Z" fill="#0000ff" stroke="none"/></svg>`;

const { plan } = planContours(parseSVG(CLOUD_ARROW_SVG), parseSVG(CLOUD_BOLT_SVG))!;
const pathCount = (svg: string): number => (svg.match(/<path /g) ?? []).length;

describe('ExportSystem with a contour plan', () => {
  let system: ExportSystem;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    system = new ExportSystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const smil = (overrides = {}) =>
    createExportOptions({ format: 'smil', optimize: false, duration: 2, ...overrides });

  it('exports one animated path per contour as SMIL', async () => {
    const result = await system.exportAnimation(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, smil({ contourPlan: plan }));
    const content = result.content as string;

    expect(pathCount(content)).toBe(4);
    expect(content).toContain('id="contour-0"');
    expect(content).toContain('attributeName="d"');
    expect(content).not.toMatch(/<set[\s>]/);
  });

  it('uses the same generator for the animated svg format', async () => {
    const result = await system.exportAnimation(
      CLOUD_ARROW_SVG,
      CLOUD_BOLT_SVG,
      createExportOptions({ format: 'svg', optimize: false, includeAnimation: true, contourPlan: plan }),
    );

    expect(pathCount(result.content as string)).toBe(4);
  });

  describe('loop direction', () => {
    const run = async (svgs: [string, string], overrides = {}) =>
      (await system.exportAnimation(svgs[0], svgs[1], smil(overrides))).content as string;

    it('keeps both-ways output byte for byte for the whole path and for a plan', async () => {
      const whole = await run([SQUARE_SVG, DIAMOND_SVG], { loop: true });

      expect(await run([SQUARE_SVG, DIAMOND_SVG], { loop: true, loopDirection: 'both' })).toBe(whole);
      expect(whole).toContain('keyTimes="0;0.5;1"');
      const contours = await run([CLOUD_ARROW_SVG, CLOUD_BOLT_SVG], { loop: true, contourPlan: plan });
      expect(await run([CLOUD_ARROW_SVG, CLOUD_BOLT_SVG], { loop: true, loopDirection: 'both', contourPlan: plan })).toBe(contours);
    });

    it('goes source to target only in a forward loop of the whole path', async () => {
      const content = await run([SQUARE_SVG, DIAMOND_SVG], { loop: true, loopDirection: 'forward' });

      expect(content).toContain('keyTimes="0;1"');
      expect(content).toContain('keySplines="0.4 0 0.6 1"');
      expect(content).toContain('repeatCount="indefinite"');
      expect(content).not.toContain('keyTimes="0;0.5;1"');
    });

    it('goes source to target only in a forward loop of a contour plan', async () => {
      const content = await run([CLOUD_ARROW_SVG, CLOUD_BOLT_SVG], { loop: true, loopDirection: 'forward', contourPlan: plan });

      // the morph of the paired contours (the swaps keep their own key times)
      expect(content).toMatch(/attributeName="d"[^>]*keyTimes="0;1"/);
      expect(content).not.toMatch(/attributeName="d"[^>]*keyTimes="0;0\.5;1"/);
    });

    it('ignores the direction when the animation does not loop', async () => {
      const once = await run([SQUARE_SVG, DIAMOND_SVG], { loop: false });

      expect(await run([SQUARE_SVG, DIAMOND_SVG], { loop: false, loopDirection: 'forward' })).toBe(once);
    });
  });

  it('keeps the whole-path output when there is no plan', async () => {
    const result = await system.exportAnimation(SQUARE_SVG, DIAMOND_SVG, smil());
    const content = result.content as string;

    expect(content).toContain('id="path-0"');
    expect(content).not.toContain('contour-');
  });

  it('stores the plan in the JSON export', async () => {
    const result = await system.exportAnimation(
      CLOUD_ARROW_SVG,
      CLOUD_BOLT_SVG,
      createExportOptions({ format: 'json', optimize: false, contourPlan: plan }),
    );

    expect(JSON.parse(result.content as string).contourPlan).toEqual(plan);
  });

  it('leaves the JSON export unchanged when there is no plan', async () => {
    const result = await system.exportAnimation(
      SQUARE_SVG,
      DIAMOND_SVG,
      createExportOptions({ format: 'json', optimize: false }),
    );

    expect(JSON.parse(result.content as string)).not.toHaveProperty('contourPlan');
  });

  it('rejects an invalid plan instead of silently exporting something else', async () => {
    const bad = [{ sourceId: 'nope', targetId: null, mode: 'swap' as const, swapAt: 0.5, fadeWindow: 0 }];

    await expect(
      system.exportAnimation(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, smil({ contourPlan: bad })),
    ).rejects.toThrow(/nope/);
  });
});

describe('VideoExporter with a contour plan', () => {
  let exporter: VideoExporter;
  // frames are rendered through a private step; the test goes straight to it
  const interpolate = (progress: number, withPlan: boolean) =>
    (
      exporter as unknown as {
        interpolateSVG: (s: string, t: string, p: number, contourPlan?: typeof plan) => Promise<string>;
      }
    ).interpolateSVG(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, progress, withPlan ? plan : undefined);

  beforeEach(() => {
    // jsdom has no canvas: the constructor only needs it to exist
    vi.spyOn(console, 'error').mockImplementation(() => {});
    exporter = new VideoExporter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders frames through the contour pipeline when there is a plan', async () => {
    const contourSpy = vi.spyOn(workerManager, 'createContourSVG');
    const wholePathSpy = vi.spyOn(workerManager, 'createInterpolatedSVG');

    const frame = await interpolate(0, true);

    expect(contourSpy).toHaveBeenCalledOnce();
    expect(wholePathSpy).not.toHaveBeenCalled();
    expect(pathCount(frame)).toBe(4);
  });

  it('keeps the whole-path pipeline without a plan', async () => {
    const contourSpy = vi.spyOn(workerManager, 'createContourSVG');
    const wholePathSpy = vi.spyOn(workerManager, 'createInterpolatedSVG');

    await interpolate(0.5, false);

    expect(wholePathSpy).toHaveBeenCalledOnce();
    expect(contourSpy).not.toHaveBeenCalled();
  });
});

describe('ExportSystem with a fitted output size', () => {
  const SMALL = `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L24 0 L24 24 L0 24 Z" fill="#ff0000" stroke="none"/></svg>`;
  const BIG = `<svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L240 0 L240 240 L0 240 Z" fill="#0000ff" stroke="none"/></svg>`;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const exportSMIL = async (source: string, target: string) => {
    const result = await new ExportSystem().exportAnimation(
      source,
      target,
      createExportOptions({ format: 'smil', optimize: false, duration: 2 }),
    );
    return result.content as string;
  };

  it('exports in the shared box: the small drawing is scaled up, not stretched', async () => {
    const { source, target } = fitPair(parseSVG(SMALL), parseSVG(BIG), 'larger');
    const content = await exportSMIL(serializeSVGData(source), serializeSVGData(target));

    expect(content).toContain('viewBox="0 0 240 240"');
    expect(content).not.toContain('viewBox="0 0 24 24"');
    // the 24-wide square reaches the far edge of the 240 box
    expect(content).toMatch(/240/);
  });

  it('is the same export as before when no scaling is chosen ("asIs" hands over the uploaded strings)', async () => {
    const pair = fitPair(parseSVG(SMALL), parseSVG(BIG), 'asIs');
    expect(pair.source).toEqual(parseSVG(SMALL));
    const content = await exportSMIL(SMALL, BIG);
    expect(content).toContain('viewBox="0 0 24 24"');
  });
});
