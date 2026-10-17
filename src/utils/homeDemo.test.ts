import { describe, expect, it } from 'vitest';
import {
  DEMO_SHAPES,
  applyEasing,
  buildSmilSnippet,
  interpolatePath,
} from './homeDemo';

const numbersIn = (d: string): number[] => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const commandsIn = (d: string): string => (d.match(/[A-Za-z]/g) ?? []).join('');

const [circle, star, square] = DEMO_SHAPES;

describe('DEMO_SHAPES', () => {
  it('share the same command sequence so they can be interpolated', () => {
    const reference = commandsIn(circle.d);
    for (const shape of DEMO_SHAPES) {
      expect(commandsIn(shape.d)).toBe(reference);
      expect(numbersIn(shape.d)).toHaveLength(numbersIn(circle.d).length);
    }
  });

  it('contain only finite numbers and no negative zero', () => {
    for (const shape of DEMO_SHAPES) {
      expect(shape.d).not.toMatch(/-0(?![\d.])/);
      expect(numbersIn(shape.d).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('interpolatePath', () => {
  it('returns the source path at t=0 and the target path at t=1', () => {
    numbersIn(interpolatePath(circle.d, star.d, 0)).forEach((n, i) =>
      expect(n).toBeCloseTo(numbersIn(circle.d)[i], 5),
    );
    numbersIn(interpolatePath(circle.d, star.d, 1)).forEach((n, i) =>
      expect(n).toBeCloseTo(numbersIn(star.d)[i], 5),
    );
  });

  it('moves every number halfway at t=0.5', () => {
    const from = numbersIn(circle.d);
    const to = numbersIn(square.d);
    numbersIn(interpolatePath(circle.d, square.d, 0.5)).forEach((n, i) =>
      expect(n).toBeCloseTo((from[i] + to[i]) / 2, 5),
    );
  });
});

describe('applyEasing', () => {
  it('keeps the endpoints for both easings', () => {
    for (const easing of ['linear', 'ease-in-out'] as const) {
      expect(applyEasing(easing, 0)).toBe(0);
      expect(applyEasing(easing, 1)).toBe(1);
    }
  });

  it('is the identity for linear and slower than linear at the start for ease-in-out', () => {
    expect(applyEasing('linear', 0.3)).toBe(0.3);
    expect(applyEasing('ease-in-out', 0.25)).toBeLessThan(0.25);
    expect(applyEasing('ease-in-out', 0.5)).toBeCloseTo(0.5, 10);
  });
});

describe('buildSmilSnippet', () => {
  const base = { from: circle.d, to: star.d, durationSeconds: 2.4 };

  it('writes a looping animate on d that goes from, to, and back', () => {
    const snippet = buildSmilSnippet({ ...base, easing: 'linear' });
    expect(snippet).toContain('attributeName="d"');
    expect(snippet).toContain('dur="2.4s"');
    expect(snippet).toContain('repeatCount="indefinite"');
    expect(snippet).toContain(`values="${circle.d};${star.d};${circle.d}"`);
  });

  it('adds a spline for each half only for ease-in-out', () => {
    const eased = buildSmilSnippet({ ...base, easing: 'ease-in-out' });
    expect(eased).toContain('calcMode="spline"');
    expect(eased).toContain('keyTimes="0;0.5;1"');
    expect(eased).toContain('keySplines="0.65 0 0.35 1;0.65 0 0.35 1"');

    const linear = buildSmilSnippet({ ...base, easing: 'linear' });
    expect(linear).not.toContain('calcMode');
    expect(linear).not.toContain('keySplines');
  });
});
