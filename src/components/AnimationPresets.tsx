import React, { useState } from 'react';
import { Play, Heart, Zap, RotateCcw, Waves, TrendingUp, Sparkles, Eye } from 'lucide-react';
import { AnimationSettings } from '../store/morphStore';
import { BezierCurve } from './BezierEasingEditor';

export interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'creative' | 'professional';
  icon: React.ReactNode;
  settings: AnimationSettings;
  customEasing?: BezierCurve;
  preview?: string; // SVG or description for preview
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // Override duration if needed
}

const ANIMATION_PRESETS: AnimationPreset[] = [
  // Basic Presets
  {
    id: 'smooth-morph',
    name: 'Smooth Morph',
    description: 'A gentle, smooth transition perfect for most use cases',
    category: 'basic',
    icon: <Waves className="w-5 h-5" />,
    settings: {
      duration: 2,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    tags: ['smooth', 'gentle', 'basic'],
    difficulty: 'beginner'
  },
  {
    id: 'quick-snap',
    name: 'Quick Snap',
    description: 'Fast, snappy transition for dynamic interfaces',
    category: 'basic',
    icon: <Zap className="w-5 h-5" />,
    settings: {
      duration: 0.8,
      easing: 'easeOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    tags: ['fast', 'snappy', 'dynamic'],
    difficulty: 'beginner'
  },
  {
    id: 'gentle-fade',
    name: 'Gentle Fade',
    description: 'Slow, elegant transition for sophisticated designs',
    category: 'basic',
    icon: <Eye className="w-5 h-5" />,
    settings: {
      duration: 3.5,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: false,
      loop: false,
      reverse: false
    },
    tags: ['slow', 'elegant', 'fade'],
    difficulty: 'beginner'
  },

  // Advanced Presets
  {
    id: 'bounce-morph',
    name: 'Bounce Morph',
    description: 'Playful bouncing effect that adds character',
    category: 'advanced',
    icon: <TrendingUp className="w-5 h-5" />,
    settings: {
      duration: 2.5,
      easing: 'bounce',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    tags: ['bounce', 'playful', 'character'],
    difficulty: 'intermediate'
  },
  {
    id: 'elastic-stretch',
    name: 'Elastic Stretch',
    description: 'Elastic effect that stretches and contracts',
    category: 'advanced',
    icon: <RotateCcw className="w-5 h-5" />,
    settings: {
      duration: 3,
      easing: 'elastic',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    tags: ['elastic', 'stretch', 'organic'],
    difficulty: 'intermediate'
  },
  {
    id: 'loop-cycle',
    name: 'Loop Cycle',
    description: 'Continuous looping animation for backgrounds',
    category: 'advanced',
    icon: <RotateCcw className="w-5 h-5" />,
    settings: {
      duration: 4,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: true,
      reverse: true
    },
    tags: ['loop', 'continuous', 'background'],
    difficulty: 'intermediate'
  },

  // Creative Presets
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    description: 'Rhythmic pulsing effect like a heartbeat',
    category: 'creative',
    icon: <Heart className="w-5 h-5" />,
    settings: {
      duration: 1.2,
      easing: 'easeInOut',
      colorInterpolation: false,
      strokeWidthInterpolation: true,
      loop: true,
      reverse: true
    },
    customEasing: { p1: { x: 0.25, y: 0.46 }, p2: { x: 0.45, y: 0.94 } },
    tags: ['heartbeat', 'pulse', 'rhythmic'],
    difficulty: 'advanced'
  },
  {
    id: 'sparkle-morph',
    name: 'Sparkle Morph',
    description: 'Magical sparkling transition effect',
    category: 'creative',
    icon: <Sparkles className="w-5 h-5" />,
    settings: {
      duration: 2.8,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    customEasing: { p1: { x: 0.68, y: -0.55 }, p2: { x: 0.265, y: 1.55 } },
    tags: ['sparkle', 'magical', 'creative'],
    difficulty: 'advanced'
  },
  {
    id: 'wave-flow',
    name: 'Wave Flow',
    description: 'Flowing wave-like motion for organic shapes',
    category: 'creative',
    icon: <Waves className="w-5 h-5" />,
    settings: {
      duration: 3.5,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    customEasing: { p1: { x: 0.4, y: 0.0 }, p2: { x: 0.6, y: 1.0 } },
    tags: ['wave', 'flow', 'organic'],
    difficulty: 'intermediate'
  },

  // Professional Presets
  {
    id: 'corporate-smooth',
    name: 'Corporate Smooth',
    description: 'Professional, polished transition for business use',
    category: 'professional',
    icon: <TrendingUp className="w-5 h-5" />,
    settings: {
      duration: 2.2,
      easing: 'easeInOut',
      colorInterpolation: true,
      strokeWidthInterpolation: true,
      loop: false,
      reverse: false
    },
    customEasing: { p1: { x: 0.4, y: 0.0 }, p2: { x: 0.2, y: 1.0 } },
    tags: ['corporate', 'professional', 'polished'],
    difficulty: 'beginner'
  },
  {
    id: 'presentation-reveal',
    name: 'Presentation Reveal',
    description: 'Dramatic reveal effect perfect for presentations',
    category: 'professional',
    icon: <Eye className="w-5 h-5" />,
    settings: {
      duration: 1.8,
      easing: 'easeOut',
      colorInterpolation: true,
      strokeWidthInterpolation: false,
      loop: false,
      reverse: false
    },
    customEasing: { p1: { x: 0.25, y: 0.46 }, p2: { x: 0.45, y: 0.94 } },
    tags: ['presentation', 'reveal', 'dramatic'],
    difficulty: 'intermediate'
  }
];

interface AnimationPresetsProps {
  onPresetSelect: (preset: AnimationPreset) => void;
  onPreview?: (preset: AnimationPreset) => void;
  currentSettings?: AnimationSettings;
  className?: string;
}

export const AnimationPresets: React.FC<AnimationPresetsProps> = ({
  onPresetSelect,
  onPreview,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Presets', count: ANIMATION_PRESETS.length },
    { id: 'basic', name: 'Basic', count: ANIMATION_PRESETS.filter(p => p.category === 'basic').length },
    { id: 'advanced', name: 'Advanced', count: ANIMATION_PRESETS.filter(p => p.category === 'advanced').length },
    { id: 'creative', name: 'Creative', count: ANIMATION_PRESETS.filter(p => p.category === 'creative').length },
    { id: 'professional', name: 'Professional', count: ANIMATION_PRESETS.filter(p => p.category === 'professional').length }
  ];

  const filteredPresets = ANIMATION_PRESETS.filter(preset => {
    const matchesCategory = selectedCategory === 'all' || preset.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const handlePresetSelect = (preset: AnimationPreset) => {
    setSelectedPreset(preset.id);
    onPresetSelect(preset);
  };

  const handlePreview = (preset: AnimationPreset) => {
    onPreview?.(preset);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'text-blue-600 bg-blue-100';
      case 'advanced': return 'text-purple-600 bg-purple-100';
      case 'creative': return 'text-pink-600 bg-pink-100';
      case 'professional': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Animation Presets</h3>
          <div className="text-sm text-gray-500">
            {filteredPresets.length} preset{filteredPresets.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search presets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filters */}
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

      {/* Presets Grid */}
      <div className="p-6">
        {filteredPresets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No presets found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPresets.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                isSelected={selectedPreset === preset.id}
                onSelect={() => handlePresetSelect(preset)}
                onPreview={() => handlePreview(preset)}
                getDifficultyColor={getDifficultyColor}
                getCategoryColor={getCategoryColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Individual preset card component
const PresetCard: React.FC<{
  preset: AnimationPreset;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  getDifficultyColor: (difficulty: string) => string;
  getCategoryColor: (category: string) => string;
}> = ({ preset, isSelected, onSelect, onPreview, getDifficultyColor, getCategoryColor }) => {
  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getCategoryColor(preset.category)}`}>
            {preset.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-gray-900 truncate">{preset.name}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{preset.description}</p>
          </div>
        </div>
      </div>

      {/* Settings Preview */}
      <div className="mb-3 text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Duration:</span>
          <span className="font-mono">{preset.settings.duration}s</span>
        </div>
        <div className="flex justify-between">
          <span>Easing:</span>
          <span className="font-mono">{preset.settings.easing}</span>
        </div>
        {preset.settings.loop && (
          <div className="flex justify-between">
            <span>Loop:</span>
            <span className="text-green-600">Yes</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {preset.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
          >
            {tag}
          </span>
        ))}
        {preset.tags.length > 3 && (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
            +{preset.tags.length - 3}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getDifficultyColor(preset.difficulty)}`}>
          {preset.difficulty}
        </span>
        
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
            title="Preview"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement save to favorites
            }}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Add to Favorites"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for managing custom presets
export const useAnimationPresets = () => {
  const [customPresets, setCustomPresets] = useState<AnimationPreset[]>(() => {
    try {
      const saved = localStorage.getItem('svg-morph-custom-presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomPreset = (preset: Omit<AnimationPreset, 'id'>) => {
    const newPreset: AnimationPreset = {
      ...preset,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('svg-morph-custom-presets', JSON.stringify(updated));
    
    return newPreset;
  };

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('svg-morph-custom-presets', JSON.stringify(updated));
  };

  const getAllPresets = () => [...ANIMATION_PRESETS, ...customPresets];

  return {
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    getAllPresets
  };
};
