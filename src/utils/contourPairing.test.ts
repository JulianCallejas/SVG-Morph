import { describe, expect, it } from 'vitest';
import { splitContours } from './contours';
import {
  DEFAULT_FADE_WINDOW,
  DEFAULT_SWAP_AT,
  pairContours,
} from './contourPairing';

// `d` attributes of the two reference icons (see contours.test.ts)
const CLOUD_ARROW_D =
  'M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18';
const CLOUD_BOLT_D =
  'M13 11L10 16H15L12 21M6 16.4438C4.22194 15.5683 3 13.7502 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417';

const ids = (entry: { sourceId: string | null; targetId: string | null }) => [
  entry.sourceId,
  entry.targetId,
];

describe('pairContours', () => {
  it('pairs the cloud with the cloud and the shaft with the bolt', () => {
    const source = splitContours(CLOUD_ARROW_D, 's');
    const target = splitContours(CLOUD_BOLT_D, 't');

    const plan = pairContours(source, target);

    // source order first: cloud (s1), shaft (s2), arrowheads (s3, s4)
    expect(plan.map(ids)).toEqual([
      ['s1', 't2'],
      ['s2', 't1'],
      ['s3', null],
      ['s4', null],
    ]);
  });

  it('morphs paired contours and swaps the unpaired ones by default', () => {
    const plan = pairContours(
      splitContours(CLOUD_ARROW_D, 's'),
      splitContours(CLOUD_BOLT_D, 't'),
    );

    expect(plan.map((entry) => entry.mode)).toEqual(['morph', 'morph', 'swap', 'swap']);
  });

  it('starts every entry with the default swap point and a hard cut', () => {
    const plan = pairContours(
      splitContours(CLOUD_ARROW_D, 's'),
      splitContours(CLOUD_BOLT_D, 't'),
    );

    for (const entry of plan) {
      expect(entry.swapAt).toBe(DEFAULT_SWAP_AT);
      expect(entry.fadeWindow).toBe(DEFAULT_FADE_WINDOW);
    }
  });

  it('uses each contour at most once', () => {
    const plan = pairContours(
      splitContours(CLOUD_ARROW_D, 's'),
      splitContours(CLOUD_BOLT_D, 't'),
    );

    const sourceIds = plan.flatMap((entry) => (entry.sourceId ? [entry.sourceId] : []));
    const targetIds = plan.flatMap((entry) => (entry.targetId ? [entry.targetId] : []));

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(new Set(targetIds).size).toBe(targetIds.length);
    expect(sourceIds).toHaveLength(4);
    expect(targetIds).toHaveLength(2);
  });

  it('lists unpaired target contours after the source ones', () => {
    const source = splitContours('M0 0 L10 0 L10 10 Z', 's');
    const target = splitContours('M0 0 L10 0 L10 10 Z M80 80 L90 80 L90 90 Z', 't');

    const plan = pairContours(source, target);

    expect(plan.map(ids)).toEqual([
      ['s1', 't1'],
      [null, 't2'],
    ]);
    expect(plan[1].mode).toBe('swap');
  });

  it('does not pair contours that are far apart and of different size', () => {
    const source = splitContours('M0 0 L100 0 L100 100 L0 100 Z', 's');
    const target = splitContours('M200 200 L204 200 L204 204 L200 204 Z', 't');

    const plan = pairContours(source, target);

    expect(plan.map(ids)).toEqual([
      ['s1', null],
      [null, 't1'],
    ]);
  });

  it('pairs identical contour lists one to one in order', () => {
    const d = 'M0 0 L10 0 L10 10 Z M50 50 L60 50 L60 60 Z';

    const plan = pairContours(splitContours(d, 's'), splitContours(d, 't'));

    expect(plan.map(ids)).toEqual([
      ['s1', 't1'],
      ['s2', 't2'],
    ]);
  });

  it('handles an empty side', () => {
    const contours = splitContours('M0 0 L10 0 L10 10 Z', 'x');

    expect(pairContours([], contours).map(ids)).toEqual([[null, 'x1']]);
    expect(pairContours(contours, []).map(ids)).toEqual([['x1', null]]);
    expect(pairContours([], [])).toEqual([]);
  });
});
