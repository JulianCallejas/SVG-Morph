interface Boxed {
  id: string;
  bbox: { width: number; height: number };
}

/**
 * The order to draw contours in, bottom to top. Larger contours go first so a small one is never
 * hidden under a big one, and `raised` ids (the last is highest) go on top of everything, so a
 * contour can be worked on whatever covers it. Ties keep their original order.
 */
export function stackContours<T extends Boxed>(
  contours: readonly T[],
  raised: ReadonlyArray<string | null | undefined> = [],
): T[] {
  const area = (contour: T): number => contour.bbox.width * contour.bbox.height;
  const bySize = contours
    .map((contour, index) => ({ contour, index }))
    .sort((a, b) => area(b.contour) - area(a.contour) || a.index - b.index)
    .map(({ contour }) => contour);

  // an id given twice counts at its last position
  const ids = raised.filter((id): id is string => !!id);
  const onTop = ids.filter((id, i) => ids.lastIndexOf(id) === i);
  const top = onTop.flatMap((id) => bySize.filter((contour) => contour.id === id));
  const raisedIds = new Set(top.map((contour) => contour.id));

  return [...bySize.filter((contour) => !raisedIds.has(contour.id)), ...top];
}
