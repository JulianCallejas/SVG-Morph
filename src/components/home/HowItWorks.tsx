import React from 'react';
import { DEMO_SHAPES, buildSmilSnippet } from '../../utils/homeDemo';
import { CodeSnippet } from './CodeSnippet';

const [circle, star] = DEMO_SHAPES;
const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

const FileTile: React.FC<{ name: string; detail: string; d: string }> = ({ name, detail, d }) => (
  <div className="flex items-center gap-4 bg-raised p-4">
    <svg viewBox="0 0 300 300" aria-hidden="true" className="h-14 w-14 shrink-0 bg-canvas p-2">
      <path d={d} className="fill-action" />
    </svg>
    <div className="min-w-0">
      <p className="truncate font-medium text-content">{name}</p>
      <p className="text-sm text-muted">{detail}</p>
    </div>
  </div>
);

const PairingFragment: React.FC = () => {
  // Both shapes share eight anchors, so each node pairs with the one at the same index.
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

const Call: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div data-ui className="mt-4 bg-surface p-5">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-2 text-content">{value}</p>
  </div>
);

export const HowItWorks: React.FC = () => {
  const exportSnippet = buildSmilSnippet({
    from: circle.d,
    to: star.d,
    durationSeconds: 2.4,
    easing: 'ease-in-out',
  });

  return (
    <section aria-labelledby="how-title" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <h2
            id="how-title"
            data-reveal
            className="text-[clamp(2.25rem,5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.035em] lg:sticky lg:top-28"
          >
            <span className="block">Two files in,</span>
            <span className="block">code out.</span>
          </h2>
        </div>

        <div className="mt-10 flex min-w-0 flex-col gap-16 lg:col-span-7 lg:mt-0 lg:gap-24">
          <div data-reveal>
            <p className="text-2xl font-medium">First, drop in two SVG files.</p>
            <Call label="Source and target" value="circle.svg, star.svg" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:pl-14">
              <FileTile name="circle.svg" detail="1 path, 8 nodes" d={circle.d} />
              <FileTile name="star.svg" detail="1 path, 8 nodes" d={star.d} />
            </div>
          </div>

          <div data-reveal>
            <p className="text-2xl font-medium">Then match their nodes.</p>
            <Call label="Matching" value="Nearest node, with manual overrides" />
            <div className="mt-4 sm:pl-14">
              <PairingFragment />
            </div>
          </div>

          <div data-reveal>
            <p className="text-2xl font-medium">Finally, export the animation.</p>
            <Call label="Export as" value="SVG with SMIL" />
            <div data-ui style={delay(1)} className="mt-4 bg-surface p-5">
              <CodeSnippet label="Example output" code={exportSnippet} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
