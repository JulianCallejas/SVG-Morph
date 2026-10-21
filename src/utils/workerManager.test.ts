// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerManager } from './workerManager';
import { parseSVG } from './svgMorphing';
import { planContours } from './contourSvg';

const CLOUD_ARROW_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
const CLOUD_BOLT_SVG = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const pathCount = (svg: string): number => (svg.match(/<path /g) ?? []).length;

describe('WorkerManager.createContourSVG (synchronous fallback)', () => {
  let manager: WorkerManager;

  beforeEach(() => {
    // jsdom has no Worker, so the manager falls back to synchronous processing
    vi.spyOn(console, 'error').mockImplementation(() => {});
    manager = new WorkerManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs without a worker', () => {
    expect(manager.isWorkerAvailable).toBe(false);
  });

  it('renders the contour plan of the reference icons', async () => {
    const { plan } = planContours(parseSVG(CLOUD_ARROW_SVG), parseSVG(CLOUD_BOLT_SVG))!;

    const atStart = await manager.createContourSVG(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, 0, plan);
    const atEnd = await manager.createContourSVG(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, 0.9, plan);

    expect(pathCount(atStart)).toBe(4);
    expect(pathCount(atEnd)).toBe(2);
  });

  it('honours the node count', async () => {
    const { plan } = planContours(parseSVG(CLOUD_ARROW_SVG), parseSVG(CLOUD_BOLT_SVG))!;

    const svg = await manager.createContourSVG(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, 0.5, plan, 10);
    const morphingPath = svg.match(/<path d="([^"]+)"/)![1];

    expect((morphingPath.match(/[ML]/g) ?? []).length).toBe(11);
  });

  it('rejects when the plan references a contour that does not exist', async () => {
    const plan = [{ sourceId: 'nope', targetId: null, mode: 'swap' as const, swapAt: 0.5, fadeWindow: 0 }];

    await expect(manager.createContourSVG(CLOUD_ARROW_SVG, CLOUD_BOLT_SVG, 0.5, plan)).rejects.toThrow(/nope/);
  });
});
