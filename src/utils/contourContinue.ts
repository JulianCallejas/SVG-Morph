import type { Contour } from './contours';
import type { NodeAnchor } from './contourPairing';
import { anchorsRealizable, isLoop, pairNodes } from './contourInterpolation';

const mod = (value: number, size: number): number => ((value % size) + size) % size;
const EPSILON = 1e-9;

/**
 * The point that continues a hand matching at its own pace, or null when there is nothing to add.
 *
 * The pace is how far the target moves per node of the source between the last two matched points
 * (so it carries the direction too). From the last matched point it runs on at that pace, through the
 * unmatched stretch that follows, and the point it returns is where it stops: the nodes in between
 * follow the pace exactly, as the matching already spreads them in proportion between points.
 * It stops one node short of the end of either side, so the last stretch keeps a node of each and
 * absorbs whatever the pace does not cover. A pace that fits the shapes closes cleanly; one that
 * does not leaves a stretch that is squeezed or stretched.
 *
 * On a contour that runs round it continues after the matched run (the point before the longest
 * unmatched stretch); on a line, from the last matched point towards its end.
 */
export function continueMatching(
  source: Contour,
  target: Contour,
  nodeCount: number,
  anchors: NodeAnchor[],
): NodeAnchor | null {
  if (anchors.length < 2 || !anchorsRealizable(source, target, anchors)) return null;

  const n = nodeCount;
  const closed = isLoop(source) && isLoop(target);
  const sorted = [...anchors].sort((a, b) => a.source - b.source);
  const index = sorted.map((anchor) => Math.round(anchor.source * n));

  // Where each source node lands on the target, in nodes, following the target round and round
  // instead of jumping back to 0 each lap
  const { targetAt } = pairNodes(source, target, n, anchors);
  const unwrapped = [targetAt[0] * n];
  for (let i = 1; i <= n; i++) {
    let step = (targetAt[i] - targetAt[i - 1]) * n;
    if (closed) step = mod(step + n / 2, n) - n / 2;
    unwrapped.push(unwrapped[i - 1] + step);
  }
  const turn = unwrapped[n] - unwrapped[0];
  const targetOf = (i: number): number =>
    closed ? unwrapped[mod(i, n)] + turn * Math.floor(i / n) : unwrapped[Math.min(n, Math.max(0, i))];

  // `last`: the matched point the pace carries on from, `before`: the one that gives the pace,
  // `room`: source nodes from `last` to the end of the stretch it continues through
  let last: number;
  let before: number;
  let room: number;
  if (closed) {
    const gaps = index.map((at, j) => mod(index[(j + 1) % index.length] - at - 1, n) + 1);
    const widest = gaps.indexOf(Math.max(...gaps));
    const previous = mod(widest - 1, index.length);
    last = index[widest];
    before = last - (mod(last - index[previous] - 1, n) + 1);
    room = gaps[widest];
  } else {
    last = index[index.length - 1];
    before = index[index.length - 2];
    room = n - last;
  }
  if (last === before) return null;

  const pace = (targetOf(last) - targetOf(before)) / (last - before);
  if (Math.abs(pace) < EPSILON) return null;

  // target nodes left to cover from `last` to the end of the stretch
  const left = closed
    ? Math.abs(targetOf(last + room) - targetOf(last))
    : pace > 0
      ? n - targetOf(last)
      : targetOf(last);
  const steps = Math.floor(Math.min(room - 1, (left - 1) / Math.abs(pace) + EPSILON));
  if (steps < 1) return null;

  const at = targetOf(last) + pace * steps;
  const next: NodeAnchor = closed
    ? { source: mod(last + steps, n) / n, target: mod(at, n) / n }
    : { source: (last + steps) / n, target: at / n };
  return anchorsRealizable(source, target, [...anchors, next]) ? next : null;
}
