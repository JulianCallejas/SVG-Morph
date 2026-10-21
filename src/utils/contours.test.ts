import { describe, expect, it } from 'vitest';
import SVGPathCommander from 'svg-path-commander';
import { splitContours } from './contours';

// `d` attributes copied from the two reference icons (stroke-only, single <path> each)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const moveCount = (d: string): number =>
  new SVGPathCommander(d).segments.filter((segment) => segment[0] === 'M').length;

describe('splitContours', () => {
  it('splits the cloud-arrow icon into cloud, shaft and two arrowheads', () => {
    const contours = splitContours(CLOUD_ARROW_D);

    expect(contours).toHaveLength(4);
    expect(contours.map((contour) => contour.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('splits the cloud-bolt icon into bolt then cloud, in source order', () => {
    const contours = splitContours(CLOUD_BOLT_D);

    expect(contours).toHaveLength(2);
    // the bolt comes first in this file, the cloud second
    expect(contours[0].bbox.width).toBeLessThan(contours[1].bbox.width);
  });

  it('gives every contour exactly one move command', () => {
    for (const d of [CLOUD_ARROW_D, CLOUD_BOLT_D]) {
      for (const contour of splitContours(d)) {
        expect(moveCount(contour.d)).toBe(1);
      }
    }
  });

  it('keeps a single-contour path as one contour', () => {
    const contours = splitContours('M0 0 L10 0 L10 10 Z');

    expect(contours).toHaveLength(1);
    expect(contours[0].closed).toBe(true);
  });

  it('detects which contours are closed', () => {
    const contours = splitContours('M0 0 L10 0 L10 10 Z M20 20 L30 20');

    expect(contours.map((contour) => contour.closed)).toEqual([true, false]);
  });

  it('keeps open contours of the reference icons open', () => {
    expect(splitContours(CLOUD_ARROW_D).every((contour) => !contour.closed)).toBe(true);
  });

  it('turns relative subpath starts into absolute coordinates', () => {
    const [, second] = splitContours('M0 0 l10 0 m5 5 l10 0');

    // after `l10 0` the current point is (10,0), so `m5 5` starts at (15,5)
    expect(second.bbox.x).toBe(15);
    expect(second.bbox.y).toBe(5);
    expect(second.d.startsWith('M15 5')).toBe(true);
  });

  it('computes the bounding box of each contour', () => {
    const [contour] = splitContours('M0 0 L10 0 L10 20 Z');

    expect(contour.bbox).toEqual({ x: 0, y: 0, width: 10, height: 20 });
  });

  it('uses the given id prefix', () => {
    const contours = splitContours('M0 0 L1 1 M2 2 L3 3', 'src');

    expect(contours.map((contour) => contour.id)).toEqual(['src1', 'src2']);
  });

  it('returns no contours for an empty or blank path', () => {
    expect(splitContours('')).toEqual([]);
    expect(splitContours('   ')).toEqual([]);
  });

  it('throws on an invalid path instead of failing silently', () => {
    expect(() => splitContours('not a path')).toThrow();
  });
});
