export type StrokeLinecap = 'butt' | 'round' | 'square';
export type StrokeLinejoin = 'miter' | 'round' | 'bevel' | 'miter-clip' | 'arcs';

const LINECAPS: readonly StrokeLinecap[] = ['butt', 'round', 'square'];
const LINEJOINS: readonly StrokeLinejoin[] = ['miter', 'round', 'bevel', 'miter-clip', 'arcs'];

const normalize = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();

/**
 * Reads a `stroke-linecap` value from a user SVG. Only the real keywords come through, so
 * nothing else can end up inside generated markup; anything else is undefined.
 */
export function parseLinecap(value: string | null | undefined): StrokeLinecap | undefined {
  const keyword = normalize(value);
  return LINECAPS.find((cap) => cap === keyword);
}

/** Same as `parseLinecap`, for `stroke-linejoin`. */
export function parseLinejoin(value: string | null | undefined): StrokeLinejoin | undefined {
  const keyword = normalize(value);
  return LINEJOINS.find((join) => join === keyword);
}
