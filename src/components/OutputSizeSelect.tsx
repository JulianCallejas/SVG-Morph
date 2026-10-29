import React from 'react';
import { useMorphStore } from '../store/morphStore';
import type { OutputSizeMode } from '../utils/fitSVGData';
import { Field, Select } from './ui/Fields';

const OPTIONS: { value: OutputSizeMode; label: string }[] = [
  { value: 'asIs', label: 'As uploaded (no scaling)' },
  { value: 'larger', label: 'Larger of the two' },
  { value: 'smaller', label: 'Smaller of the two' },
  { value: 'source', label: 'Size of the source' },
  { value: 'target', label: 'Size of the target' },
];

export const OutputSizeSelect: React.FC = () => {
  const outputSizeMode = useMorphStore((state) => state.outputSizeMode);
  const setOutputSizeMode = useMorphStore((state) => state.setOutputSizeMode);

  return (
    <div className="space-y-2">
      <Field label="Output size">
        <Select
          value={outputSizeMode}
          onChange={(event) => {
            void setOutputSizeMode(event.target.value as OutputSizeMode);
          }}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <p className="text-sm text-muted">
        The other SVG is scaled in proportion, never stretched, and centered in the chosen size.
      </p>
    </div>
  );
};
