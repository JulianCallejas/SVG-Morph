import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { AnimationSettings } from '../store/morphStore';
import { Button } from './ui/Button';
import { CheckRow, Field, Select, Slider } from './ui/Fields';
import { Panel } from './ui/Panel';

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
    <Panel title="Animation Controls">
      {/* Playback Controls */}
      <div className="flex gap-3 mb-6">
        <Button
          variant="primary"
          size="icon"
          onClick={isAnimating ? onPause : onStart}
          aria-label={isAnimating ? 'Pause animation' : 'Start animation'}
        >
          {isAnimating ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button size="icon" onClick={onReset} aria-label="Reset animation">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Duration */}
        <Field label={<>Duration: <span className="font-semibold text-link">{settings.duration}s</span></>}>
          <Slider
            min="0.1"
            max="5"
            step="0.1"
            value={settings.duration}
            onChange={(e) => onUpdateSettings({ duration: parseFloat(e.target.value) })}
          />
        </Field>

        {/* Easing */}
        <Field label="Easing Function">
          <Select
            value={settings.easing}
            onChange={(e) => onUpdateSettings({ easing: e.target.value as AnimationSettings['easing'] })}
          >
            <option value="linear">Linear</option>
            <option value="easeInOut">Ease In Out</option>
            <option value="easeIn">Ease In</option>
            <option value="easeOut">Ease Out</option>
            <option value="bounce">Bounce</option>
            <option value="elastic">Elastic</option>
          </Select>
        </Field>

        {/* Toggle Options */}
        <div className="space-y-2 pt-2">
          <CheckRow
            label="Color Interpolation"
            checked={settings.colorInterpolation}
            onChange={(e) => onUpdateSettings({ colorInterpolation: e.target.checked })}
          />
          <CheckRow
            label="Stroke Width Animation"
            checked={settings.strokeWidthInterpolation}
            onChange={(e) => onUpdateSettings({ strokeWidthInterpolation: e.target.checked })}
          />
          <CheckRow
            label="Loop Animation"
            checked={settings.loop}
            onChange={(e) => onUpdateSettings({ loop: e.target.checked })}
          />
          <CheckRow
            label="Reverse Animation"
            checked={settings.reverse}
            onChange={(e) => onUpdateSettings({ reverse: e.target.checked })}
          />
        </div>
      </div>
    </Panel>
  );
};
