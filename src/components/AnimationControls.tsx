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
      <div className="flex items-center mb-4">
        <Settings className="h-5 w-5 text-accent mr-2" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Animation Controls
        </h2>
      </div>

      {/* Playback Controls */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={isAnimating ? onPause : onStart}
          className="flex items-center justify-center w-10 h-10 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors duration-200"
        >
          {isAnimating ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors duration-200"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration: {settings.duration}s
          </label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={settings.duration}
            onChange={(e) => onUpdateSettings({ duration: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Easing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Easing Function
          </label>
          <select
            value={settings.easing}
            onChange={(e) => onUpdateSettings({ easing: e.target.value as AnimationSettings['easing'] })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
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
        <div className="space-y-3 pt-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.colorInterpolation}
              onChange={(e) => onUpdateSettings({ colorInterpolation: e.target.checked })}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Color Interpolation
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.strokeWidthInterpolation}
              onChange={(e) => onUpdateSettings({ strokeWidthInterpolation: e.target.checked })}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Stroke Width Animation
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.loop}
              onChange={(e) => onUpdateSettings({ loop: e.target.checked })}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Loop Animation
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.reverse}
              onChange={(e) => onUpdateSettings({ reverse: e.target.checked })}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Reverse Animation
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};