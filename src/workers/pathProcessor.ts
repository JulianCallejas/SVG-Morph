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

export interface NodeMatch {
  sourcePoint: { x: number; y: number; id?: string };
  targetPoint: { x: number; y: number; id?: string };
  confidence: number;
}

export interface WorkerMessage {
  type: 'PARSE_SVG' | 'INTERPOLATE_PATHS' | 'CREATE_INTERPOLATED_SVG' | 'NORMALIZE_PATH' | 'INTERPOLATE_WITH_MATCHES' | 'NORMALIZE_PATHS_WITH_MATCHES';
  id: string;
  payload: unknown;
}

export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  id: string;
  payload?: unknown;
  error?: string;
  progress?: number;
}

// Web Worker message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, id, payload } = event.data;
  
  try {
    switch (type) {
      case 'PARSE_SVG':
        handleParseSVG(id, (payload as { svgString: string }).svgString);
        break;
      
      case 'NORMALIZE_PATH':
        handleNormalizePath(id, (payload as { pathData: string; targetPoints: number }).pathData, (payload as { pathData: string; targetPoints: number }).targetPoints);
        break;
      
      case 'INTERPOLATE_PATHS':
        handleInterpolatePaths(id, (payload as { sourcePath: string; targetPath: string; progress: number }).sourcePath, (payload as { sourcePath: string; targetPath: string; progress: number }).targetPath, (payload as { sourcePath: string; targetPath: string; progress: number }).progress);
        break;
      
      case 'CREATE_INTERPOLATED_SVG':
        handleCreateInterpolatedSVG(id, (payload as { sourceSVG: string; targetSVG: string; progress: number; nodeMatches?: NodeMatch[] }).sourceSVG, (payload as { sourceSVG: string; targetSVG: string; progress: number; nodeMatches?: NodeMatch[] }).targetSVG, (payload as { sourceSVG: string; targetSVG: string; progress: number; nodeMatches?: NodeMatch[] }).progress, (payload as { sourceSVG: string; targetSVG: string; progress: number; nodeMatches?: NodeMatch[] }).nodeMatches);
        break;
      
      case 'INTERPOLATE_WITH_MATCHES':
        handleInterpolateWithMatches(id, (payload as { sourcePath: string; targetPath: string; progress: number; nodeMatches: NodeMatch[] }).sourcePath, (payload as { sourcePath: string; targetPath: string; progress: number; nodeMatches: NodeMatch[] }).targetPath, (payload as { sourcePath: string; targetPath: string; progress: number; nodeMatches: NodeMatch[] }).progress, (payload as { sourcePath: string; targetPath: string; progress: number; nodeMatches: NodeMatch[] }).nodeMatches);
        break;
      
      case 'NORMALIZE_PATHS_WITH_MATCHES':
        handleNormalizePathsWithMatches(id, (payload as { sourcePath: string; targetPath: string; nodeMatches: NodeMatch[]; targetPoints: number }).sourcePath, (payload as { sourcePath: string; targetPath: string; nodeMatches: NodeMatch[]; targetPoints: number }).targetPath, (payload as { sourcePath: string; targetPath: string; nodeMatches: NodeMatch[]; targetPoints: number }).nodeMatches, (payload as { sourcePath: string; targetPath: string; nodeMatches: NodeMatch[]; targetPoints: number }).targetPoints);
        break;
      
      default:
        postMessage({
          type: 'ERROR',
          id,
          error: `Unknown message type: ${type}`
        } as WorkerResponse);
    }
  } catch (error) {
    postMessage({
      type: 'ERROR',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as WorkerResponse);
  }
};

function handleParseSVG(id: string, svgString: string) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    const result = parseSVGString(svgString);
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  } catch (error) {
    throw new Error(`SVG parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function handleNormalizePath(id: string, pathData: string, targetPoints: number = 100) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    const path = new SVGPathCommander(pathData);
    const normalized = path.normalize();
    
    postMessage({ type: 'PROGRESS', id, progress: 30 } as WorkerResponse);
    
    // Convert to absolute coordinates and sample points
    const totalLength = normalized.getTotalLength();
    const points: Array<{x: number, y: number}> = [];
    
    postMessage({ type: 'PROGRESS', id, progress: 50 } as WorkerResponse);
    
    for (let i = 0; i <= targetPoints; i++) {
      const t = i / targetPoints;
      const point = normalized.getPointAtLength(t * totalLength);
      points.push({ x: point.x, y: point.y });
      
      // Report progress for long operations
      if (i % 10 === 0) {
        const progress = 50 + (i / targetPoints) * 40;
        postMessage({ type: 'PROGRESS', id, progress } as WorkerResponse);
      }
    }
    
    postMessage({ type: 'PROGRESS', id, progress: 90 } as WorkerResponse);
    
    // Convert points back to path data
    if (points.length === 0) {
      postMessage({
        type: 'SUCCESS',
        id,
        payload: pathData,
        progress: 100
      } as WorkerResponse);
      return;
    }
    
    let pathString = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathString += ` L${points[i].x},${points[i].y}`;
    }
    
    // Close path if original was closed
    if (pathData.includes('Z') || pathData.includes('z')) {
      pathString += ' Z';
    }
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: pathString,
      progress: 100
    } as WorkerResponse);
  } catch (error) {
    console.warn('Path normalization failed, using original:', error);
    postMessage({
      type: 'SUCCESS',
      id,
      payload: pathData,
      progress: 100
    } as WorkerResponse);
  }
}

function handleInterpolatePaths(id: string, sourcePath: string, targetPath: string, progress: number) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    // Normalize both paths to have the same number of points
    postMessage({ type: 'PROGRESS', id, progress: 20 } as WorkerResponse);
    const normalizedSource = normalizePath(sourcePath);
    
    postMessage({ type: 'PROGRESS', id, progress: 40 } as WorkerResponse);
    const normalizedTarget = normalizePath(targetPath);
    
    postMessage({ type: 'PROGRESS', id, progress: 60 } as WorkerResponse);
    
    // Parse path commands
    const sourceCommands = parsePathCommands(normalizedSource);
    const targetCommands = parsePathCommands(normalizedTarget);
    
    postMessage({ type: 'PROGRESS', id, progress: 70 } as WorkerResponse);
    
    // Ensure both paths have the same number of commands
    const maxLength = Math.max(sourceCommands.length, targetCommands.length);
    const paddedSource = padPathCommands(sourceCommands, maxLength);
    const paddedTarget = padPathCommands(targetCommands, maxLength);
    
    postMessage({ type: 'PROGRESS', id, progress: 85 } as WorkerResponse);
    
    // Interpolate each command
    const interpolatedCommands = paddedSource.map((sourceCmd, index) => {
      const targetCmd = paddedTarget[index];
      return interpolatePathCommand(sourceCmd, targetCmd, progress);
    });
    
    const result = interpolatedCommands.join(' ');
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  } catch (error) {
    console.warn('Path interpolation failed, using fallback:', error);
    // Fallback to simple opacity blending
    const result = progress < 0.5 ? sourcePath : targetPath;
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  }
}

function handleCreateInterpolatedSVG(id: string, sourceSVG: string, targetSVG: string, progress: number, nodeMatches?: NodeMatch[]) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    // Debug logging for manual node matches
    if (nodeMatches && nodeMatches.length > 0) {
      console.log('🎯 Web Worker: Using manual node matches for interpolation:', nodeMatches.length, 'matches');
    } else {
      console.log('⚡ Web Worker: Using default interpolation (no manual matches)');
    }
    
    const sourceData = parseSVGString(sourceSVG);
    postMessage({ type: 'PROGRESS', id, progress: 25 } as WorkerResponse);
    
    const targetData = parseSVGString(targetSVG);
    postMessage({ type: 'PROGRESS', id, progress: 50 } as WorkerResponse);
    
    // Use the source SVG's dimensions and viewBox
    const { viewBox, width, height } = sourceData;
    
    // Interpolate paths
    const maxPaths = Math.max(sourceData.paths.length, targetData.paths.length);
    const interpolatedPaths: string[] = [];
    
    for (let i = 0; i < maxPaths; i++) {
      const sourcePath = sourceData.paths[i] || sourceData.paths[sourceData.paths.length - 1];
      const targetPath = targetData.paths[i] || targetData.paths[targetData.paths.length - 1];
      
      if (!sourcePath || !targetPath) continue;
      
      // Use manual node matches if available, otherwise use default interpolation
      const interpolatedD = nodeMatches && nodeMatches.length > 0 
        ? interpolatePathsWithMatches(sourcePath.d, targetPath.d, progress, nodeMatches)
        : interpolatePaths(sourcePath.d, targetPath.d, progress);
      
      // Enhanced fill interpolation that preserves 'none' and undefined values
      let interpolatedFill: string;
      const sourceFill = sourcePath.fill;
      const targetFill = targetPath.fill;
      
      if (sourceFill === undefined && targetFill === undefined) {
        // Both undefined - don't add fill attribute
        interpolatedFill = '';
      } else if (sourceFill === 'none' && targetFill === 'none') {
        // Both none - keep none
        interpolatedFill = 'none';
      } else if ((sourceFill === 'none' || sourceFill === undefined) && targetFill && targetFill !== 'none') {
        // Transitioning from none/undefined to color
        interpolatedFill = progress < 0.5 ? 'none' : targetFill;
      } else if ((targetFill === 'none' || targetFill === undefined) && sourceFill && sourceFill !== 'none') {
        // Transitioning from color to none/undefined
        interpolatedFill = progress < 0.5 ? sourceFill : 'none';
      } else if (sourceFill && targetFill && sourceFill !== 'none' && targetFill !== 'none') {
        // Both have valid colors - interpolate
        interpolatedFill = interpolateColor(sourceFill, targetFill, progress);
      } else {
        // Fallback - use source or target
        interpolatedFill = progress < 0.5 ? (sourceFill || 'none') : (targetFill || 'none');
      }
      
      const interpolatedStroke = sourcePath.stroke === 'none' || targetPath.stroke === 'none' 
        ? (progress < 0.5 ? sourcePath.stroke : targetPath.stroke)
        : interpolateColor(sourcePath.stroke || '#000000', targetPath.stroke || '#000000', progress);
      const interpolatedStrokeWidth = lerp(sourcePath.strokeWidth || 1, targetPath.strokeWidth || 1, progress);
      const interpolatedOpacity = lerp(sourcePath.opacity || 1, targetPath.opacity || 1, progress);
      
      // Build path element with conditional fill attribute
      let pathElement = `<path d="${interpolatedD}"`;
      
      // Only add fill attribute if we have a value
      if (interpolatedFill && interpolatedFill !== '') {
        pathElement += ` fill="${interpolatedFill}"`;
      }
      
      pathElement += ` stroke="${interpolatedStroke}"`;
      pathElement += ` stroke-width="${interpolatedStrokeWidth}"`;
      pathElement += ` opacity="${interpolatedOpacity}"`;
      pathElement += ` />`;
      
      interpolatedPaths.push(pathElement);
      
      // Report progress for each path
      const pathProgress = 50 + ((i + 1) / maxPaths) * 40;
      postMessage({ type: 'PROGRESS', id, progress: pathProgress } as WorkerResponse);
    }
    
    const result = `
      <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <style>
          path:not([fill]) { fill: none !important; }
          path[fill=""] { fill: none !important; }
        </style>
        ${interpolatedPaths.join('')}
      </svg>
    `;
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  } catch (error) {
    console.error('SVG interpolation failed:', error);
    // Fallback to opacity blending
    const result = `
      <div style="position: relative; width: 100%; height: 100%;">
        <div style="position: absolute; opacity: ${1 - progress};">
          ${sourceSVG}
        </div>
        <div style="position: absolute; opacity: ${progress};">
          ${targetSVG}
        </div>
      </div>
    `;
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  }
}

// Helper functions for Web Worker environment (no DOM APIs available)
function parseSVGString(svgString: string): SVGData {
  // Extract SVG attributes using regex since we can't use DOMParser
  const svgMatch = svgString.match(/<svg[^>]*>/i);
  if (!svgMatch) {
    throw new Error('Invalid SVG format - no <svg> tag found');
  }

  const svgTag = svgMatch[0];
  
  // Extract viewBox
  const viewBoxMatch = svgTag.match(/viewBox\s*=\s*["']([^"']*)["']/i);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 512 512';
  
  // Extract width and height
  const widthMatch = svgTag.match(/width\s*=\s*["']?([^"'\s>]*)["']?/i);
  const heightMatch = svgTag.match(/height\s*=\s*["']?([^"'\s>]*)["']?/i);
  
  let width = 512;
  let height = 512;
  
  if (widthMatch) {
    const w = parseFloat(widthMatch[1]);
    if (!isNaN(w)) width = w;
  }
  
  if (heightMatch) {
    const h = parseFloat(heightMatch[1]);
    if (!isNaN(h)) height = h;
  }
  
  // If no explicit width/height, try to extract from viewBox
  if ((!widthMatch || !heightMatch) && viewBoxMatch) {
    const viewBoxValues = viewBoxMatch[1].split(/\s+/);
    if (viewBoxValues.length >= 4) {
      if (!widthMatch) width = parseFloat(viewBoxValues[2]) || 512;
      if (!heightMatch) height = parseFloat(viewBoxValues[3]) || 512;
    }
  }

  // Extract path elements
  const paths: PathData[] = [];
  const pathRegex = /<path[^>]*>/gi;
  let pathMatch;
  
  while ((pathMatch = pathRegex.exec(svgString)) !== null) {
    const pathTag = pathMatch[0];
    
    // Extract path attributes
    const dMatch = pathTag.match(/d\s*=\s*["']([^"']*)["']/i);
    const fillMatch = pathTag.match(/fill\s*=\s*["']([^"']*)["']/i);
    const strokeMatch = pathTag.match(/stroke\s*=\s*["']([^"']*)["']/i);
    const strokeWidthMatch = pathTag.match(/stroke-width\s*=\s*["']?([^"'\s>]*)["']?/i);
    const opacityMatch = pathTag.match(/opacity\s*=\s*["']?([^"'\s>]*)["']?/i);
    
    // Enhanced fill attribute parsing
    let fillValue: string | undefined;
    if (fillMatch) {
      fillValue = fillMatch[1];
    } else {
      // Check for fill in style attribute
      const styleMatch = pathTag.match(/style\s*=\s*["']([^"']*)["']/i);
      if (styleMatch) {
        const styleContent = styleMatch[1];
        const styleFillMatch = styleContent.match(/fill\s*:\s*([^;]+)/i);
        if (styleFillMatch) {
          fillValue = styleFillMatch[1].trim();
        }
      }
    }
    
    if (dMatch) {
      paths.push({
        d: dMatch[1],
        fill: fillValue, // Preserve original fill value including undefined
        stroke: strokeMatch ? strokeMatch[1] : 'none',
        strokeWidth: strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) || 1 : 1,
        opacity: opacityMatch ? parseFloat(opacityMatch[1]) || 1 : 1,
      });
    }
  }

  // If no paths found, try to convert basic shapes
  if (paths.length === 0) {
    // Extract circles
    const circleRegex = /<circle[^>]*>/gi;
    let circleMatch;
    
    while ((circleMatch = circleRegex.exec(svgString)) !== null) {
      const circleTag = circleMatch[0];
      const pathData = convertCircleToPath(circleTag);
      if (pathData) {
        const fillMatch = circleTag.match(/fill\s*=\s*["']([^"']*)["']/i);
        const strokeMatch = circleTag.match(/stroke\s*=\s*["']([^"']*)["']/i);
        const strokeWidthMatch = circleTag.match(/stroke-width\s*=\s*["']?([^"'\s>]*)["']?/i);
        const opacityMatch = circleTag.match(/opacity\s*=\s*["']?([^"'\s>]*)["']?/i);
        
        // Enhanced fill attribute parsing for circles
        let fillValue: string | undefined;
        if (fillMatch) {
          fillValue = fillMatch[1];
        } else {
          // Check for fill in style attribute
          const styleMatch = circleTag.match(/style\s*=\s*["']([^"']*)["']/i);
          if (styleMatch) {
            const styleContent = styleMatch[1];
            const styleFillMatch = styleContent.match(/fill\s*:\s*([^;]+)/i);
            if (styleFillMatch) {
              fillValue = styleFillMatch[1].trim();
            }
          }
        }
        
        paths.push({
          d: pathData,
          fill: fillValue, // Preserve original fill value including undefined
          stroke: strokeMatch ? strokeMatch[1] : 'none',
          strokeWidth: strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) || 1 : 1,
          opacity: opacityMatch ? parseFloat(opacityMatch[1]) || 1 : 1,
        });
      }
    }

    // Extract rectangles
    const rectRegex = /<rect[^>]*>/gi;
    let rectMatch;
    
    while ((rectMatch = rectRegex.exec(svgString)) !== null) {
      const rectTag = rectMatch[0];
      const pathData = convertRectToPath(rectTag);
      if (pathData) {
        const fillMatch = rectTag.match(/fill\s*=\s*["']([^"']*)["']/i);
        const strokeMatch = rectTag.match(/stroke\s*=\s*["']([^"']*)["']/i);
        const strokeWidthMatch = rectTag.match(/stroke-width\s*=\s*["']?([^"'\s>]*)["']?/i);
        const opacityMatch = rectTag.match(/opacity\s*=\s*["']?([^"'\s>]*)["']?/i);
        
        // Enhanced fill attribute parsing for rectangles
        let fillValue: string | undefined;
        if (fillMatch) {
          fillValue = fillMatch[1];
        } else {
          // Check for fill in style attribute
          const styleMatch = rectTag.match(/style\s*=\s*["']([^"']*)["']/i);
          if (styleMatch) {
            const styleContent = styleMatch[1];
            const styleFillMatch = styleContent.match(/fill\s*:\s*([^;]+)/i);
            if (styleFillMatch) {
              fillValue = styleFillMatch[1].trim();
            }
          }
        }
        
        paths.push({
          d: pathData,
          fill: fillValue, // Preserve original fill value including undefined
          stroke: strokeMatch ? strokeMatch[1] : 'none',
          strokeWidth: strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) || 1 : 1,
          opacity: opacityMatch ? parseFloat(opacityMatch[1]) || 1 : 1,
        });
      }
    }
  }

  return { paths, viewBox, width, height };
}

function convertCircleToPath(circleTag: string): string | null {
  const cxMatch = circleTag.match(/cx\s*=\s*["']?([^"'\s>]*)["']?/i);
  const cyMatch = circleTag.match(/cy\s*=\s*["']?([^"'\s>]*)["']?/i);
  const rMatch = circleTag.match(/r\s*=\s*["']?([^"'\s>]*)["']?/i);
  
  if (!rMatch) return null;
  
  const cx = cxMatch ? parseFloat(cxMatch[1]) || 0 : 0;
  const cy = cyMatch ? parseFloat(cyMatch[1]) || 0 : 0;
  const r = parseFloat(rMatch[1]) || 0;
  
  if (r <= 0) return null;
  
  return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} Z`;
}

function convertRectToPath(rectTag: string): string | null {
  const xMatch = rectTag.match(/x\s*=\s*["']?([^"'\s>]*)["']?/i);
  const yMatch = rectTag.match(/y\s*=\s*["']?([^"'\s>]*)["']?/i);
  const widthMatch = rectTag.match(/width\s*=\s*["']?([^"'\s>]*)["']?/i);
  const heightMatch = rectTag.match(/height\s*=\s*["']?([^"'\s>]*)["']?/i);
  
  if (!widthMatch || !heightMatch) return null;
  
  const x = xMatch ? parseFloat(xMatch[1]) || 0 : 0;
  const y = yMatch ? parseFloat(yMatch[1]) || 0 : 0;
  const width = parseFloat(widthMatch[1]) || 0;
  const height = parseFloat(heightMatch[1]) || 0;
  
  if (width <= 0 || height <= 0) return null;
  
  return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
}

// DOM-based shape conversion removed - using regex-based parsing instead

// Note: parseSVG function replaced with parseSVGString for Web Worker compatibility

function normalizePath(pathData: string, targetPoints: number = 100): string {
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

function interpolatePaths(sourcePath: string, targetPath: string, progress: number): string {
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

function interpolateColor(sourceColor: string, targetColor: string, progress: number): string {
  if (sourceColor === 'none' || targetColor === 'none') {
    return progress < 0.5 ? sourceColor : targetColor;
  }
  
  try {
    const interpolator = interpolate(sourceColor, targetColor);
    return interpolator(progress);
  } catch (error) {
    console.warn('Color interpolation failed:', error);
    return progress < 0.5 ? sourceColor : targetColor;
  }
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Handle interpolation with manual node matches
 */
function handleInterpolateWithMatches(id: string, sourcePath: string, targetPath: string, progress: number, nodeMatches: NodeMatch[]) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    const result = interpolatePathsWithMatches(sourcePath, targetPath, progress, nodeMatches);
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  } catch (error) {
    console.warn('Path interpolation with matches failed, using fallback:', error);
    // Fallback to regular interpolation
    const result = interpolatePaths(sourcePath, targetPath, progress);
    postMessage({
      type: 'SUCCESS',
      id,
      payload: result,
      progress: 100
    } as WorkerResponse);
  }
}

/**
 * Interpolate paths using manual node matches for better morphing
 */
function interpolatePathsWithMatches(sourcePath: string, targetPath: string, progress: number, nodeMatches: NodeMatch[]): string {
  try {
    console.log('🎯 Worker: interpolatePathsWithMatches called with', nodeMatches.length, 'matches');
    console.log('📍 First few matches:', nodeMatches.slice(0, 2));
    
    // If we have node matches, use them to create better correspondence
    if (nodeMatches.length === 0) {
      console.warn('⚠️ No node matches provided, falling back to regular interpolation');
      return interpolatePaths(sourcePath, targetPath, progress);
    }
    
    // Parse source and target paths to get point arrays
    const sourcePoints = extractPointsFromPath(sourcePath);
    const targetPoints = extractPointsFromPath(targetPath);
    
    if (sourcePoints.length === 0 || targetPoints.length === 0) {
      console.warn('Could not extract points from paths, using regular interpolation');
      return interpolatePaths(sourcePath, targetPath, progress);
    }
    
    // Create correspondence mapping based on manual matches
    const correspondenceMap = new Map<number, number>();
    
    // Map manual matches to point indices
    nodeMatches.forEach(match => {
      const sourceIndex = findClosestPointIndex(sourcePoints, match.sourcePoint);
      const targetIndex = findClosestPointIndex(targetPoints, match.targetPoint);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        correspondenceMap.set(sourceIndex, targetIndex);
      }
    });
    
    console.log('Created correspondence map with', correspondenceMap.size, 'mappings');
    
    // Interpolate points using the correspondence map
    const interpolatedPoints = interpolatePointsWithCorrespondence(
      sourcePoints, 
      targetPoints, 
      correspondenceMap, 
      progress
    );
    
    // Convert interpolated points back to path
    return pointsToPath(interpolatedPoints);
    
  } catch (error) {
    console.error('Manual node matching interpolation failed:', error);
    return interpolatePaths(sourcePath, targetPath, progress);
  }
}

/**
 * Extract points from a path string
 */
function extractPointsFromPath(pathData: string, targetPoints: number = 100): Array<{x: number, y: number}> {
  try {
    const path = new SVGPathCommander(pathData);
    const normalized = path.normalize();
    const totalLength = normalized.getTotalLength();
    const points: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i <= targetPoints; i++) {
      const t = i / targetPoints;
      const point = normalized.getPointAtLength(t * totalLength);
      points.push({ x: point.x, y: point.y });
    }
    
    return points;
  } catch (error) {
    console.warn('Failed to extract points from path:', error);
    return Array.from({ length: targetPoints }, (_, i) => ({
      x: i * 10,
      y: i * 10
    }));
  }
}

/**
 * Find the closest point index to a target point
 */
function findClosestPointIndex(points: Array<{x: number, y: number}>, target: {x: number, y: number}): number {
  let closestIndex = -1;
  let minDistance = Infinity;
  
  points.forEach((point, index) => {
    const distance = Math.sqrt(
      Math.pow(point.x - target.x, 2) + Math.pow(point.y - target.y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });
  
  return closestIndex;
}

/**
 * Interpolate points using correspondence mapping
 */
function interpolatePointsWithCorrespondence(
  sourcePoints: Array<{x: number, y: number}>,
  targetPoints: Array<{x: number, y: number}>,
  correspondenceMap: Map<number, number>,
  progress: number
): Array<{x: number, y: number}> {
  const interpolatedPoints: Array<{x: number, y: number}> = [];
  
  // Create a target mapping for all source points
  const targetMapping = new Array(sourcePoints.length);
  
  // Fill in manual correspondences
  correspondenceMap.forEach((targetIndex, sourceIndex) => {
    targetMapping[sourceIndex] = targetIndex;
  });
  
  // Fill in remaining correspondences using simple linear mapping
  let nextTargetIndex = 0;
  for (let i = 0; i < sourcePoints.length; i++) {
    if (targetMapping[i] === undefined) {
      // Find next available target index
      while (nextTargetIndex < targetPoints.length && 
             Array.from(correspondenceMap.values()).includes(nextTargetIndex)) {
        nextTargetIndex++;
      }
      
      if (nextTargetIndex < targetPoints.length) {
        targetMapping[i] = nextTargetIndex;
        nextTargetIndex++;
      } else {
        // Use the last target point if we run out
        targetMapping[i] = targetPoints.length - 1;
      }
    }
  }
  
  // Interpolate each source point to its corresponding target point
  sourcePoints.forEach((sourcePoint, index) => {
    const targetIndex = targetMapping[index] || 0;
    const targetPoint = targetPoints[targetIndex] || targetPoints[targetPoints.length - 1];
    
    const interpolatedPoint = {
      x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * progress,
      y: sourcePoint.y + (targetPoint.y - sourcePoint.y) * progress
    };
    
    interpolatedPoints.push(interpolatedPoint);
  });
  
  return interpolatedPoints;
}

/**
 * Convert points array back to path string
 */
function pointsToPath(points: Array<{x: number, y: number}>): string {
  if (points.length === 0) return '';
  
  let pathString = `M${points[0].x},${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    pathString += ` L${points[i].x},${points[i].y}`;
  }
  
  return pathString;
}

/**
 * Handle normalizing paths with manual node matches for SMIL export
 */
function handleNormalizePathsWithMatches(
  id: string, 
  sourcePath: string, 
  targetPath: string, 
  nodeMatches: NodeMatch[], 
  targetPoints: number = 100
) {
  postMessage({ type: 'PROGRESS', id, progress: 0 } as WorkerResponse);
  
  try {
    console.log('🎯 Worker: Normalizing paths with manual node matches:', nodeMatches.length, 'matches');
    
    // Step 1: Extract points from both paths using manual matches
    postMessage({ type: 'PROGRESS', id, progress: 20 } as WorkerResponse);
    
    const sourcePoints = extractPointsFromPath(sourcePath, targetPoints);
    const targetPoints_extracted = extractPointsFromPath(targetPath, targetPoints);
    
    postMessage({ type: 'PROGRESS', id, progress: 40 } as WorkerResponse);
    
    // Step 2: Apply manual node matches to create corresponding point sequences
    const { alignedSource, alignedTarget } = applyNodeMatchesToPoints(
      sourcePoints, 
      targetPoints_extracted, 
      nodeMatches, 
      targetPoints
    );
    
    postMessage({ type: 'PROGRESS', id, progress: 70 } as WorkerResponse);
    
    // Step 3: Convert back to normalized path strings
    const normalizedSource = pointsToPath(alignedSource);
    const normalizedTarget = pointsToPath(alignedTarget);
    
    postMessage({ type: 'PROGRESS', id, progress: 90 } as WorkerResponse);
    
    console.log('🎯 Worker: Generated normalized paths with matches:', {
      sourceLength: normalizedSource.length,
      targetLength: normalizedTarget.length,
      pointCount: alignedSource.length
    });
    
    postMessage({
      type: 'SUCCESS',
      id,
      payload: { normalizedSource, normalizedTarget },
      progress: 100
    } as WorkerResponse);
    
  } catch (error) {
    console.warn('Path normalization with matches failed, using fallback:', error);
    
    // Fallback to regular normalization
    try {
      const normalizedSource = normalizePath(sourcePath, targetPoints);
      const normalizedTarget = normalizePath(targetPath, targetPoints);
      
      postMessage({
        type: 'SUCCESS',
        id,
        payload: { normalizedSource, normalizedTarget },
        progress: 100
      } as WorkerResponse);
    } catch (fallbackError) {
      postMessage({
        type: 'ERROR',
        id,
        error: `Path normalization failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
      } as WorkerResponse);
    }
  }
}

/**
 * Apply manual node matches to create aligned point sequences
 */
function applyNodeMatchesToPoints(
  sourcePoints: Array<{x: number, y: number}>,
  targetPoints: Array<{x: number, y: number}>,
  nodeMatches: NodeMatch[],
  desiredPointCount: number
): { alignedSource: Array<{x: number, y: number}>, alignedTarget: Array<{x: number, y: number}> } {
  
  if (nodeMatches.length === 0) {
    // No matches, return original points
    return { 
      alignedSource: sourcePoints.slice(0, desiredPointCount), 
      alignedTarget: targetPoints.slice(0, desiredPointCount) 
    };
  }
  
  // Create aligned sequences based on manual matches
  const alignedSource: Array<{x: number, y: number}> = [];
  const alignedTarget: Array<{x: number, y: number}> = [];
  
  // Sort matches by source point position for consistent ordering
  const sortedMatches = [...nodeMatches].sort((a, b) => {
    const aIndex = sourcePoints.findIndex(p => 
      Math.abs(p.x - a.sourcePoint.x) < 5 && Math.abs(p.y - a.sourcePoint.y) < 5
    );
    const bIndex = sourcePoints.findIndex(p => 
      Math.abs(p.x - b.sourcePoint.x) < 5 && Math.abs(p.y - b.sourcePoint.y) < 5
    );
    return aIndex - bIndex;
  });
  
  // Distribute points evenly, ensuring matched points are included
  const pointsPerSegment = Math.floor(desiredPointCount / (sortedMatches.length + 1));
  
  for (let i = 0; i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    
    // Add interpolated points leading up to this match
    const startIndex = i * pointsPerSegment;
    const endIndex = startIndex + pointsPerSegment;
    
    for (let j = startIndex; j < endIndex && alignedSource.length < desiredPointCount - 1; j++) {
      const t = j / desiredPointCount;
      const sourceIndex = Math.floor(t * (sourcePoints.length - 1));
      const targetIndex = Math.floor(t * (targetPoints.length - 1));
      
      alignedSource.push(sourcePoints[sourceIndex] || sourcePoints[sourcePoints.length - 1]);
      alignedTarget.push(targetPoints[targetIndex] || targetPoints[targetPoints.length - 1]);
    }
    
    // Add the matched points
    if (alignedSource.length < desiredPointCount) {
      alignedSource.push(match.sourcePoint);
      alignedTarget.push(match.targetPoint);
    }
  }
  
  // Fill remaining points
  while (alignedSource.length < desiredPointCount) {
    const t = alignedSource.length / desiredPointCount;
    const sourceIndex = Math.floor(t * (sourcePoints.length - 1));
    const targetIndex = Math.floor(t * (targetPoints.length - 1));
    
    alignedSource.push(sourcePoints[sourceIndex] || sourcePoints[sourcePoints.length - 1]);
    alignedTarget.push(targetPoints[targetIndex] || targetPoints[targetPoints.length - 1]);
  }
  
  return { alignedSource, alignedTarget };
}

