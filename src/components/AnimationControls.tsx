import React from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import type { AnimationSettings } from '../store/morphStore';

interface AnimationControlsProps {
  settings: AnimationSettings;
  onUpdateSettings: (settings: Partial<AnimationSettings>) => void;
  isAnimating: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  settings,
  onUpdateSettings,
  isAnimating,
  onStart,
  onPause,
  onReset,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
          <Settings size={16} className="text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Animation Controls
        </h2>
      </div>

      {/* Playback Controls */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={isAnimating ? onPause : onStart}
          className="flex items-center justify-center w-12 h-12 bg-accent hover:bg-accent/90 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          {isAnimating ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center w-12 h-12 bg-secondary hover:bg-secondary/90 text-primary rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Duration: <span className="text-accent font-semibold">{settings.duration}s</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={settings.duration}
            onChange={(e) => onUpdateSettings({ duration: parseFloat(e.target.value) })}
            className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-xl appearance-none cursor-pointer slider-accent"
          />
        </div>

        {/* Easing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Easing Function
          </label>
          <select
            value={settings.easing}
            onChange={(e) => onUpdateSettings({ easing: e.target.value as AnimationSettings['easing'] })}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
          >
            <option value="linear">Linear</option>
            <option value="easeInOut">Ease In Out</option>
            <option value="easeIn">Ease In</option>
            <option value="easeOut">Ease Out</option>
            <option value="bounce">Bounce</option>
            <option value="elastic">Elastic</option>
          </select>
        </div>

        {/* Toggle Options */}
        <div className="space-y-4 pt-2">
          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.colorInterpolation}
              onChange={(e) => onUpdateSettings({ colorInterpolation: e.target.checked })}
              className="w-5 h-5 text-accent bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-accent focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Color Interpolation
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.strokeWidthInterpolation}
              onChange={(e) => onUpdateSettings({ strokeWidthInterpolation: e.target.checked })}
              className="w-5 h-5 text-accent bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-accent focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Stroke Width Animation
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={(e) => onUpdateSettings({ loop: e.target.checked })}
              className="w-5 h-5 text-accent bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-accent focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Loop Animation
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.reverse}
              onChange={(e) => onUpdateSettings({ reverse: e.target.checked })}
              className="w-5 h-5 text-accent bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-accent focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Reverse Animation
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};