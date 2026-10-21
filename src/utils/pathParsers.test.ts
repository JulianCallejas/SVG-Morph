// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseSVG } from './svgMorphing';
import { parseSVGString } from '../workers/pathProcessor';

const ROUND = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLAIN = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke="#fff"/></svg>`;
const HOSTILE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" stroke-linecap="round;evil" stroke-linejoin="nope"/></svg>`;
const CIRCLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3" stroke="#fff" stroke-linecap="square"/></svg>`;

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
});
