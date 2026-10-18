import React from 'react';
import { DEMO_SHAPES } from '../../utils/homeDemo';

const [circle, star] = DEMO_SHAPES;

// Both shapes share eight anchors, so each node pairs with the one at the same index.
export const PairingFragment: React.FC = () => {
  const anchors = Array.from({ length: 8 }, (_, i) => {
    const angle = ((-90 + 45 * i) * Math.PI) / 180;
    return { x: Math.cos(angle), y: Math.sin(angle), outer: i % 2 === 0 };
  });
  const circlePoint = (a: (typeof anchors)[number]) => ({ x: 100 + a.x * 70, y: 100 + a.y * 70 });
  const starPoint = (a: (typeof anchors)[number]) => {
    const radius = a.outer ? 76 : 32;
    return { x: 340 + a.x * radius, y: 100 + a.y * radius };
  };

  return (
    <div data-ui className="bg-surface p-4 sm:p-6">
      <svg
        viewBox="0 0 440 200"
        role="img"
        aria-label="Eight nodes of the circle paired with eight nodes of the star"
        className="w-full"
      >
        {anchors.map((a, i) => (
          <line
            key={i}
            x1={circlePoint(a).x}
            y1={circlePoint(a).y}
            x2={starPoint(a).x}
            y2={starPoint(a).y}
            className="stroke-muted"
            strokeWidth="1"
          />
        ))}
        <path d={circle.d} transform="translate(-5 -5) scale(0.7)" className="fill-none stroke-action" strokeWidth="2" />
        <path d={star.d} transform="translate(235 -5) scale(0.7)" className="fill-none stroke-action" strokeWidth="2" />
        {anchors.map((a, i) => (
          <React.Fragment key={i}>
            <circle cx={circlePoint(a).x} cy={circlePoint(a).y} r="4" className="fill-action" />
            <circle cx={starPoint(a).x} cy={starPoint(a).y} r="4" className="fill-action" />
          </React.Fragment>
        ))}
      </svg>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-content">8 of 8 nodes paired</p>
        <div className="flex">
          <span className="bg-action px-3 py-2 text-sm font-medium text-on-action">Automatic</span>
          <span className="bg-raised px-3 py-2 text-sm font-medium text-content">Manual</span>
        </div>
      </div>
    </div>
  );
};
