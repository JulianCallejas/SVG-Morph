import { sanitizeSVG } from '../sanitizeSVG';

const DEFAULT_SIZE = 16;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstNumber = (...values: unknown[]): number | undefined =>
  values.find((value): value is number => typeof value === 'number' && Number.isFinite(value));

// One icon of an Iconify-format set ({ width, height, icons: { name: { body } } }) as a standalone,
// sanitized SVG, sized by the icon, else by the set, else 16. Anything malformed gives null.
export const toSvg = (set: Record<string, unknown>, icon: unknown): string | null => {
  if (!isRecord(icon) || typeof icon.body !== 'string') return null;
  const left = firstNumber(icon.left, set.left) ?? 0;
  const top = firstNumber(icon.top, set.top) ?? 0;
  const width = firstNumber(icon.width, set.width) ?? DEFAULT_SIZE;
  const height = firstNumber(icon.height, set.height) ?? DEFAULT_SIZE;
  const svg = sanitizeSVG(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}">${icon.body}</svg>`,
  );
  return svg || null;
};
