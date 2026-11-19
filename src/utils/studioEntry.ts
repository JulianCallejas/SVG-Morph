export type StudioStep = 'upload' | 'match';

/** Router state the Studio reads to decide which step to open on. */
export interface StudioLocationState {
  step?: StudioStep;
}

/**
 * Where a link into the Studio should land: with both SVGs already loaded there is nothing left to
 * upload, so it goes straight to node matching; otherwise it starts at the first step.
 */
export function studioEntryStep(hasSource: boolean, hasTarget: boolean): StudioStep {
  return hasSource && hasTarget ? 'match' : 'upload';
}

/**
 * The step the Studio opens on. A requested step is honoured only when it can be used: matching needs
 * both SVGs, so a stale or hand-made request for it falls back to the first step.
 */
export function resolveStudioStep(state: unknown, hasSource: boolean, hasTarget: boolean): StudioStep {
  const requested = (state as StudioLocationState | null | undefined)?.step;
  return requested === 'match' && hasSource && hasTarget ? 'match' : 'upload';
}
