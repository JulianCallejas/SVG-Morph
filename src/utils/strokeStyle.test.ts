import { describe, expect, it } from 'vitest';
import { parseLinecap, parseLinejoin } from './strokeStyle';

describe('parseLinecap', () => {
  it('accepts the three SVG line caps', () => {
    expect(parseLinecap('butt')).toBe('butt');
    expect(parseLinecap('round')).toBe('round');
    expect(parseLinecap('square')).toBe('square');
  });

  it('ignores surrounding space and letter case', () => {
    expect(parseLinecap('  ROUND ')).toBe('round');
  });

  it('drops anything else instead of passing it into the output', () => {
    expect(parseLinecap('round" onload="alert(1)')).toBeUndefined();
    expect(parseLinecap('inherit')).toBeUndefined();
    expect(parseLinecap('')).toBeUndefined();
    expect(parseLinecap(undefined)).toBeUndefined();
    expect(parseLinecap(null)).toBeUndefined();
  });
});

describe('parseLinejoin', () => {
  it('accepts the SVG line joins', () => {
    for (const join of ['miter', 'round', 'bevel', 'miter-clip', 'arcs']) {
      expect(parseLinejoin(join)).toBe(join);
    }
  });

  it('drops anything else', () => {
    expect(parseLinejoin('sharp')).toBeUndefined();
    expect(parseLinejoin(undefined)).toBeUndefined();
  });
});
