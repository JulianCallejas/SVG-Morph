// Full class names on purpose: Tailwind only generates classes it can read in the source.
export const CONTOUR_STROKE = [
  'stroke-contour-1',
  'stroke-contour-2',
  'stroke-contour-3',
  'stroke-contour-4',
  'stroke-contour-5',
  'stroke-contour-6',
] as const;

export const CONTOUR_SOFT_FILL = [
  'fill-contour-1/20',
  'fill-contour-2/20',
  'fill-contour-3/20',
  'fill-contour-4/20',
  'fill-contour-5/20',
  'fill-contour-6/20',
] as const;

export const CONTOUR_SWATCH = [
  'bg-contour-1',
  'bg-contour-2',
  'bg-contour-3',
  'bg-contour-4',
  'bg-contour-5',
  'bg-contour-6',
] as const;

/** Color slot of a plan entry; the palette repeats after six entries. */
export const colorSlot = (entryIndex: number): number => entryIndex % CONTOUR_STROKE.length;
