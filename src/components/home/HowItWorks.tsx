import React from 'react';
import { DEMO_SHAPES, buildSmilSnippet } from '../../utils/homeDemo';
import { CodeSnippet } from './CodeSnippet';
import { PairingFragment } from './PairingFragment';

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
