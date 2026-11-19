import { describe, expect, it } from 'vitest';
import { resolveStudioStep, studioEntryStep } from './studioEntry';

describe('studioEntryStep', () => {
  it('goes to node matching when both SVGs are loaded', () => {
    expect(studioEntryStep(true, true)).toBe('match');
  });

  it('starts at the first step when either SVG is missing', () => {
    expect(studioEntryStep(false, false)).toBe('upload');
    expect(studioEntryStep(true, false)).toBe('upload');
    expect(studioEntryStep(false, true)).toBe('upload');
  });
});

describe('resolveStudioStep', () => {
  it('opens on matching when asked to and both SVGs are loaded', () => {
    expect(resolveStudioStep({ step: 'match' }, true, true)).toBe('match');
  });

  it('falls back to the first step when matching is requested without both SVGs', () => {
    expect(resolveStudioStep({ step: 'match' }, true, false)).toBe('upload');
    expect(resolveStudioStep({ step: 'match' }, false, false)).toBe('upload');
  });

  it('opens on the first step with no request or an unknown one', () => {
    expect(resolveStudioStep(null, true, true)).toBe('upload');
    expect(resolveStudioStep(undefined, true, true)).toBe('upload');
    expect(resolveStudioStep({}, true, true)).toBe('upload');
    expect(resolveStudioStep({ step: 'export' }, true, true)).toBe('upload');
    expect(resolveStudioStep('match', true, true)).toBe('upload');
  });
});
