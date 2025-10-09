import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2, Copy, Settings } from 'lucide-react';

export interface Keyframe {
  id: string;
  time: number; // 0-1 (percentage of total duration)
  value: number; // 0-1 (morph progress)
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom';
  customEasing?: { p1: { x: number; y: number }; p2: { x: number; y: number } };
  label?: string;
}

interface KeyframeTimelineProps {
  duration: number; // Total duration in seconds
  keyframes: Keyframe[];
  currentTime: number; // Current playback time (0-1)
  isPlaying: boolean;
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
  className?: string;
}

export const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  duration,
  keyframes,
  currentTime,
  isPlaying,
  onKeyframesChange,
  onTimeChange,
  onPlayPause,
  onReset,
  className = ''
}) => {
  const [selectedKeyframe, setSelectedKeyframe] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);

  const TIMELINE_HEIGHT = 120;
  const KEYFRAME_SIZE = 12;
  const TICK_HEIGHT = 8;

  // Convert time (0-1) to pixel position
  const timeToPixel = useCallback((time: number) => {
    if (!timelineRef.current) return 0;
    const width = timelineRef.current.clientWidth - 40; // Account for padding
    return 20 + (time * width * zoom) - scrollOffset;
  }, [zoom, scrollOffset]);

  // Convert pixel position to time (0-1)
  const pixelToTime = useCallback((pixel: number) => {
    if (!timelineRef.current) return 0;
    const width = timelineRef.current.clientWidth - 40;
    const adjustedPixel = pixel - 20 + scrollOffset;
    return Math.max(0, Math.min(1, adjustedPixel / (width * zoom)));
  }, [zoom, scrollOffset]);

  // Handle timeline click
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const newTime = pixelToTime(clickX);
    onTimeChange(newTime);
  }, [isDragging, pixelToTime, onTimeChange]);

  // Handle keyframe drag
  const handleKeyframeDrag = useCallback((e: React.MouseEvent, keyframeId: string) => {
    e.stopPropagation();
    setIsDragging(keyframeId);
    setSelectedKeyframe(keyframeId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const newTime = pixelToTime(mouseX);

    const updatedKeyframes = keyframes.map(kf => 
      kf.id === isDragging ? { ...kf, time: newTime } : kf
    );

    onKeyframesChange(updatedKeyframes);
  }, [isDragging, keyframes, pixelToTime, onKeyframesChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Add new keyframe
  const addKeyframe = useCallback((time?: number) => {
    const newTime = time ?? currentTime;
    const newKeyframe: Keyframe = {
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: newTime,
      value: newTime, // Default to linear progression
      easing: 'easeInOut',
      label: `Keyframe ${keyframes.length + 1}`
    };

    const updatedKeyframes = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    onKeyframesChange(updatedKeyframes);
    setSelectedKeyframe(newKeyframe.id);
  }, [currentTime, keyframes, onKeyframesChange]);

  // Delete keyframe
  const deleteKeyframe = useCallback((keyframeId: string) => {
    const updatedKeyframes = keyframes.filter(kf => kf.id !== keyframeId);
    onKeyframesChange(updatedKeyframes);
    if (selectedKeyframe === keyframeId) {
      setSelectedKeyframe(null);
    }
  }, [keyframes, selectedKeyframe, onKeyframesChange]);

  // Duplicate keyframe
  const duplicateKeyframe = useCallback((keyframeId: string) => {
    const keyframe = keyframes.find(kf => kf.id === keyframeId);
    if (!keyframe) return;

    const newKeyframe: Keyframe = {
      ...keyframe,
      id: `keyframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: Math.min(1, keyframe.time + 0.1),
      label: `${keyframe.label} Copy`
    };

    const updatedKeyframes = [...keyframes, newKeyframe].sort((a, b) => a.time - b.time);
    onKeyframesChange(updatedKeyframes);
  }, [keyframes, onKeyframesChange]);

  // Generate time markers
  const generateTimeMarkers = () => {
    const markers = [];
    const step = zoom >= 2 ? 0.1 : zoom >= 1 ? 0.2 : 0.5;
    
    for (let i = 0; i <= 1; i += step) {
      const x = timeToPixel(i);
      const timeInSeconds = i * duration;
      
      markers.push(
        <g key={i}>
          <line
            x1={x}
            y1={TIMELINE_HEIGHT - 20}
            x2={x}
            y2={TIMELINE_HEIGHT - 20 + TICK_HEIGHT}
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <text
            x={x}
            y={TIMELINE_HEIGHT - 5}
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {timeInSeconds.toFixed(1)}s
          </text>
        </g>
      );
    }
    
    return markers;
  };

  // Get selected keyframe
  const selectedKeyframeData = keyframes.find(kf => kf.id === selectedKeyframe);

  // Update selected keyframe
  const updateSelectedKeyframe = (updates: Partial<Keyframe>) => {
    if (!selectedKeyframe) return;
    
    const updatedKeyframes = keyframes.map(kf => 
      kf.id === selectedKeyframe ? { ...kf, ...updates } : kf
    );
    onKeyframesChange(updatedKeyframes);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold text-gray-900">Timeline</h3>
          <div className="text-sm text-gray-500">
            {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Playback Controls */}
          <button
            onClick={onReset}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title="Reset to Start"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={onPlayPause}
            className={`p-2 rounded-lg transition-colors ${
              isPlaying 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => addKeyframe()}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="Add Keyframe"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            title="Timeline Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Settings */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">{zoom.toFixed(1)}x</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <div className="text-sm text-gray-900">{duration.toFixed(1)}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4">
        <div
          ref={timelineRef}
          className="relative bg-gray-50 rounded-lg border border-gray-200 cursor-pointer select-none"
          style={{ height: TIMELINE_HEIGHT }}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg width="100%" height={TIMELINE_HEIGHT} className="absolute inset-0">
            {/* Time markers */}
            {generateTimeMarkers()}
            
            {/* Timeline track */}
            <line
              x1={20}
              y1={TIMELINE_HEIGHT - 20}
              x2="calc(100% - 20px)"
              y2={TIMELINE_HEIGHT - 20}
              stroke="#d1d5db"
              strokeWidth="2"
            />
            
            {/* Current time indicator */}
            <line
              x1={timeToPixel(currentTime)}
              y1={10}
              x2={timeToPixel(currentTime)}
              y2={TIMELINE_HEIGHT - 30}
              stroke="#ef4444"
              strokeWidth="2"
            />
            
            {/* Keyframes */}
            {keyframes.map((keyframe) => {
              const x = timeToPixel(keyframe.time);
              const isSelected = selectedKeyframe === keyframe.id;
              
              return (
                <g key={keyframe.id}>
                  {/* Keyframe marker */}
                  <circle
                    cx={x}
                    cy={TIMELINE_HEIGHT - 20}
                    r={KEYFRAME_SIZE / 2}
                    fill={isSelected ? '#3b82f6' : '#6b7280'}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-move"
                    onMouseDown={(e) => handleKeyframeDrag(e as any, keyframe.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedKeyframe(keyframe.id);
                    }}
                  />
                  
                  {/* Keyframe label */}
                  {keyframe.label && (
                    <text
                      x={x}
                      y={TIMELINE_HEIGHT - 35}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isSelected ? '#3b82f6' : '#6b7280'}
                      className="pointer-events-none"
                    >
                      {keyframe.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Current Time Display */}
        <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
          <span>Current: {(currentTime * duration).toFixed(2)}s</span>
          <span>Total: {duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Keyframe Properties */}
      {selectedKeyframeData && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Keyframe Properties</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => duplicateKeyframe(selectedKeyframeData.id)}
                className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                title="Duplicate"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteKeyframe(selectedKeyframeData.id)}
                className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={selectedKeyframeData.label || ''}
                onChange={(e) => updateSelectedKeyframe({ label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Keyframe label"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={selectedKeyframeData.time.toFixed(3)}
                onChange={(e) => updateSelectedKeyframe({ time: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={selectedKeyframeData.value.toFixed(3)}
                onChange={(e) => updateSelectedKeyframe({ value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Easing</label>
              <select
                value={selectedKeyframeData.easing}
                onChange={(e) => updateSelectedKeyframe({ easing: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In Out</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
