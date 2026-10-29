import { sanitizeSVG } from './sanitizeSVG';

const PAINT_ATTRIBUTES = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
const SHAPES = 'path, rect, circle, ellipse, polygon, polyline, line';
// Icons are drawn in `currentColor`, which means nothing once the SVG leaves the page. A mid gray reads on
// both the dark and the light canvas (about 5:1 on the dark one, 4:1 on white); black vanishes on dark.
export const ICON_COLOR = '#808080';

const isPlainNumber = (value: string | null): boolean => value !== null && /^\d+(\.\d+)?$/.test(value.trim());

// Makes an icon usable as an SVG to morph. The morphing engine reads paint from each shape, but
// icon sets declare it once on the root or on a group (`fill="none" stroke="currentColor"`), so
// the nearest declaration is copied onto every shape and `currentColor` becomes a real color.
// A relative size such as `1em` becomes the viewBox size. The text is sanitized first; anything
// that is not an SVG gives an empty string.
export const prepareIconSvg = (svg: string): string => {
  const safe = sanitizeSVG(svg);
  if (!safe) return '';

  const doc = new DOMParser().parseFromString(safe, 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.tagName.toLowerCase() !== 'svg') return '';

  root.querySelectorAll(SHAPES).forEach((shape) => {
    for (const name of PAINT_ATTRIBUTES) {
      if (shape.hasAttribute(name)) continue;
      const source = shape.closest(`[${name}]`);
      if (source) shape.setAttribute(name, source.getAttribute(name) ?? '');
    }
    for (const name of ['fill', 'stroke']) {
      if (shape.getAttribute(name)?.toLowerCase() === 'currentcolor') {
        shape.setAttribute(name, ICON_COLOR);
      }
    }
  });

  const box = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  if (box.length === 4 && box.every(Number.isFinite)) {
    if (!isPlainNumber(root.getAttribute('width'))) root.setAttribute('width', String(box[2]));
    if (!isPlainNumber(root.getAttribute('height'))) root.setAttribute('height', String(box[3]));
  }

  return new XMLSerializer().serializeToString(root);
};
