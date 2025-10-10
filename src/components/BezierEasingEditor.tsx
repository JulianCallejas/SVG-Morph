import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, Copy, Play, Pause } from 'lucide-react';

export interface BezierPoint {
  x: number;
  y: number;
}

export interface BezierCurve {
  p1: BezierPoint;
  p2: BezierPoint;
}

interface BezierEasingEditorProps {
  initialCurve?: BezierCurve;
  onCurveChange: (curve: BezierCurve) => void;
  onPreview?: (t: number) => void;
  className?: string;
}

const PRESETS: { [key: string]: BezierCurve } = {
  linear: { p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
  ease: { p1: { x: 0.25, y: 0.1 }, p2: { x: 0.25, y: 1 } },
  'ease-in': { p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 } },
  'ease-out': { p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 } },
  'ease-in-out': { p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 } },
  bounce: { p1: { x: 0.68, y: -0.55 }, p2: { x: 0.265, y: 1.55 } },
  elastic: { p1: { x: 0.175, y: 0.885 }, p2: { x: 0.32, y: 1.275 } },
  back: { p1: { x: 0.68, y: -0.55 }, p2: { x: 0.265, y: 1.55 } }
};

export const BezierEasingEditor: React.FC<BezierEasingEditorProps> = ({
  initialCurve = PRESETS.ease,
  onCurveChange,
  onPreview,
  className = ''
}) => {
  const [curve, setCurve] = useState<BezierCurve>(initialCurve);
  const [isDragging, setIsDragging] = useState<'p1' | 'p2' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const animationRef = useRef<number>();

  const CANVAS_SIZE = 300;
  const PADDING = 40;
  // const GRID_SIZE = 20; // Unused but kept for potential future use

  // Convert curve coordinates to SVG coordinates
  const toSVG = useCallback((point: BezierPoint) => ({
    x: PADDING + point.x * (CANVAS_SIZE - 2 * PADDING),
    y: CANVAS_SIZE - PADDING - point.y * (CANVAS_SIZE - 2 * PADDING)
  }), []);

  // Convert SVG coordinates to curve coordinates
  const fromSVG = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(1, (x - PADDING) / (CANVAS_SIZE - 2 * PADDING))),
    y: Math.max(-0.5, Math.min(1.5, 1 - (y - PADDING) / (CANVAS_SIZE - 2 * PADDING)))
  }), []);

  // Generate SVG path for the Bézier curve
  const generatePath = useCallback((c: BezierCurve) => {
    const start = toSVG({ x: 0, y: 0 });
    const end = toSVG({ x: 1, y: 1 });
    const cp1 = toSVG(c.p1);
    const cp2 = toSVG(c.p2);

    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  }, [toSVG]);

  // Evaluate Bézier curve at parameter t
  const evaluateBezier = useCallback((t: number, c: BezierCurve) => {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    
    return {
      x: mt2 * mt * 0 + 3 * mt2 * t * c.p1.x + 3 * mt * t2 * c.p2.x + t2 * t * 1,
      y: mt2 * mt * 0 + 3 * mt2 * t * c.p1.y + 3 * mt * t2 * c.p2.y + t2 * t * 1
    };
  }, []);

  // Handle mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent, point: 'p1' | 'p2') => {
    e.preventDefault();
    setIsDragging(point);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoint = fromSVG(x, y);

    const newCurve = {
      ...curve,
      [isDragging]: newPoint
    };

    setCurve(newCurve);
    onCurveChange(newCurve);
  }, [isDragging, curve, fromSVG, onCurveChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Preview animation
  const startPreview = useCallback(() => {
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
      setPreviewProgress(0);
      return;
    }

    setIsPlaying(true);
    const startTime = performance.now();
    const duration = 2000; // 2 seconds

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Apply the custom easing
      const easedProgress = evaluateBezier(progress, curve).y;
      setPreviewProgress(progress);
      onPreview?.(easedProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPreviewProgress(0);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isPlaying, curve, evaluateBezier, onPreview]);

  // Load preset
  const loadPreset = useCallback((presetName: string) => {
    const preset = PRESETS[presetName];
    if (preset) {
      setCurve(preset);
      onCurveChange(preset);
    }
  }, [onCurveChange]);

  // Reset to default
  const reset = useCallback(() => {
    loadPreset('ease');
  }, [loadPreset]);

  // Copy CSS cubic-bezier function
  const copyCSSFunction = useCallback(() => {
    const cssFunction = `cubic-bezier(${curve.p1.x.toFixed(3)}, ${curve.p1.y.toFixed(3)}, ${curve.p2.x.toFixed(3)}, ${curve.p2.y.toFixed(3)})`;
    navigator.clipboard.writeText(cssFunction);
  }, [curve]);

  // Generate grid lines
  const gridLines = [];
  for (let i = 0; i <= 10; i++) {
    const x = PADDING + (i / 10) * (CANVAS_SIZE - 2 * PADDING);
    const y = PADDING + (i / 10) * (CANVAS_SIZE - 2 * PADDING);
    
    gridLines.push(
      <line key={`v${i}`} x1={x} y1={PADDING} x2={x} y2={CANVAS_SIZE - PADDING} stroke="#f0f0f0" strokeWidth="1" />,
      <line key={`h${i}`} x1={PADDING} y1={y} x2={CANVAS_SIZE - PADDING} y2={y} stroke="#f0f0f0" strokeWidth="1" />
    );
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const p1SVG = toSVG(curve.p1);
  const p2SVG = toSVG(curve.p2);
  const startSVG = toSVG({ x: 0, y: 0 });
  const endSVG = toSVG({ x: 1, y: 1 });

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Custom Easing Editor</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={startPreview}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isPlaying ? 'Stop Preview' : 'Start Preview'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={copyCSSFunction}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Copy CSS Function"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={reset}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset to Default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Curve Editor */}
        <div className="space-y-4">
          <div className="relative">
            <svg
              ref={svgRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border border-gray-200 rounded-lg bg-white cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid */}
              {gridLines}
              
              {/* Axes */}
              <line x1={PADDING} y1={CANVAS_SIZE - PADDING} x2={CANVAS_SIZE - PADDING} y2={CANVAS_SIZE - PADDING} stroke="#ccc" strokeWidth="2" />
              <line x1={PADDING} y1={CANVAS_SIZE - PADDING} x2={PADDING} y2={PADDING} stroke="#ccc" strokeWidth="2" />
              
              {/* Control lines */}
              <line x1={startSVG.x} y1={startSVG.y} x2={p1SVG.x} y2={p1SVG.y} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" />
              <line x1={endSVG.x} y1={endSVG.y} x2={p2SVG.x} y2={p2SVG.y} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4" />
              
              {/* Bézier curve */}
              <path d={generatePath(curve)} fill="none" stroke="#3b82f6" strokeWidth="3" />
              
              {/* Preview progress indicator */}
              {isPlaying && (
                <circle
                  cx={toSVG(evaluateBezier(previewProgress, curve)).x}
                  cy={toSVG(evaluateBezier(previewProgress, curve)).y}
                  r="6"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                />
              )}
              
              {/* Control points */}
              <circle
                cx={p1SVG.x}
                cy={p1SVG.y}
                r="8"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(e, 'p1')}
              />
              <circle
                cx={p2SVG.x}
                cy={p2SVG.y}
                r="8"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(e, 'p2')}
              />
              
              {/* Start and end points */}
              <circle cx={startSVG.x} cy={startSVG.y} r="4" fill="#6b7280" />
              <circle cx={endSVG.x} cy={endSVG.y} r="4" fill="#6b7280" />
              
              {/* Labels */}
              <text x={startSVG.x - 10} y={startSVG.y + 20} fontSize="12" fill="#6b7280">0,0</text>
              <text x={endSVG.x - 10} y={endSVG.y - 10} fontSize="12" fill="#6b7280">1,1</text>
            </svg>
          </div>

          {/* Coordinate Display */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-700 mb-1">Control Point 1</div>
              <div className="font-mono text-gray-900">
                ({curve.p1.x.toFixed(3)}, {curve.p1.y.toFixed(3)})
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-700 mb-1">Control Point 2</div>
              <div className="font-mono text-gray-900">
                ({curve.p2.x.toFixed(3)}, {curve.p2.y.toFixed(3)})
              </div>
            </div>
          </div>
        </div>

        {/* Controls and Presets */}
        <div className="space-y-6">
          {/* CSS Output */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSS Function</label>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm text-gray-900 break-all">
              cubic-bezier({curve.p1.x.toFixed(3)}, {curve.p1.y.toFixed(3)}, {curve.p2.x.toFixed(3)}, {curve.p2.y.toFixed(3)})
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(PRESETS).map((presetName) => (
                <button
                  key={presetName}
                  onClick={() => loadPreset(presetName)}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors capitalize"
                >
                  {presetName.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Manual Input</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">P1 X</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  value={curve.p1.x.toFixed(3)}
                  onChange={(e) => {
                    const newCurve = {
                      ...curve,
                      p1: { ...curve.p1, x: parseFloat(e.target.value) || 0 }
                    };
                    setCurve(newCurve);
                    onCurveChange(newCurve);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">P1 Y</label>
                <input
                  type="number"
                  min="-0.5"
                  max="1.5"
                  step="0.001"
                  value={curve.p1.y.toFixed(3)}
                  onChange={(e) => {
                    const newCurve = {
                      ...curve,
                      p1: { ...curve.p1, y: parseFloat(e.target.value) || 0 }
                    };
                    setCurve(newCurve);
                    onCurveChange(newCurve);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">P2 X</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.001"
                  value={curve.p2.x.toFixed(3)}
                  onChange={(e) => {
                    const newCurve = {
                      ...curve,
                      p2: { ...curve.p2, x: parseFloat(e.target.value) || 0 }
                    };
                    setCurve(newCurve);
                    onCurveChange(newCurve);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">P2 Y</label>
                <input
                  type="number"
                  min="-0.5"
                  max="1.5"
                  step="0.001"
                  value={curve.p2.y.toFixed(3)}
                  onChange={(e) => {
                    const newCurve = {
                      ...curve,
                      p2: { ...curve.p2, y: parseFloat(e.target.value) || 0 }
                    };
                    setCurve(newCurve);
                    onCurveChange(newCurve);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
            <p className="font-medium text-blue-900 mb-1">How to use:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Drag the blue control points to adjust the curve</li>
              <li>• Click presets for common easing functions</li>
              <li>• Use the play button to preview the animation</li>
              <li>• Copy the CSS function to use in your projects</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
