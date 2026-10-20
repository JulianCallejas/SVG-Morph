import React from 'react';
import { sampleEasing } from '../../utils/homeDemo';

const WIDTH = 320;
const HEIGHT = 220;
const PAD = 24;
const ACTION = 'rgb(var(--color-action))';
const MUTED = 'rgb(var(--color-muted))';
const LINE = 'rgb(var(--color-line))';

const toPath = (points: [number, number][]): string =>
  points
    .map(([x, y], i) => {
      const px = PAD + x * (WIDTH - 2 * PAD);
      const py = HEIGHT - PAD - y * (HEIGHT - 2 * PAD);
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');

// Plots the same curves the demo uses: linear and the cubic ease in-out written into the SMIL output.
export const EasingChart: React.FC = () => (
  <div data-ui className="bg-surface p-5 sm:p-6">
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Progress over time for linear and ease in-out easing"
      className="w-full bg-canvas"
    >
      <path d={`M${PAD} ${PAD / 2} V${HEIGHT - PAD} H${WIDTH - PAD / 2}`} fill="none" stroke={LINE} strokeWidth="1" />
      <path d={toPath(sampleEasing('linear', 60))} fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5 6" />
      <path d={toPath(sampleEasing('ease-in-out', 60))} fill="none" stroke={ACTION} strokeWidth="3" />
    </svg>
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1 w-6 bg-action" />
        Ease in-out
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1 w-6 bg-muted" />
        Linear
      </li>
      <li className="text-muted">Progress over time</li>
    </ul>
  </div>
);
