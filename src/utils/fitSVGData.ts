import SVGPathCommander from 'svg-path-commander';
import type { SVGData } from './svgMorphing';

// How the two SVGs share one output size: "asIs" leaves both alone; "source" / "target" take that
// SVG's box; "larger" / "smaller" take the box with the bigger / smaller viewBox area.
export type OutputSizeMode = 'asIs' | 'source' | 'target' | 'larger' | 'smaller';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FALLBACK_SIZE = 512;

// The drawing's own box: its viewBox, or width/height when the viewBox is missing or invalid.
export const viewBoxOf = (data: SVGData): Box => {
  const parts = data.viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  return {
    x: 0,
    y: 0,
    w: data.width > 0 ? data.width : FALLBACK_SIZE,
    h: data.height > 0 ? data.height : FALLBACK_SIZE,
  };
};

// Scales `data` with ONE uniform factor so it fits whole inside the reference's box, centered, and
// adopts the reference's viewBox, width and height. Paths are rewritten in that coordinate space
// (stroke widths scale with them), so nothing downstream has to know a fit happened.
export const fitToReference = (data: SVGData, reference: SVGData): SVGData => {
  const from = viewBoxOf(data);
  const to = viewBoxOf(reference);
  const scale = Math.min(to.w / from.w, to.h / from.h);
  const tx = to.x + (to.w - from.w * scale) / 2 - from.x * scale;
  const ty = to.y + (to.h - from.h * scale) / 2 - from.y * scale;
  const identity = scale === 1 && tx === 0 && ty === 0;

  return {
    ...data,
    viewBox: reference.viewBox,
    width: reference.width,
    height: reference.height,
    paths: data.paths.map((path) => {
      if (identity) return path;
      const d = new SVGPathCommander(path.d)
        .transform({ scale, origin: [0, 0] })
        .transform({ translate: [tx, ty] })
        .toString();
      return {
        ...path,
        d,
        ...(path.strokeWidth === undefined ? {} : { strokeWidth: path.strokeWidth * scale }),
      };
    }),
  };
};

const area = (data: SVGData): number => {
  const { w, h } = viewBoxOf(data);
  return w * h;
};

// Picks the output size for the pair and fits the other SVG to it. Equal areas: the source wins.
export const fitPair = (
  source: SVGData,
  target: SVGData,
  mode: OutputSizeMode,
): { source: SVGData; target: SVGData } => {
  if (mode === 'asIs') return { source, target };

  const useSource =
    mode === 'source' ||
    (mode === 'larger' && area(source) >= area(target)) ||
    (mode === 'smaller' && area(source) <= area(target));

  return useSource
    ? { source: fitToReference(source, source), target: fitToReference(target, source) }
    : { source: fitToReference(source, target), target: fitToReference(target, target) };
};

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Writes parsed data back as an SVG string. It carries exactly what `parseSVG` reads (paths with
// their paint, plus the box), which is all the morphing pipeline looks at, so a fitted drawing can
// go through the same string-based pipeline as an uploaded one.
export const serializeSVGData = (data: SVGData): string => {
  const paths = data.paths.map((path) => {
    const attributes: [string, string | number | undefined][] = [
      ['d', path.d],
      ['fill', path.fill],
      ['stroke', path.stroke],
      ['stroke-width', path.strokeWidth],
      ['opacity', path.opacity],
      ['stroke-linecap', path.strokeLinecap],
      ['stroke-linejoin', path.strokeLinejoin],
    ];
    const text = attributes
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([name, value]) => `${name}="${escapeAttribute(String(value))}"`)
      .join(' ');
    return `<path ${text}/>`;
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(data.viewBox)}" ` +
    `width="${data.width}" height="${data.height}">${paths.join('')}</svg>`
  );
};
