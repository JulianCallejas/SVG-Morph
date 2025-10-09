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
  onPointsUpdate,
}) => {
  const { nodePairs, addNodePair, removeNodePair, clearNodePairs } = useMorphStore();
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

  const handlePairRemove = useCallback((pairId: string) => {
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
          y1={sourcePoint.y}
          x2={targetPoint.x + 300} // Offset for target SVG
          y2={targetPoint.y}
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
      <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
        <button
          onClick={handleAutoMatch}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Zap size={16} />
          Auto Match
        </button>
        
        <button
          onClick={handleUndo}
          disabled={historyIndex < 0}
          className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={16} />
          Undo
        </button>
        
        <button
          onClick={handleRedo}
          disabled={historyIndex >= actionHistory.length - 1}
          className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 size={16} />
          Redo
        </button>
        
        <button
          onClick={handleClearAll}
          disabled={nodePairs.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 size={16} />
          Clear All
        </button>

        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setShowConnections(!showConnections)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              showConnections 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {showConnections ? <Eye size={16} /> : <EyeOff size={16} />}
            Connections
          </button>
          
          <button
            onClick={() => setShowUnmatched(!showUnmatched)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              showUnmatched 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {showUnmatched ? <Eye size={16} /> : <EyeOff size={16} />}
            Unmatched
          </button>
        </div>

        <div className="ml-auto text-sm text-gray-600">
          {nodePairs.length} pairs • {sourcePoints.length - nodePairs.length} unmatched source • {targetPoints.length - nodePairs.length} unmatched target
        </div>
      </div>

      {/* Matching Options */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={16} />
          <span className="font-medium">Matching Options</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distance Metric
            </label>
            <select
              value={matchingOptions.distanceMetric}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                distanceMetric: e.target.value as 'euclidean' | 'manhattan'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="euclidean">Euclidean</option>
              <option value="manhattan">Manhattan</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Distance
            </label>
            <input
              type="number"
              value={matchingOptions.maxDistance}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                maxDistance: Number(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence Threshold
            </label>
            <input
              type="number"
              value={matchingOptions.confidenceThreshold}
              onChange={(e) => setMatchingOptions(prev => ({
                ...prev,
                confidenceThreshold: Number(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="1"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* SVG Visualization */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="400"
          viewBox="0 0 600 400"
          className="bg-white"
        >
          {/* Connection lines */}
          {renderConnectionLines()}
          
          {/* Source points */}
          <g>
            <text x="150" y="20" textAnchor="middle" className="text-sm font-medium fill-gray-700">
              Source SVG
            </text>
            {sourcePoints.map(point => (
              <circle
                key={`source-${point.id}`}
                cx={point.x}
                cy={point.y}
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
            <text x="450" y="20" textAnchor="middle" className="text-sm font-medium fill-gray-700">
              Target SVG
            </text>
            {targetPoints.map(point => (
              <circle
                key={`target-${point.id}`}
                cx={point.x + 300}
                cy={point.y}
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
              cy={selectedSourcePoint.y}
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
              cy={selectedTargetPoint.y}
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

      {/* Instructions */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on a source point (left) and then a target point (right) to create a pair</li>
          <li>• Use "Auto Match" to automatically pair points using k-NN algorithm</li>
          <li>• Adjust matching options to fine-tune automatic pairing</li>
          <li>• Use Undo/Redo to manage your pairing history</li>
          <li>• Toggle visibility of connections and unmatched points</li>
        </ul>
      </div>
    </div>
  );
};
