import React from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
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

const CONTACT_EMAIL = 'jc.develop.co@gmail.com';

const FACTS = [
  { term: '5+ years', detail: 'of web development experience' },
  { term: 'Finance', detail: 'a long career as a financial director and consultant' },
  { term: 'Bogotá', detail: 'Based in Colombia' },
];

const DEV_STACK = ['React', 'TypeScript', 'Node.js', 'FastAPI', 'PostgreSQL', 'Tailwind CSS', 'PWA'];

const PROJECTS = [
  {
    name: 'Postaly',
    href: 'https://postaly.cl/',
    text: 'A free, interactive map to find postal codes in Chile and around the world.',
  },
  {
    name: 'Toggle Word Quest',
    href: 'https://playtwq.com/',
    text: 'A word search game you can play for free in the browser.',
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
          <div className="mx-auto max-w-[1600px]">
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <h2
                  id="dev-title"
                  data-reveal
                  className="text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]"
                >
                  About the developer
                </h2>
                <p data-reveal style={delay(1)} className="mt-6 max-w-[40ch] text-lg">
                  SVG Morph is one of a small family of apps built to solve real problems with solid engineering.
                </p>
              </div>

              <div data-reveal style={delay(1)} className="flex flex-col gap-6 sm:flex-row sm:items-start lg:col-span-7">
                <div
                  aria-hidden="true"
                  className="flex h-24 w-24 shrink-0 items-center justify-center bg-raised text-3xl font-light"
                >
                  JC
                </div>
                <div>
                  <h3 className="text-2xl font-medium">{'{ jc-develop }'}</h3>
                  <p className="mt-1 text-muted">Full-stack developer and financial professional</p>
                  <p className="mt-4 max-w-[56ch] text-lg">
                    {'{ jc-develop }'} is a full-stack developer with over 5 years of web development experience and a long
                    career as a financial director and consultant. That mix shapes how the apps are built: technology that
                    solves a concrete problem, with attention to quality in every line of code and every interaction.
                  </p>
                  <p className="mt-4 max-w-[56ch] text-lg">
                    SVG Morph reflects that focus: advanced web technologies, computer graphics and user experience design,
                    applied to a free tool for animating shapes from the first upload to the exported code.
                  </p>
                </div>
              </div>
            </div>

            <dl className="mt-12 grid gap-1 sm:grid-cols-3 lg:mt-16">
              {FACTS.map(({ term, detail }, i) => (
                <div key={term} data-reveal style={delay(i)} className="bg-raised p-6">
                  <dt className="text-3xl font-light text-link">{term}</dt>
                  <dd className="mt-2 text-muted">{detail}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-16 grid gap-8 lg:mt-24 lg:grid-cols-12 lg:gap-12">
              <h3 data-reveal className="text-2xl font-medium lg:col-span-5">
                Tools of the trade
              </h3>
              <ul data-reveal style={delay(1)} className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:col-span-7">
                {DEV_STACK.map((item) => (
                  <li key={item} className="bg-raised px-5 py-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-16 grid gap-8 lg:mt-24 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <h3 data-reveal className="text-2xl font-medium">
                  More from {'{ jc-develop }'}
                </h3>
                <p data-reveal style={delay(1)} className="mt-4 max-w-[40ch] text-lg">
                  Other apps from the same family. Each one is free to use.
                </p>
              </div>
              <ul className="grid gap-1 sm:grid-cols-2 lg:col-span-7">
                {PROJECTS.map(({ name, href, text }, i) => (
                  <li key={name} data-reveal style={delay(i)}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press flex h-full flex-col bg-raised p-6 transition-colors hover:bg-line/40"
                    >
                      <span className="flex items-center justify-between gap-4 text-xl font-medium">
                        {name}
                        <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 text-link" />
                      </span>
                      <span className="mt-3 text-muted">{text}</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-16 grid gap-8 lg:mt-24 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <h3 data-reveal className="text-2xl font-medium">
                  Get in touch
                </h3>
              </div>
              <div data-reveal style={delay(1)} className="lg:col-span-7">
                <p className="max-w-[52ch] text-lg">
                  Have a question, a suggestion or a project in mind? Feedback on SVG Morph is welcome too.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=SVG%20Morph`}
                    className="press inline-flex h-12 items-center gap-2 bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
                  >
                    <Mail aria-hidden="true" className="h-5 w-5" />
                    {CONTACT_EMAIL}
                  </a>
                  <a
                    href="https://github.com/JulianCallejas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press inline-flex h-12 items-center gap-2 bg-raised px-6 font-semibold hover:bg-line/40"
                  >
                    GitHub
                    <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-link" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
};
