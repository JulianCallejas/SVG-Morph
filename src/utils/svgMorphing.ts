import { interpolate } from 'd3-interpolate';
import SVGPathCommander from 'svg-path-commander';

export interface PathData {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface SVGData {
  paths: PathData[];
  viewBox: string;
  width: number;
  height: number;
}

/**
 * Parse SVG string and extract path data
 */
export function parseSVG(svgString: string): SVGData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');
  
  if (!svgElement) {
    throw new Error('Invalid SVG format');
  }

  // Extract viewBox or dimensions
  const viewBox = svgElement.getAttribute('viewBox') || '0 0 512 512';
  const width = parseFloat(svgElement.getAttribute('width') || '512');
  const height = parseFloat(svgElement.getAttribute('height') || '512');

  // Extract all path elements
  const pathElements = Array.from(svgElement.querySelectorAll('path'));
  const paths: PathData[] = pathElements.map(path => ({
    d: path.getAttribute('d') || '',
    fill: path.getAttribute('fill') || '#000000',
    stroke: path.getAttribute('stroke') || 'none',
    strokeWidth: parseFloat(path.getAttribute('stroke-width') || '1'),
    opacity: parseFloat(path.getAttribute('opacity') || '1'),
  }));

  // If no paths found, try to convert other shapes to paths
  if (paths.length === 0) {
    const shapes = Array.from(svgElement.querySelectorAll('rect, circle, ellipse, polygon, polyline, line'));
    shapes.forEach(shape => {
      const pathData = convertShapeToPath(shape);
      if (pathData) {
        paths.push({
          d: pathData,
          fill: shape.getAttribute('fill') || '#000000',
          stroke: shape.getAttribute('stroke') || 'none',
          strokeWidth: parseFloat(shape.getAttribute('stroke-width') || '1'),
          opacity: parseFloat(shape.getAttribute('opacity') || '1'),
        });
      }
    });
  }

  return { paths, viewBox, width, height };
}

/**
 * Convert basic SVG shapes to path data
 */
function convertShapeToPath(element: Element): string | null {
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'rect': {
      const x = parseFloat(element.getAttribute('x') || '0');
      const y = parseFloat(element.getAttribute('y') || '0');
      const width = parseFloat(element.getAttribute('width') || '0');
      const height = parseFloat(element.getAttribute('height') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || rx.toString());
      
      if (rx > 0 || ry > 0) {
        return `M${x + rx},${y} L${x + width - rx},${y} Q${x + width},${y} ${x + width},${y + ry} L${x + width},${y + height - ry} Q${x + width},${y + height} ${x + width - rx},${y + height} L${x + rx},${y + height} Q${x},${y + height} ${x},${y + height - ry} L${x},${y + ry} Q${x},${y} ${x + rx},${y} Z`;
      } else {
        return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
      }
    }
    
    case 'circle': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const r = parseFloat(element.getAttribute('r') || '0');
      return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
    }
    
    case 'ellipse': {
      const cx = parseFloat(element.getAttribute('cx') || '0');
      const cy = parseFloat(element.getAttribute('cy') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');
      return `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
    }
    
    default:
      return null;
  }
}

/**
 * Normalize path to have consistent number of points
 */
export function normalizePath(pathData: string, targetPoints: number = 100): string {
  try {
    const path = new SVGPathCommander(pathData);
    const normalized = path.normalize();
    
    // Convert to absolute coordinates and sample points
    const totalLength = normalized.getTotalLength();
    const points: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i <= targetPoints; i++) {
      const t = i / targetPoints;
      const point = normalized.getPointAtLength(t * totalLength);
      points.push({ x: point.x, y: point.y });
    }
    
    // Convert points back to path data
    if (points.length === 0) return pathData;
    
    let pathString = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathString += ` L${points[i].x},${points[i].y}`;
    }
    
    // Close path if original was closed
    if (pathData.includes('Z') || pathData.includes('z')) {
      pathString += ' Z';
    }
    
    return pathString;
  } catch (error) {
    console.warn('Path normalization failed, using original:', error);
    return pathData;
  }
}

/**
 * Interpolate between two path data strings
 */
export function interpolatePaths(sourcePath: string, targetPath: string, progress: number): string {
  try {
    // Normalize both paths to have the same number of points
    const normalizedSource = normalizePath(sourcePath);
    const normalizedTarget = normalizePath(targetPath);
    
    // Parse path commands
    const sourceCommands = parsePathCommands(normalizedSource);
    const targetCommands = parsePathCommands(normalizedTarget);
    
    // Ensure both paths have the same number of commands
    const maxLength = Math.max(sourceCommands.length, targetCommands.length);
    const paddedSource = padPathCommands(sourceCommands, maxLength);
    const paddedTarget = padPathCommands(targetCommands, maxLength);
    
    // Interpolate each command
    const interpolatedCommands = paddedSource.map((sourceCmd, index) => {
      const targetCmd = paddedTarget[index];
      return interpolatePathCommand(sourceCmd, targetCmd, progress);
    });
    
    return interpolatedCommands.join(' ');
  } catch (error) {
    console.warn('Path interpolation failed, using fallback:', error);
    // Fallback to simple opacity blending
    return progress < 0.5 ? sourcePath : targetPath;
  }
}

interface PathCommand {
  type: string;
  values: number[];
}

function parsePathCommands(pathData: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([\d\s,.-]*)/g;
  let match;
  
  while ((match = regex.exec(pathData)) !== null) {
    const type = match[1];
    const valueString = match[2].trim();
    const values = valueString ? valueString.split(/[\s,]+/).map(Number).filter(n => !isNaN(n)) : [];
    commands.push({ type, values });
  }
  
  return commands;
}

function padPathCommands(commands: PathCommand[], targetLength: number): PathCommand[] {
  const padded = [...commands];
  
  while (padded.length < targetLength) {
    const lastCommand = padded[padded.length - 1];
    if (lastCommand && lastCommand.type.toLowerCase() === 'l') {
      // Add a line command with the same endpoint
      padded.push({
        type: lastCommand.type,
        values: [...lastCommand.values]
      });
    } else {
      // Add a move command to the last position
      const lastValues = lastCommand?.values || [0, 0];
      const lastX = lastValues[lastValues.length - 2] || 0;
      const lastY = lastValues[lastValues.length - 1] || 0;
      padded.push({
        type: 'L',
        values: [lastX, lastY]
      });
    }
  }
  
  return padded.slice(0, targetLength);
}

function interpolatePathCommand(source: PathCommand, target: PathCommand, progress: number): string {
  // Use the source command type
  const type = source.type;
  
  // Ensure both commands have the same number of values
  const maxValues = Math.max(source.values.length, target.values.length);
  const sourceValues = [...source.values];
  const targetValues = [...target.values];
  
  // Pad with zeros if needed
  while (sourceValues.length < maxValues) sourceValues.push(0);
  while (targetValues.length < maxValues) targetValues.push(0);
  
  // Interpolate each value
  const interpolatedValues = sourceValues.map((sourceVal, index) => {
    const targetVal = targetValues[index] || sourceVal;
    return sourceVal + (targetVal - sourceVal) * progress;
  });
  
  return type + interpolatedValues.join(',');
}

/**
 * Interpolate colors between two hex colors
 */
export function interpolateColor(sourceColor: string, targetColor: string, progress: number): string {
  if (sourceColor === 'none' || targetColor === 'none') {
    return progress < 0.5 ? sourceColor : targetColor;
  }
  
  try {
    const interpolator = interpolate(sourceColor, targetColor);
    return interpolator(progress);
  } catch (error) {
    return progress < 0.5 ? sourceColor : targetColor;
  }
}

/**
 * Linear interpolation for numbers
 */
export function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Create interpolated SVG at given progress
 */
export function createInterpolatedSVG(sourceSVG: string, targetSVG: string, progress: number): string {
  try {
    const sourceData = parseSVG(sourceSVG);
    const targetData = parseSVG(targetSVG);
    
    // Use the source SVG's dimensions and viewBox
    const { viewBox, width, height } = sourceData;
    
    // Interpolate paths
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);
    const interpolatedPaths: string[] = [];
    
    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      if (!sourcePath || !targetPath) continue;
      
      const interpolatedD = interpolatePaths(sourcePath.d, targetPath.d, progress);
      const interpolatedFill = interpolateColor(sourcePath.fill || '#000000', targetPath.fill || '#000000', progress);
      const interpolatedStroke = sourcePath.stroke === 'none' || targetPath.stroke === 'none' 
        ? (progress < 0.5 ? sourcePath.stroke : targetPath.stroke)
        : interpolateColor(sourcePath.stroke || '#000000', targetPath.stroke || '#000000', progress);
      const interpolatedStrokeWidth = lerp(sourcePath.strokeWidth || 1, targetPath.strokeWidth || 1, progress);
      const interpolatedOpacity = lerp(sourcePath.opacity || 1, targetPath.opacity || 1, progress);
      
      interpolatedPaths.push(`
        <path 
          d="${interpolatedD}" 
          fill="${interpolatedFill}"
          stroke="${interpolatedStroke}"
          stroke-width="${interpolatedStrokeWidth}"
          opacity="${interpolatedOpacity}"
        />
      `);
    }
    
    return `
      <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        ${interpolatedPaths.join('')}
      </svg>
    `;
  } catch (error) {
    console.error('SVG interpolation failed:', error);
    // Fallback to opacity blending
    return `
      <div style="position: relative; width: 100%; height: 100%;">
        <div style="position: absolute; opacity: ${1 - progress};">
          ${sourceSVG}
        </div>
        <div style="position: absolute; opacity: ${progress};">
          ${targetSVG}
        </div>
      </div>
    `;
  }
}