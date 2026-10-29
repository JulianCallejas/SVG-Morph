// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseSVG } from './svgMorphing';
import { prepareIconSvg } from './iconSvg';

const LUCIDE_LIKE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><circle cx="12" cy="12" r="3"/></svg>';

describe('prepareIconSvg', () => {
  it('moves the paint declared on the root onto every shape and resolves currentColor', () => {
    const data = parseSVG(prepareIconSvg(LUCIDE_LIKE));
    expect(data.paths).toHaveLength(2);
    for (const path of data.paths) {
      expect(path.fill).toBe('none');
      expect(path.stroke).toBe('#000000');
      expect(path.strokeWidth).toBe(2);
      expect(path.strokeLinecap).toBe('round');
      expect(path.strokeLinejoin).toBe('round');
    }
  });

  it('takes paint from the nearest group, and a shape keeps its own', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor"><path d="M0 0 L8 8"/><path d="M1 1 L2 2" stroke="#ff0000"/></g></svg>';
    const { paths } = parseSVG(prepareIconSvg(svg));
    expect(paths[0]).toMatchObject({ fill: 'none', stroke: '#000000' });
    expect(paths[1]).toMatchObject({ fill: 'none', stroke: '#ff0000' });
  });

  it('turns a relative size such as 1em into the viewBox size', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path d="M0 0 L32 32"/></svg>';
    const data = parseSVG(prepareIconSvg(svg));
    expect(data.width).toBe(32);
    expect(data.height).toBe(32);
    expect(data.viewBox).toBe('0 0 32 32');
  });

  it('strips scripts and handlers', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="x()"><script>x()</script><path d="M0 0 L1 1" onclick="x()"/></svg>';
    expect(prepareIconSvg(svg)).not.toMatch(/script|onload|onclick/i);
  });

  it('returns an empty string for something that is not an SVG', () => {
    expect(prepareIconSvg('<div>hi</div>')).toBe('');
  });
});
