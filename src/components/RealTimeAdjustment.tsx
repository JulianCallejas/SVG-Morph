import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, RotateCcw, Lock, Unlock, Eye, EyeOff, Zap } from 'lucide-react';
import { AnimationSettings } from '../store/morphStore';

interface Parameter {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  category: 'timing' | 'easing' | 'visual' | 'advanced';
  description: string;
  locked?: boolean;
}

interface RealTimeAdjustmentProps {
  settings: AnimationSettings;
  onSettingsChange: (settings: Partial<AnimationSettings>) => void;
  onParameterChange?: (parameterId: string, value: number) => void;
  isPlaying: boolean;
  currentProgress: number;
  className?: string;
}

export const RealTimeAdjustment: React.FC<RealTimeAdjustmentProps> = ({
  settings,
  onSettingsChange,
  onParameterChange,
  isPlaying,
  currentProgress,
  className = ''
}) => {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [presetValues, setPresetValues] = useState<{ [key: string]: number }>({});

  // Initialize parameters based on current settings
  useEffect(() => {
    const initialParameters: Parameter[] = [
      // Timing Parameters
      {
        id: 'duration',
        name: 'Duration',
        value: settings.duration,
        min: 0.1,
        max: 10,
        step: 0.1,
        unit: 's',
        category: 'timing',
        description: 'Total animation duration'
      },
      {
        id: 'playbackSpeed',
        name: 'Playback Speed',
        value: 1,
        min: 0.1,
        max: 3,
        step: 0.1,
        unit: 'x',
        category: 'timing',
        description: 'Animation playback speed multiplier'
      },

      // Visual Parameters
      {
        id: 'morphIntensity',
        name: 'Morph Intensity',
        value: 1,
        min: 0,
        max: 2,
        step: 0.05,
        category: 'visual',
        description: 'Intensity of the morphing effect'
      },
      {
        id: 'colorBlending',
        name: 'Color Blending',
        value: settings.colorInterpolation ? 1 : 0,
        min: 0,
        max: 1,
        step: 0.01,
        category: 'visual',
        description: 'Amount of color interpolation'
      },
      {
        id: 'strokeBlending',
        name: 'Stroke Blending',
        value: settings.strokeWidthInterpolation ? 1 : 0,
        min: 0,
        max: 1,
        step: 0.01,
        category: 'visual',
        description: 'Amount of stroke width interpolation'
      },

      // Advanced Parameters
      {
        id: 'easingStrength',
        name: 'Easing Strength',
        value: 1,
        min: 0.1,
        max: 2,
        step: 0.05,
        category: 'advanced',
        description: 'Strength of the easing curve'
      },
      {
        id: 'nodeMatchingTolerance',
        name: 'Node Tolerance',
        value: 0.5,
        min: 0.1,
        max: 1,
        step: 0.05,
        category: 'advanced',
        description: 'Tolerance for automatic node matching'
      },
      {
        id: 'pathSmoothing',
        name: 'Path Smoothing',
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
        category: 'advanced',
        description: 'Amount of path smoothing applied'
      }
    ];

    setParameters(initialParameters);
    
    // Store initial values as presets
    const initialPresets: { [key: string]: number } = {};
    initialParameters.forEach(param => {
      initialPresets[param.id] = param.value;
    });
    setPresetValues(initialPresets);
  }, [settings]);

  // Handle parameter change
  const handleParameterChange = useCallback((parameterId: string, value: number) => {
    setParameters(prev => prev.map(param => 
      param.id === parameterId ? { ...param, value } : param
    ));

    // Apply changes to settings
    switch (parameterId) {
      case 'duration':
        onSettingsChange({ duration: value });
        break;
      case 'colorBlending':
        onSettingsChange({ colorInterpolation: value > 0.5 });
        break;
      case 'strokeBlending':
        onSettingsChange({ strokeWidthInterpolation: value > 0.5 });
        break;
    }

    // Notify parent component
    onParameterChange?.(parameterId, value);
  }, [onSettingsChange, onParameterChange]);

  // Reset parameter to preset value
  const resetParameter = useCallback((parameterId: string) => {
    const presetValue = presetValues[parameterId];
    if (presetValue !== undefined) {
      handleParameterChange(parameterId, presetValue);
    }
  }, [presetValues, handleParameterChange]);

  // Reset all parameters
  const resetAllParameters = useCallback(() => {
    Object.entries(presetValues).forEach(([id, value]) => {
      handleParameterChange(id, value);
    });
  }, [presetValues, handleParameterChange]);

  // Toggle parameter lock
  const toggleParameterLock = useCallback((parameterId: string) => {
    setParameters(prev => prev.map(param => 
      param.id === parameterId ? { ...param, locked: !param.locked } : param
    ));
  }, []);

  // Filter parameters by category
  const filteredParameters = parameters.filter(param => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'advanced' && !showAdvanced) return false;
    return param.category === selectedCategory;
  });

  const categories = [
    { id: 'all', name: 'All', count: parameters.length },
    { id: 'timing', name: 'Timing', count: parameters.filter(p => p.category === 'timing').length },
    { id: 'visual', name: 'Visual', count: parameters.filter(p => p.category === 'visual').length },
    { id: 'advanced', name: 'Advanced', count: parameters.filter(p => p.category === 'advanced').length }
  ];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Sliders className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Real-time Adjustment</h3>
          {isPlaying && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-lg transition-colors ${
              showAdvanced 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          >
            {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          
          <button
            onClick={resetAllParameters}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Reset All Parameters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {filteredParameters.map(parameter => (
          <ParameterControl
            key={parameter.id}
            parameter={parameter}
            onChange={(value) => handleParameterChange(parameter.id, value)}
            onReset={() => resetParameter(parameter.id)}
            onToggleLock={() => toggleParameterLock(parameter.id)}
            isPlaying={isPlaying}
            hasChanged={parameter.value !== presetValues[parameter.id]}
          />
        ))}
        
        {filteredParameters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Sliders className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No parameters available for this category.</p>
          </div>
        )}
      </div>

      {/* Live Preview Info */}
      {isPlaying && (
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="flex items-center space-x-2 text-sm text-green-800">
            <Zap className="w-4 h-4" />
            <span>
              Changes are applied in real-time during playback. 
              Progress: {Math.round(currentProgress * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual parameter control component
const ParameterControl: React.FC<{
  parameter: Parameter;
  onChange: (value: number) => void;
  onReset: () => void;
  onToggleLock: () => void;
  isPlaying: boolean;
  hasChanged: boolean;
}> = ({ parameter, onChange, onReset, onToggleLock, isPlaying, hasChanged }) => {
  const [inputValue, setInputValue] = useState(parameter.value.toString());

  useEffect(() => {
    setInputValue(parameter.value.toString());
  }, [parameter.value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onChange(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value)) {
      const clampedValue = Math.max(parameter.min, Math.min(parameter.max, value));
      onChange(clampedValue);
      setInputValue(clampedValue.toString());
    } else {
      setInputValue(parameter.value.toString());
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'timing': return 'text-blue-600';
      case 'visual': return 'text-green-600';
      case 'easing': return 'text-purple-600';
      case 'advanced': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      parameter.locked 
        ? 'border-gray-300 bg-gray-50 opacity-75' 
        : hasChanged 
          ? 'border-blue-200 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900">{parameter.name}</h4>
          <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getCategoryColor(parameter.category)}`}>
            {parameter.category}
          </span>
          {hasChanged && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Modified" />
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleLock}
            className={`p-1 rounded transition-colors ${
              parameter.locked 
                ? 'text-red-600 hover:text-red-700' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title={parameter.locked ? 'Unlock Parameter' : 'Lock Parameter'}
          >
            {parameter.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onReset}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset to Default"
            disabled={parameter.locked}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3">{parameter.description}</p>

      {/* Controls */}
      <div className="space-y-3">
        {/* Slider */}
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={parameter.value}
            onChange={handleSliderChange}
            disabled={parameter.locked}
            className={`flex-1 ${
              parameter.locked 
                ? 'opacity-50 cursor-not-allowed' 
                : isPlaying 
                  ? 'accent-green-500' 
                  : 'accent-blue-500'
            }`}
          />
          
          {/* Value Input */}
          <div className="flex items-center space-x-1">
            <input
              type="number"
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              disabled={parameter.locked}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {parameter.unit && (
              <span className="text-sm text-gray-500">{parameter.unit}</span>
            )}
          </div>
        </div>

        {/* Range Display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{parameter.min}{parameter.unit}</span>
          <span>{parameter.max}{parameter.unit}</span>
        </div>
      </div>
    </div>
  );
};
