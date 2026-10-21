import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMorphStore } from '../store/morphStore';
import { Point } from '../utils/kdTree';
import { NodeMatcher, MatchingOptions } from '../utils/nodeMatching';
import { Undo2, Redo2, Trash2, Zap, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/Button';
import { Field, Select } from './ui/Fields';
import { sanitizeSVG } from '../utils/sanitizeSVG';

interface NodePairingInterfaceProps {
  sourcePoints: Point[];
  targetPoints: Point[];
  onPointsUpdate?: (sourcePoints: Point[], targetPoints: Point[]) => void;
}

interface PairAction {
  type: 'add' | 'remove' | 'clear';
  pairId?: string;
  pair?: {
    sourceId: string;
    targetId: string;
    color: string;
  };
  previousPairs?: Array<{
    sourceId: string;
    targetId: string;
    color: string;
  }>;
}

const PAIR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
];

export const NodePairingInterface: React.FC<NodePairingInterfaceProps> = ({
  sourcePoints,
  targetPoints,
}) => {
  // Add CSS animation for shining effect
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shine-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      .unmatched-shine {
        animation: shine-pulse 2s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .unmatched-shine { animation: none; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const { 
    nodePairs, 
    addNodePair, 
    removeNodePair, 
    clearNodePairs,
    sourceSVG,
    targetSVG 
  } = useMorphStore();
  const [selectedSourcePoint, setSelectedSourcePoint] = useState<Point | null>(null);
  const [selectedTargetPoint, setSelectedTargetPoint] = useState<Point | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showUnmatched, setShowUnmatched] = useState(true);
  const [actionHistory, setActionHistory] = useState<PairAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [matchingOptions, setMatchingOptions] = useState<Partial<MatchingOptions>>({
    distanceMetric: 'euclidean',
    maxDistance: 100,
    confidenceThreshold: 0.3,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const matcher = useRef(new NodeMatcher(matchingOptions));

  // Update matcher when options change
  useEffect(() => {
    matcher.current = new NodeMatcher(matchingOptions);
  }, [matchingOptions]);

  const addToHistory = useCallback((action: PairAction) => {
    const newHistory = actionHistory.slice(0, historyIndex + 1);
    newHistory.push(action);
    setActionHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [actionHistory, historyIndex]);

  const handlePointClick = useCallback((point: Point, isSource: boolean) => {
    if (isSource) {
      if (selectedSourcePoint?.id === point.id) {
        setSelectedSourcePoint(null);
      } else {
        setSelectedSourcePoint(point);
        if (selectedTargetPoint) {
          // Create pair
          const color = PAIR_COLORS[nodePairs.length % PAIR_COLORS.length];
          const newPair = {
            sourceId: point.id!,
            targetId: selectedTargetPoint.id!,
            color,
          };
          
          addNodePair(newPair);
          addToHistory({
            type: 'add',
            pairId: point.id!,
            pair: newPair,
          });
          
          setSelectedSourcePoint(null);
          setSelectedTargetPoint(null);
        }
      }
    } else {
      if (selectedTargetPoint?.id === point.id) {
        setSelectedTargetPoint(null);
      } else {
        setSelectedTargetPoint(point);
        if (selectedSourcePoint) {
          // Create pair
          const color = PAIR_COLORS[nodePairs.length % PAIR_COLORS.length];
          const newPair = {
            sourceId: selectedSourcePoint.id!,
            targetId: point.id!,
            color,
          };
          
          addNodePair(newPair);
          addToHistory({
            type: 'add',
            pairId: selectedSourcePoint.id!,
            pair: newPair,
          });
          
          setSelectedSourcePoint(null);
          setSelectedTargetPoint(null);
        }
      }
    }
  }, [selectedSourcePoint, selectedTargetPoint, nodePairs.length, addNodePair, addToHistory]);


  const handleClearAll = useCallback(() => {
    if (nodePairs.length > 0) {
      addToHistory({
        type: 'clear',
        previousPairs: [...nodePairs],
      });
      clearNodePairs();
    }
  }, [nodePairs, clearNodePairs, addToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      const action = actionHistory[historyIndex];
      
      switch (action.type) {
        case 'add':
          if (action.pairId) {
            removeNodePair(action.pairId);
          }
          break;
        case 'remove':
          if (action.pair) {
            addNodePair(action.pair);
          }
          break;
        case 'clear':
          if (action.previousPairs) {
            action.previousPairs.forEach(pair => addNodePair(pair));
          }
          break;
      }
      
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, actionHistory, removeNodePair, addNodePair]);

  const handleRedo = useCallback(() => {
    if (historyIndex < actionHistory.length - 1) {
      const action = actionHistory[historyIndex + 1];
      
      switch (action.type) {
        case 'add':
          if (action.pair) {
            addNodePair(action.pair);
          }
          break;
        case 'remove':
          if (action.pairId) {
            removeNodePair(action.pairId);
          }
          break;
        case 'clear':
          clearNodePairs();
          break;
      }
      
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, actionHistory, addNodePair, removeNodePair, clearNodePairs]);

  const handleAutoMatch = useCallback(() => {
    const result = matcher.current.autoMatchNodes(sourcePoints, targetPoints);
    
    // Clear existing pairs
    if (nodePairs.length > 0) {
      addToHistory({
        type: 'clear',
        previousPairs: [...nodePairs],
      });
      clearNodePairs();
    }

    // Add new matches
    result.matches.forEach((match, index) => {
      const color = PAIR_COLORS[index % PAIR_COLORS.length];
      const pair = {
        sourceId: match.sourcePoint.id!,
        targetId: match.targetPoint.id!,
        color,
      };
      addNodePair(pair);
    });
  }, [sourcePoints, targetPoints, nodePairs, addToHistory, clearNodePairs, addNodePair]);

  const getPointColor = useCallback((point: Point, isSource: boolean) => {
    const pair = nodePairs.find(p => 
      isSource ? p.sourceId === point.id : p.targetId === point.id
    );
    
    if (pair) return pair.color;
    if (selectedSourcePoint?.id === point.id || selectedTargetPoint?.id === point.id) {
      return 'rgb(var(--color-action))';
    }
    if (hoveredPoint?.id === point.id) return 'rgb(var(--color-content))';
    return showUnmatched ? 'rgb(var(--color-muted))' : 'rgb(var(--color-raised))';
  }, [nodePairs, selectedSourcePoint, selectedTargetPoint, hoveredPoint, showUnmatched]);

  const isUnmatchedPoint = useCallback((point: Point, isSource: boolean) => {
    const pair = nodePairs.find(p => 
      isSource ? p.sourceId === point.id : p.targetId === point.id
    );
    return !pair && showUnmatched;
  }, [nodePairs, showUnmatched]);

  const getPointRadius = useCallback((point: Point, isSource: boolean) => {
    const pair = nodePairs.find(p => 
      isSource ? p.sourceId === point.id : p.targetId === point.id
    );
    
    if (pair) return 6;
    if (selectedSourcePoint?.id === point.id || selectedTargetPoint?.id === point.id) {
      return 8;
    }
    if (hoveredPoint?.id === point.id) return 7;
    return 5;
  }, [nodePairs, selectedSourcePoint, selectedTargetPoint, hoveredPoint]);

  const renderConnectionLines = () => {
    if (!showConnections) return null;

    return nodePairs.map(pair => {
      const sourcePoint = sourcePoints.find(p => p.id === pair.sourceId);
      const targetPoint = targetPoints.find(p => p.id === pair.targetId);
      
      if (!sourcePoint || !targetPoint) return null;

      return (
        <line
          key={`${pair.sourceId}-${pair.targetId}`}
          x1={sourcePoint.x}
          y1={sourcePoint.y + 30}
          x2={targetPoint.x + 300} // Offset for target SVG
          y2={targetPoint.y + 30}
          stroke={pair.color}
          strokeWidth="2"
          strokeDasharray="5,5"
          opacity="0.7"
        />
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 bg-surface p-4">
        <Button variant="primary" onClick={handleAutoMatch}>
          <Zap size={16} />
          Auto Match
        </Button>

        <Button onClick={handleUndo} disabled={historyIndex < 0}>
          <Undo2 size={16} />
          Undo
        </Button>

        <Button onClick={handleRedo} disabled={historyIndex >= actionHistory.length - 1}>
          <Redo2 size={16} />
          Redo
        </Button>

        <Button onClick={handleClearAll} disabled={nodePairs.length === 0}>
          <Trash2 size={16} />
          Clear All
        </Button>

        <div className="flex flex-wrap items-center gap-2 sm:ml-4">
          <Button
            variant={showConnections ? 'primary' : 'secondary'}
            aria-pressed={showConnections}
            onClick={() => setShowConnections(!showConnections)}
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            Connections
          </Button>
          <Button
            variant={showUnmatched ? 'primary' : 'secondary'}
            aria-pressed={showUnmatched}
            onClick={() => setShowUnmatched(!showUnmatched)}
          >
            {showUnmatched ? <Eye size={16} /> : <EyeOff size={16} />}
            Unmatched
          </Button>
          <div className="text-sm font-medium text-muted sm:ml-auto">
            {nodePairs.length} pairs • {sourcePoints.length - nodePairs.length} unmatched source • {targetPoints.length - nodePairs.length} unmatched target
          </div>
        </div>
      </div>

      {/* Matching Options */}
      <div className="bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Settings size={20} className="text-link" aria-hidden="true" />
          <span className="text-lg font-medium">Matching Options</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Distance Metric">
            <Select
              value={matchingOptions.distanceMetric}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                distanceMetric: e.target.value as 'euclidean' | 'manhattan'
              }))}
            >
              <option value="euclidean">Euclidean</option>
              <option value="manhattan">Manhattan</option>
            </Select>
          </Field>

          <Field label="Max Distance">
            <input
              type="number"
              value={matchingOptions.maxDistance}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                maxDistance: Number(e.target.value)
              }))}
              className="h-11 w-full bg-raised px-3 text-content"
              min="1"
              max="500"
            />
          </Field>

          <Field label="Confidence Threshold">
            <input
              type="number"
              value={matchingOptions.confidenceThreshold}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                confidenceThreshold: Number(e.target.value)
              }))}
              className="h-11 w-full bg-raised px-3 text-content"
              min="0"
              max="1"
              step="0.1"
            />
          </Field>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="overflow-hidden bg-surface">
        <div className="relative">
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            viewBox="0 0 600 400"
            className="bg-canvas"
          >
            {/* Background SVG Images */}
            {sourceSVG && (
              <g transform="translate(20, 30) scale(0.8)">
                <foreignObject x="0" y="0" width="260" height="340">
                  <div 
                    className="w-full h-full flex items-center justify-center opacity-30"
                    dangerouslySetInnerHTML={{ __html: sanitizeSVG(sourceSVG) }}
                  />
                </foreignObject>
              </g>
            )}
            
            {targetSVG && (
              <g transform="translate(320, 30) scale(0.8)">
                <foreignObject x="0" y="0" width="260" height="340">
                  <div 
                    className="w-full h-full flex items-center justify-center opacity-30"
                    dangerouslySetInnerHTML={{ __html: sanitizeSVG(targetSVG) }}
                  />
                </foreignObject>
              </g>
            )}
            
            {/* Connection lines */}
            {renderConnectionLines()}
            
            {/* Source points */}
            <g>
              <text x="150" y="20" textAnchor="middle" className="text-sm font-semibold fill-content">
                Source SVG ({sourcePoints.length} points)
              </text>
              {sourcePoints.map(point => (
                <circle
                  key={`source-${point.id}`}
                  cx={point.x}
                  cy={point.y + 30}
                  r={getPointRadius(point, true)}
                  fill={getPointColor(point, true)}
                  stroke="rgb(var(--color-canvas))"
                  strokeWidth="2"
                  className={`cursor-pointer hover:stroke-content transition-all ${
                    isUnmatchedPoint(point, true) ? 'unmatched-shine' : ''
                  }`}
                  onClick={() => handlePointClick(point, true)}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
            
            {/* Target points */}
            <g>
              <text x="450" y="20" textAnchor="middle" className="text-sm font-semibold fill-content">
                Target SVG ({targetPoints.length} points)
              </text>
              {targetPoints.map(point => (
                <circle
                  key={`target-${point.id}`}
                  cx={point.x + 300}
                  cy={point.y + 30}
                  r={getPointRadius(point, false)}
                  fill={getPointColor(point, false)}
                  stroke="rgb(var(--color-canvas))"
                  strokeWidth="2"
                  className={`cursor-pointer hover:stroke-content transition-all ${
                    isUnmatchedPoint(point, false) ? 'unmatched-shine' : ''
                  }`}
                  onClick={() => handlePointClick(point, false)}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
            
            {/* Selection indicators */}
            {selectedSourcePoint && (
              <circle
                cx={selectedSourcePoint.x}
                cy={selectedSourcePoint.y + 30}
                r="12"
                fill="none"
                stroke="rgb(var(--color-action))"
                strokeWidth="3"
                strokeDasharray="4,4"
                className="animate-pulse motion-reduce:animate-none"
              />
            )}
            
            {selectedTargetPoint && (
              <circle
                cx={selectedTargetPoint.x + 300}
                cy={selectedTargetPoint.y + 30}
                r="12"
                fill="none"
                stroke="rgb(var(--color-action))"
                strokeWidth="3"
                strokeDasharray="4,4"
                className="animate-pulse motion-reduce:animate-none"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-surface p-5 sm:p-6">
        <h4 className="mb-3 text-lg font-medium">Instructions</h4>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-link font-bold">•</span>
            <span>Click on a source point (left) and then a target point (right) to create a pair</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-link font-bold">•</span>
            <span>Use "Auto Match" to automatically pair points using k-NN algorithm</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-link font-bold">•</span>
            <span>Adjust matching options to fine-tune automatic pairing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-link font-bold">•</span>
            <span>Use Undo/Redo to manage your pairing history</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-link font-bold">•</span>
            <span>Toggle visibility of connections and unmatched points</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
