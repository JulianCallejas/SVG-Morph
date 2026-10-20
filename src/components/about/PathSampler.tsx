import React, { useEffect, useRef, useState } from 'react';
import { DEMO_SHAPES } from '../../utils/homeDemo';
import { Slider } from '../ui/Fields';

const [, star] = DEMO_SHAPES;

const ACTION = 'rgb(var(--color-action))';
const LINE = 'rgb(var(--color-line))';
const DEFAULT_POINTS = 100;

interface Point {
  x: number;
  y: number;
}

// Samples the outline at evenly spaced lengths, the same way the app normalizes a path
// (`getPointAtLength` along the total length), so the dots show what the algorithm sees.
export const PathSampler: React.FC = () => {
  const [count, setCount] = useState(DEFAULT_POINTS);
  const [points, setPoints] = useState<Point[]>([]);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPoints(
      Array.from({ length: count }, (_, i) => {
        const { x, y } = path.getPointAtLength((i / count) * total);
        return { x, y };
      }),
    );
  }, [count]);

  return (
    <div data-ui className="bg-surface p-5 sm:p-6">
      <div className="bg-canvas py-4">
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label={`A star outline sampled at ${count} points spaced evenly along its length`}
          className="mx-auto h-[min(72vw,300px)] w-[min(72vw,300px)]"
        >
          <path ref={pathRef} d={star.d} fill="none" stroke={LINE} strokeWidth="1.5" />
          {points.map((point, i) => (
            <circle key={i} cx={point.x} cy={point.y} r="2.6" fill={ACTION} />
          ))}
        </svg>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <label className="flex flex-1 items-center gap-4">
          <span className="text-sm text-muted">Points</span>
          <Slider min={8} max={DEFAULT_POINTS} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
        <output className="w-24 text-right text-sm tabular-nums">{count} points</output>
      </div>
    </div>
  );
};
