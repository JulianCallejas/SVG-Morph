import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMorphStore } from '../store/morphStore';
import { Point } from '../utils/kdTree';
import { NodeMatcher, MatchingOptions } from '../utils/nodeMatching';
import { Undo2, Redo2, Trash2, Zap, Settings, Eye, EyeOff } from 'lucide-react';

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

  const _handlePairRemove = useCallback((pairId: string) => {
    const pairToRemove = nodePairs.find(p => p.sourceId === pairId);
    if (pairToRemove) {
      removeNodePair(pairId);
      addToHistory({
        type: 'remove',
        pairId,
        pair: pairToRemove,
      });
    }
  }, [nodePairs, removeNodePair, addToHistory]);

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
      return '#fbbf24';
    }
    if (hoveredPoint?.id === point.id) return '#94a3b8';
    return showUnmatched ? '#6b7280' : '#d1d5db';
  }, [nodePairs, selectedSourcePoint, selectedTargetPoint, hoveredPoint, showUnmatched]);

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
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <button
          onClick={handleAutoMatch}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          <Zap size={16} />
          Auto Match
        </button>
        
        <button
          onClick={handleUndo}
          disabled={historyIndex < 0}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          <Undo2 size={16} />
          Undo
        </button>
        
        <button
          onClick={handleRedo}
          disabled={historyIndex >= actionHistory.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          <Redo2 size={16} />
          Redo
        </button>
        
        <button
          onClick={handleClearAll}
          disabled={nodePairs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          <Trash2 size={16} />
          Clear All
        </button>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setShowConnections(!showConnections)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              showConnections 
                ? 'bg-accent text-white hover:bg-accent/90' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            Connections
          </button>
          <button
            onClick={() => setShowUnmatched(!showUnmatched)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              showUnmatched 
                ? 'bg-accent text-white hover:bg-accent/90' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {showUnmatched ? <Eye size={16} /> : <EyeOff size={16} />}
            Unmatched
          </button>
          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400 font-medium">
            {nodePairs.length} pairs • {sourcePoints.length - nodePairs.length} unmatched source • {targetPoints.length - nodePairs.length} unmatched target
          </div>
        </div>
      </div>

      {/* Matching Options */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
            <Settings size={16} className="text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Matching Options</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Distance Metric
            </label>
            <select
              value={matchingOptions.distanceMetric}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                distanceMetric: e.target.value as 'euclidean' | 'manhattan'
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
            >
              <option value="euclidean">Euclidean</option>
              <option value="manhattan">Manhattan</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Distance
            </label>
            <input
              type="number"
              value={matchingOptions.maxDistance}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                maxDistance: Number(e.target.value)
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              min="1"
              max="500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confidence Threshold
            </label>
            <input
              type="number"
              value={matchingOptions.confidenceThreshold}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                confidenceThreshold: Number(e.target.value)
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-md bg-white dark:bg-gray-800">
        <div className="relative">
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            viewBox="0 0 600 400"
            className="bg-gray-50 dark:bg-gray-900"
          >
            {/* Background SVG Images */}
            {sourceSVG && (
              <g transform="translate(20, 30) scale(0.8)">
                <foreignObject x="0" y="0" width="260" height="340">
                  <div 
                    className="w-full h-full flex items-center justify-center opacity-30"
                    dangerouslySetInnerHTML={{ __html: sourceSVG }}
                  />
                </foreignObject>
              </g>
            )}
            
            {targetSVG && (
              <g transform="translate(320, 30) scale(0.8)">
                <foreignObject x="0" y="0" width="260" height="340">
                  <div 
                    className="w-full h-full flex items-center justify-center opacity-30"
                    dangerouslySetInnerHTML={{ __html: targetSVG }}
                  />
                </foreignObject>
              </g>
            )}
            
            {/* Connection lines */}
            {renderConnectionLines()}
            
            {/* Source points */}
            <g>
              <text x="150" y="20" textAnchor="middle" className="text-sm font-semibold fill-gray-800 dark:fill-gray-200">
                Source SVG ({sourcePoints.length} points)
              </text>
              {sourcePoints.map(point => (
                <circle
                  key={`source-${point.id}`}
                  cx={point.x}
                  cy={point.y + 30}
                  r={getPointRadius(point, true)}
                  fill={getPointColor(point, true)}
                  stroke="#fff"
                  strokeWidth="2"
                  className="cursor-pointer hover:stroke-gray-400 transition-all"
                  onClick={() => handlePointClick(point, true)}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
            
            {/* Target points */}
            <g>
              <text x="450" y="20" textAnchor="middle" className="text-sm font-semibold fill-gray-800 dark:fill-gray-200">
                Target SVG ({targetPoints.length} points)
              </text>
              {targetPoints.map(point => (
                <circle
                  key={`target-${point.id}`}
                  cx={point.x + 300}
                  cy={point.y + 30}
                  r={getPointRadius(point, false)}
                  fill={getPointColor(point, false)}
                  stroke="#fff"
                  strokeWidth="2"
                  className="cursor-pointer hover:stroke-gray-400 transition-all"
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
                stroke="#fbbf24"
                strokeWidth="3"
                strokeDasharray="4,4"
                className="animate-pulse"
              />
            )}
            
            {selectedTargetPoint && (
              <circle
                cx={selectedTargetPoint.x + 300}
                cy={selectedTargetPoint.y + 30}
                r="12"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="3"
                strokeDasharray="4,4"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-6 bg-accent/5 border border-accent/20 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">i</span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Instructions</h4>
        </div>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            <span>Click on a source point (left) and then a target point (right) to create a pair</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            <span>Use "Auto Match" to automatically pair points using k-NN algorithm</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            <span>Adjust matching options to fine-tune automatic pairing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            <span>Use Undo/Redo to manage your pairing history</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent font-bold">•</span>
            <span>Toggle visibility of connections and unmatched points</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
