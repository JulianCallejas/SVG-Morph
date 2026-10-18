import React, { useEffect, useState } from 'react';
import { DEMO_SHAPES, applyEasing, interpolatePath } from '../../utils/homeDemo';

const [circle, star] = DEMO_SHAPES;

const CYCLE_SECONDS = 2.4;
const ACTION = 'rgb(var(--color-action))';
const STAGE = 'rgb(var(--color-action) / 0.16)';

// A circle morphing into a star and back, with no controls: the hero of the page showing the product at work.
export const MorphLoop: React.FC = () => {
  const [progress, setProgress] = useState(0.5);

  useEffect(() => {
    // Autoplay is motion: people who asked for less of it get a still frame.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const phase = (((now - start) / 1000) % CYCLE_SECONDS) / CYCLE_SECONDS;
      setProgress(phase < 0.5 ? phase * 2 : 2 - phase * 2);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div data-ui className="bg-surface p-4">
      <div className="flex items-center justify-center py-4" style={{ backgroundColor: STAGE }}>
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label="A circle morphing into a star and back"
          className="h-[min(60vw,280px)] w-[min(60vw,280px)]"
        >
          <path d={interpolatePath(circle.d, star.d, applyEasing('ease-in-out', progress))} fill={ACTION} />
        </svg>
      </div>
    </div>
  );
};
