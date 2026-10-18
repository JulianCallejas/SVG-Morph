import React from 'react';
import { Link } from 'react-router-dom';
import { EasingChart } from '../components/about/EasingChart';
import { MorphLoop } from '../components/about/MorphLoop';
import { PathSampler } from '../components/about/PathSampler';
import { PairingFragment } from '../components/home/PairingFragment';
import { SiteFooter } from '../components/SiteFooter';
import { WorkerTest } from '../components/WorkerTest';
import { useReveal } from '../hooks/useReveal';

const STEPS = [
  {
    title: 'Path normalization',
    text: 'Each path is sampled at 100 points spaced evenly along its length, so two shapes with a different number of curves end up with the same number of points. Drag the slider to see the sampling.',
    fragment: <PathSampler />,
    width: 'max-w-[520px]',
  },
  {
    title: 'Node matching',
    text: 'Every node of the source is paired with the nearest node of the target, found with a k-d tree and Euclidean distance. You can override any pair by hand, and the Studio has an optional thin-plate spline refinement that is off by default.',
    fragment: <PairingFragment />,
    width: 'max-w-[680px]',
  },
  {
    title: 'Interpolation and animation',
    text: 'Path data, colors and stroke width are interpolated with the easing you pick. Playback runs on requestAnimationFrame, and the same morph exports as SMIL or CSS keyframes.',
    fragment: <EasingChart />,
    width: 'max-w-[420px]',
  },
];

const STACK = [
  {
    title: 'Frontend',
    items: ['React 18 with TypeScript', 'Vite for fast development', 'Tailwind CSS for styling', 'Zustand for state management'],
  },
  {
    title: 'SVG processing',
    items: [
      'SVG.js for SVG manipulation',
      'D3-interpolate for smooth transitions',
      'svg-path-commander for path operations',
      'Web Workers for performance',
    ],
  },
];

const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

export const About: React.FC = () => {
  useReveal();

  return (
    <>
      <main>
        <section aria-labelledby="about-title" className="px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="mx-auto grid max-w-[1600px] gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <h1
                id="about-title"
                className="lines text-[clamp(2.5rem,7vw,6.5rem)] font-light leading-[1] tracking-[-0.035em]"
              >
                <span className="line">
                  <span data-line style={delay(0)}>
                    SVG morphing,
                  </span>
                </span>
                <span className="line">
                  <span data-line style={delay(1)}>
                    made accessible.
                  </span>
                </span>
              </h1>
              <p className="rise mt-8 max-w-[44ch] text-lg" style={delay(0)}>
                How SVG Morph turns two shapes into one animation, and what it is built on.
              </p>
              <Link
                to="/playground-enhanced"
                className="rise press mt-6 inline-flex h-12 items-center bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
                style={delay(1)}
              >
                Open the studio
              </Link>
            </div>
            <div className="rise lg:col-span-4" style={delay(2)}>
              <MorphLoop />
            </div>
          </div>
        </section>

        <section aria-labelledby="how-title" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-[1600px]">
            <h2
              id="how-title"
              data-reveal
              className="text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]"
            >
              How it works
            </h2>

            <div className="mt-12 flex flex-col gap-16 lg:mt-16 lg:gap-24">
              {STEPS.map(({ title, text, fragment, width }) => (
                <div key={title} className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
                  <div className="lg:col-span-5">
                    <h3 data-reveal className="text-2xl font-medium">
                      {title}
                    </h3>
                    <p data-reveal style={delay(1)} className="mt-4 max-w-[46ch] text-lg">
                      {text}
                    </p>
                  </div>
                  <div data-reveal style={delay(2)} className={`w-full lg:col-span-7 ${width}`}>
                    {fragment}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Web Worker check" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-16">
          <div data-reveal className="mx-auto max-w-[1600px] lg:grid lg:grid-cols-12 lg:gap-12">
            <div data-ui className="lg:col-span-7 lg:col-start-6">
              <WorkerTest />
            </div>
          </div>
        </section>

        <section aria-labelledby="stack-title" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-[1600px]">
            <h2
              id="stack-title"
              data-reveal
              className="text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]"
            >
              Tech stack
            </h2>
            <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-2 lg:gap-8">
              {STACK.map(({ title, items }, group) => (
                <div key={title} data-reveal style={delay(group)}>
                  <h3 className="mb-4 text-2xl font-medium">{title}</h3>
                  <ul className="flex flex-col gap-1">
                    {items.map((item, i) => (
                      <li
                        key={item}
                        data-reveal
                        style={delay(i)}
                        className={`px-5 py-5 text-lg ${i % 2 === 0 ? 'bg-surface' : 'bg-raised'}`}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="dev-title" className="bg-surface px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div data-reveal className="mx-auto grid max-w-[1600px] gap-8 lg:grid-cols-12 lg:gap-12">
            <h2
              id="dev-title"
              className="text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em] lg:col-span-5"
            >
              About the developer
            </h2>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start lg:col-span-7">
              <div
                aria-hidden="true"
                className="flex h-24 w-24 shrink-0 items-center justify-center bg-raised text-3xl font-light"
              >
                JC
              </div>
              <div>
                <h3 className="text-2xl font-medium">jc-develop</h3>
                <p className="mt-4 max-w-[52ch] text-lg">
                  Full-stack developer passionate about creating innovative tools for digital artists and designers.
                  Specializing in advanced web technologies, computer graphics, and user experience design.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
};
