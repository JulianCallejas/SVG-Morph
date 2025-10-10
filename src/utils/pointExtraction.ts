import SVGPathCommander from 'svg-path-commander';
import { Point } from './kdTree';
import { SVGData, PathData } from '../workers/pathProcessor';

export interface ExtractPointsOptions {
  pointsPerPath?: number;
  includeControlPoints?: boolean;
  normalizeCoordinates?: boolean;
  viewBox?: string;
}

/**
 * Extract points from SVG path data for node matching
 */
export function extractPointsFromSVGData(
  svgData: SVGData,
  options: ExtractPointsOptions = {}
): Point[] {
  const {
    pointsPerPath = 50,
    includeControlPoints = false,
    normalizeCoordinates = true,
  } = options;

  const points: Point[] = [];
  let pointIndex = 0;

  svgData.paths.forEach((pathData, pathIndex) => {
    const pathPoints = extractPointsFromPath(
      pathData,
      pointsPerPath,
      includeControlPoints,
      pathIndex,
      pointIndex
    );

    // Normalize coordinates if requested
    if (normalizeCoordinates && svgData.viewBox) {
      const normalizedPoints = normalizePoints(pathPoints, svgData.viewBox, svgData.width, svgData.height);
      points.push(...normalizedPoints);
    } else {
      points.push(...pathPoints);
    }

    pointIndex += pathPoints.length;
  });

  return points;
}

/**
 * Extract points from a single path
 */
export function extractPointsFromPath(
  pathData: PathData,
  numPoints: number = 50,
  includeControlPoints: boolean = false,
  pathIndex: number = 0,
  startIndex: number = 0
): Point[] {
  const points: Point[] = [];

  try {
    const path = new SVGPathCommander(pathData.d);
    const totalLength = path.getTotalLength();

    if (totalLength === 0) {
      // If path has no length, try to extract start point
      const startPoint = path.getPointAtLength(0);
      if (startPoint && !isNaN(startPoint.x) && !isNaN(startPoint.y)) {
        points.push({
          x: startPoint.x,
          y: startPoint.y,
          id: `path-${pathIndex}-point-${startIndex}`,
        });
      }
      return points;
    }

    // Extract points along the path
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const point = path.getPointAtLength(t * totalLength);
      
      if (point && !isNaN(point.x) && !isNaN(point.y)) {
        points.push({
          x: point.x,
          y: point.y,
          id: `path-${pathIndex}-point-${startIndex + i}`,
        });
      }
    }

    // Optionally extract control points from bezier curves
    if (includeControlPoints) {
      const controlPoints = extractControlPoints(pathData.d, pathIndex, startIndex + numPoints + 1);
      points.push(...controlPoints);
    }

  } catch (error) {
    console.warn(`Failed to extract points from path ${pathIndex}:`, error);
    
    // Fallback: try to parse simple path commands manually
    const fallbackPoints = extractPointsManually(pathData.d, pathIndex, startIndex);
    points.push(...fallbackPoints);
  }

  return points;
}

/**
 * Extract control points from bezier curves
 */
function extractControlPoints(pathData: string, pathIndex: number, startIndex: number): Point[] {
  const points: Point[] = [];
  const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
  
  let pointIndex = startIndex;
  
  commands.forEach((command) => {
    const type = command[0];
    const values = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    if ((type === 'C' || type === 'c') && values.length >= 6) {
      // Cubic bezier curve - extract control points
      for (let i = 0; i < values.length; i += 6) {
        if (i + 5 < values.length) {
          // First control point
          points.push({
            x: type === 'C' ? values[i] : values[i], // Relative vs absolute handled by SVGPathCommander
            y: type === 'C' ? values[i + 1] : values[i + 1],
            id: `path-${pathIndex}-control-${pointIndex++}`,
          });
          
          // Second control point
          points.push({
            x: type === 'C' ? values[i + 2] : values[i + 2],
            y: type === 'C' ? values[i + 3] : values[i + 3],
            id: `path-${pathIndex}-control-${pointIndex++}`,
          });
        }
      }
    } else if ((type === 'Q' || type === 'q') && values.length >= 4) {
      // Quadratic bezier curve - extract control point
      for (let i = 0; i < values.length; i += 4) {
        if (i + 3 < values.length) {
          points.push({
            x: type === 'Q' ? values[i] : values[i],
            y: type === 'Q' ? values[i + 1] : values[i + 1],
            id: `path-${pathIndex}-control-${pointIndex++}`,
          });
        }
      }
    }
  });
  
  return points;
}

/**
 * Fallback manual point extraction for simple paths
 */
function extractPointsManually(pathData: string, pathIndex: number, startIndex: number): Point[] {
  const points: Point[] = [];
  const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
  
  let currentX = 0;
  let currentY = 0;
  let pointIndex = startIndex;
  
  commands.forEach((command) => {
    const type = command[0];
    const values = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    switch (type.toLowerCase()) {
      case 'm': // Move to
        if (values.length >= 2) {
          currentX = type === 'M' ? values[0] : currentX + values[0];
          currentY = type === 'M' ? values[1] : currentY + values[1];
          points.push({
            x: currentX,
            y: currentY,
            id: `path-${pathIndex}-point-${pointIndex++}`,
          });
        }
        break;
        
      case 'l': // Line to
        for (let i = 0; i < values.length; i += 2) {
          if (i + 1 < values.length) {
            currentX = type === 'L' ? values[i] : currentX + values[i];
            currentY = type === 'L' ? values[i + 1] : currentY + values[i + 1];
            points.push({
              x: currentX,
              y: currentY,
              id: `path-${pathIndex}-point-${pointIndex++}`,
            });
          }
        }
        break;
        
      case 'h': // Horizontal line
        values.forEach((value) => {
          currentX = type === 'H' ? value : currentX + value;
          points.push({
            x: currentX,
            y: currentY,
            id: `path-${pathIndex}-point-${pointIndex++}`,
          });
        });
        break;
        
      case 'v': // Vertical line
        values.forEach((value) => {
          currentY = type === 'V' ? value : currentY + value;
          points.push({
            x: currentX,
            y: currentY,
            id: `path-${pathIndex}-point-${pointIndex++}`,
          });
        });
        break;
    }
  });
  
  return points;
}

/**
 * Normalize points to fit within a standard coordinate system
 */
function normalizePoints(points: Point[], viewBox: string, _width: number, _height: number): Point[] {
  if (points.length === 0) return points;
  
  // Parse viewBox
  const viewBoxValues = viewBox.split(/\s+/).map(Number);
  if (viewBoxValues.length !== 4) return points;
  
  const [vbX, vbY, vbWidth, vbHeight] = viewBoxValues;
  
  // Calculate scaling factors
  const scaleX = 300 / vbWidth; // Normalize to 300px width for display
  const scaleY = 300 / vbHeight; // Normalize to 300px height for display
  
  return points.map(point => ({
    ...point,
    x: (point.x - vbX) * scaleX,
    y: (point.y - vbY) * scaleY,
  }));
}

/**
 * Get bounding box of points
 */
export function getPointsBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  
  return { minX, minY, maxX, maxY };
}

/**
 * Scale points to fit within specified dimensions
 */
export function scalePointsToFit(points: Point[], targetWidth: number, targetHeight: number, padding: number = 20): Point[] {
  if (points.length === 0) return points;
  
  const bounds = getPointsBounds(points);
  const sourceWidth = bounds.maxX - bounds.minX;
  const sourceHeight = bounds.maxY - bounds.minY;
  
  if (sourceWidth === 0 || sourceHeight === 0) return points;
  
  const availableWidth = targetWidth - (padding * 2);
  const availableHeight = targetHeight - (padding * 2);
  
  const scaleX = availableWidth / sourceWidth;
  const scaleY = availableHeight / sourceHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const offsetX = padding + (availableWidth - sourceWidth * scale) / 2;
  const offsetY = padding + (availableHeight - sourceHeight * scale) / 2;
  
  return points.map(point => ({
    ...point,
    x: (point.x - bounds.minX) * scale + offsetX,
    y: (point.y - bounds.minY) * scale + offsetY,
  }));
}
