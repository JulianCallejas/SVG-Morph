import { getPathBBox, parsePathString, pathToString, splitPath } from 'svg-path-commander';

export interface ContourBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One continuous outline: a single subpath (`M` segment) of a `<path>` `d` attribute. */
export interface Contour {
  id: string;
  d: string;
  closed: boolean;
  bbox: ContourBBox;
}

/**
 * Split a path `d` into its subpaths so each one can be handled on its own.
 * Every contour starts with an absolute `M`. Throws on an invalid path;
 * a blank string yields no contours.
 */
export function splitContours(d: string, idPrefix = 'c'): Contour[] {
  if (d.trim() === '') return [];

  return splitPath(parsePathString(d)).map((subpath, index) => {
    const { x, y, width, height } = getPathBBox(subpath);
    const lastCommand = subpath[subpath.length - 1][0];

    return {
      id: `${idPrefix}${index + 1}`,
      d: pathToString(subpath, 'off'),
      closed: lastCommand === 'Z' || lastCommand === 'z',
      bbox: { x, y, width, height },
    };
  });
}
