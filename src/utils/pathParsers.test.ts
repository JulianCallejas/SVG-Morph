// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseSVG } from './svgMorphing';
import { parseSVGString } from '../workers/pathProcessor';

const ROUND = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLAIN = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke="#fff"/></svg>`;
const HOSTILE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke-linecap="round;evil" stroke-linejoin="nope"/></svg>`;
const CIRCLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3" stroke="#fff" stroke-linecap="square"/></svg>`;

const svgWith = (inner: string) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const PATH = '<path d="M0 0 L1 1" stroke="#fff"/>';
const CIRCLE_TAG = '<circle cx="5" cy="5" r="2" fill="#f00"/>';
const RECT_TAG = '<rect x="1" y="1" width="2" height="2" fill="#00f"/>';

// The app has two parsers: a DOM one (synchronous fallback) and a regex one (inside the worker).
// Both must read the same stroke style.
const parsers = {
  'DOM parser (fallback)': parseSVG,
  'regex parser (worker)': parseSVGString,
};

describe.each(Object.entries(parsers))('%s', (_name, parse) => {
  it('reads stroke-linecap and stroke-linejoin', () => {
    const [path] = parse(ROUND).paths;

    expect(path.strokeLinecap).toBe('round');
    expect(path.strokeLinejoin).toBe('round');
  });

  it('leaves them undefined when the path does not set them', () => {
    const [path] = parse(PLAIN).paths;

    expect(path.strokeLinecap).toBeUndefined();
    expect(path.strokeLinejoin).toBeUndefined();
  });

  it('ignores values that are not a real cap or join', () => {
    const [path] = parse(HOSTILE).paths;

    expect(path.strokeLinecap).toBeUndefined();
    expect(path.strokeLinejoin).toBeUndefined();
  });

  it('reads them from converted basic shapes too', () => {
    const [path] = parse(CIRCLE).paths;

    expect(path.strokeLinecap).toBe('square');
  });

  describe('basic shapes next to paths', () => {
    const starts = (svg: string) => parse(svg).paths.map((p) => p.d.trim()[0] + p.d.trim().slice(1, 4));

    it('keeps the circles and rectangles of an SVG that also has paths, in document order', () => {
      const paths = parse(svgWith(`${PATH}${CIRCLE_TAG}${RECT_TAG}`)).paths;

      expect(paths).toHaveLength(3);
      expect(paths[0].d).toBe('M0 0 L1 1');
      expect(paths[1].d).toMatch(/^M3[, ]5/); // the circle starts at (cx - r, cy)
      expect(paths[2].d).toMatch(/^M1[, ]1/); // the rectangle starts at (x, y)
    });

    it('respects the document order whatever the kind of element', () => {
      const paths = parse(svgWith(`${RECT_TAG}${PATH}${CIRCLE_TAG}`)).paths;

      expect(paths.map((p) => p.d.trim()[1])).toEqual(['1', '0', '3']);
    });

    it('keeps the style of each shape', () => {
      const [, circle, rect] = parse(svgWith(`${PATH}${CIRCLE_TAG}${RECT_TAG}`)).paths;

      expect(circle.fill).toBe('#f00');
      expect(rect.fill).toBe('#00f');
    });

    it('ignores shapes that are only definitions, like a clipPath or a mask', () => {
      const svg = svgWith(
        `<defs><clipPath id="c"><rect width="10" height="10"/></clipPath></defs>` +
          `<mask id="m"><circle cx="1" cy="1" r="1"/></mask>${PATH}`,
      );

      expect(parse(svg).paths).toHaveLength(1);
    });

    it('leaves an SVG with only paths exactly as it was', () => {
      expect(starts(svgWith(PATH))).toEqual(['M0 0']);
      expect(parse(svgWith(PATH)).paths).toHaveLength(1);
    });

    it('still reads an SVG that is only shapes', () => {
      expect(parse(svgWith(`${CIRCLE_TAG}${RECT_TAG}`)).paths).toHaveLength(2);
    });

    it('reads the path data even when an id comes first', () => {
      const [path] = parse(svgWith('<path id="icon" d="M0 0 L1 1"/>')).paths;

      expect(path.d).toBe('M0 0 L1 1');
    });
  });
});
