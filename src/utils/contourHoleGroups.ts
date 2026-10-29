import type { ContourPlanEntry } from './contourPairing';
import type { StyledContour } from './contourSvg';
import { holeStructure } from './contourHoles';

/** A morphing pair that is the outer of a filled shape, and the morphing pairs that are its holes (plan indexes). */
export interface HoleGroup {
  outer: number;
  holes: number[];
}

const isMorphPair = (entry: ContourPlanEntry): boolean =>
  entry.mode === 'morph' && entry.sourceId !== null && entry.targetId !== null;

/**
 * Which pairs of a plan have to be drawn together so a hole stays a hole while it morphs. Drawn on
 * their own, each contour is a filled shape and the inner one covers the hole of the outer one.
 *
 * A pair is a hole of another when both pairs morph, its source contour is a hole of the other's
 * source contour, and its target contour is a hole of the other's target contour (see
 * `holeStructure`). Anything else, such as a hole that is paired with a solid shape or one that is
 * swapped, is left out and drawn alone, as it always was. Stroke-only shapes never have holes.
 */
export function holeGroups(
  plan: ContourPlanEntry[],
  source: StyledContour[],
  target: StyledContour[],
): HoleGroup[] {
  const sourceHoles = holeStructure(source);
  const targetHoles = holeStructure(target);

  const pairIndex = new Map<string, number>();
  plan.forEach((entry, index) => {
    if (isMorphPair(entry)) pairIndex.set(`${entry.sourceId}|${entry.targetId}`, index);
  });

  const groups = new Map<number, number[]>();
  plan.forEach((entry, index) => {
    if (!isMorphPair(entry)) return;
    const sourceOuter = sourceHoles.get(entry.sourceId as string);
    const targetOuter = targetHoles.get(entry.targetId as string);
    if (sourceOuter === undefined || targetOuter === undefined) return;

    const outer = pairIndex.get(`${sourceOuter}|${targetOuter}`);
    if (outer === undefined) return;
    groups.set(outer, [...(groups.get(outer) ?? []), index]);
  });

  return [...groups.entries()].sort(([a], [b]) => a - b).map(([outer, holes]) => ({ outer, holes }));
}
