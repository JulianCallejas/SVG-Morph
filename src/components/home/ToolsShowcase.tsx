import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEMO_SHAPES } from '../../utils/homeDemo';
import playgroundDark from '../../assets/home/tools/playground-dark.webp';
import playgroundLight from '../../assets/home/tools/playground-light.webp';
import studioDark from '../../assets/home/tools/studio-dark.webp';
import studioLight from '../../assets/home/tools/studio-light.webp';
import multiStageDark from '../../assets/home/tools/multi-stage-dark.webp';
import multiStageLight from '../../assets/home/tools/multi-stage-light.webp';
import reverseDark from '../../assets/home/tools/reverse-dark.webp';
import reverseLight from '../../assets/home/tools/reverse-light.webp';

const star = DEMO_SHAPES[1];

const SWIPE_DISTANCE = 50;

const ThreeDPanel: React.FC = () => (
  <div className="flex flex-1 flex-col gap-3">
    <div className="flex flex-1 items-center justify-center bg-surface p-4">
      <svg viewBox="0 0 300 300" aria-hidden="true" className="h-40 w-40">
        {[18, 12, 6].map((offset) => (
          <path key={offset} d={star.d} transform={`translate(${offset} ${offset})`} className="fill-sun-700" />
        ))}
        <path d={star.d} className="fill-sun-400" />
      </svg>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {['OBJ', 'STL', 'PLY', 'GLTF'].map((format) => (
        <div
          key={format}
          className={`py-3 text-center text-sm font-medium ${
            format === 'STL' ? 'bg-sun-400 text-ash-900' : 'bg-surface'
          }`}
        >
          {format}
        </div>
      ))}
    </div>
  </div>
);

interface Tool {
  id: string;
  name: string;
  summary: string;
  path: string;
  // Each slide owns a flat dark field so neighbours are told apart without brightening the page.
  field: string;
  // A real capture of the tool in both themes. Tools without one fall back to a drawn Panel.
  shot?: { dark: string; light: string; alt: string };
  Panel?: React.FC;
}

const TOOLS: Tool[] = [
  {
    id: 'playground',
    name: 'Playground',
    summary: 'Two files and one slider. The quickest way to see a morph.',
    path: '/playground',
    field: 'bg-field-sun',
    shot: { dark: playgroundDark, light: playgroundLight, alt: 'The Playground with a circle and a star loaded, shown side by side' },
  },
  {
    id: 'studio',
    name: 'Studio',
    summary: 'Node matching, animation controls, preview and every export in one flow.',
    path: '/playground-enhanced',
    field: 'bg-surface',
    shot: { dark: studioDark, light: studioLight, alt: 'The Studio node matching step with the pairs drawn between a circle and a star' },
  },
  {
    id: 'multi-stage',
    name: 'Multi-stage',
    summary: 'Chain several SVGs, A to B to C to D, with a transition between each.',
    path: '/multi-stage',
    field: 'bg-field-gold',
    shot: { dark: multiStageDark, light: multiStageLight, alt: 'A multi-stage sequence from circle to star to square with its playback controls' },
  },
  {
    id: '3d',
    name: '3D Studio',
    summary: 'Extrude the morph into 3D and export OBJ, STL, PLY or GLTF.',
    path: '/3d-morphing',
    field: 'bg-raised',
    Panel: ThreeDPanel,
  },
  {
    id: 'reverse',
    name: 'Reverse engineering',
    summary: 'Upload an animated SVG and read back its SMIL, CSS or JavaScript.',
    path: '/reverse-engineering',
    field: 'bg-field-sun',
    shot: { dark: reverseDark, light: reverseLight, alt: 'The analysis of an animated SVG: duration, easing and the extracted paths' },
  },
];

type InertElement = HTMLElement & { inert: boolean };

export const ToolsShowcase: React.FC = () => {
  const [active, setActive] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const swipeStart = useRef<number | null>(null);

  const goTo = (index: number) => setActive((index + TOOLS.length) % TOOLS.length);

  // Slides that are off screen must not take focus or be read out.
  useEffect(() => {
    slideRefs.current.forEach((slide, i) => {
      if (slide) (slide as InertElement).inert = i !== active;
    });
  }, [active]);

  const onTabKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + TOOLS.length) % TOOLS.length;
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    swipeStart.current = event.pointerType === 'mouse' ? null : event.clientX;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (swipeStart.current === null) return;
    const distance = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) >= SWIPE_DISTANCE) goTo(active + (distance < 0 ? 1 : -1));
  };

  return (
    <section aria-labelledby="tools-title" className="py-16 lg:py-32">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <h2
          id="tools-title"
          data-reveal
          className="max-w-[16ch] text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]"
        >
          Five tools, one engine
        </h2>
      </div>

      <div
        aria-roledescription="carousel"
        aria-label="Tools"
        data-reveal
        style={{ '--i': 1 } as React.CSSProperties}
        className="mt-10 touch-pan-y overflow-hidden lg:mt-14"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          className="flex items-stretch transition-transform duration-500 motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)`, transitionTimingFunction: 'var(--ease-out)' }}
        >
          {TOOLS.map(({ id, name, summary, path, field, shot, Panel }, i) => (
            <div
              key={id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              id={`tool-slide-${id}`}
              role="tabpanel"
              aria-labelledby={`tool-tab-${id}`}
              aria-hidden={i !== active}
              className={`w-full shrink-0 text-content ${field}`}
            >
              <div className="mx-auto grid max-w-[1600px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
                <div className="lg:order-2 lg:col-span-7">
                  {shot ? (
                    <div data-ui className="mx-auto w-full max-w-[760px] bg-canvas">
                      <img
                        src={shot.dark}
                        alt={shot.alt}
                        width={1440}
                        height={810}
                        loading="lazy"
                        decoding="async"
                        className="block h-auto w-full [.light_&]:hidden"
                      />
                      <img
                        src={shot.light}
                        alt={shot.alt}
                        width={1440}
                        height={810}
                        loading="lazy"
                        decoding="async"
                        className="hidden h-auto w-full [.light_&]:block"
                      />
                    </div>
                  ) : (
                    Panel && (
                      <div
                        data-ui
                        className="mx-auto flex min-h-[340px] w-full max-w-[560px] flex-col bg-canvas p-5 text-content sm:p-6"
                      >
                        <p className="mb-4 text-sm font-semibold">{name}</p>
                        <Panel />
                      </div>
                    )
                  )}
                </div>
                <div className="lg:order-1 lg:col-span-5">
                  <p className="text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]">{name}</p>
                  <p className="mt-4 max-w-[34ch] text-lg">{summary}</p>
                  <Link
                    to={path}
                    className="press mt-8 inline-flex h-12 items-center bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
                  >
                    Open {name}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-[1600px] flex-col gap-4 px-4 sm:px-6 lg:mt-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div role="tablist" aria-label="Tools" className="flex flex-wrap gap-2" onKeyDown={onTabKeyDown}>
          {TOOLS.map(({ id, name }, i) => (
            <button
              key={id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tool-tab-${id}`}
              aria-selected={i === active}
              aria-controls={`tool-slide-${id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => goTo(i)}
              className={`h-11 px-4 text-sm font-medium transition-colors duration-150 ${
                i === active ? 'bg-action text-on-action' : 'bg-raised text-content hover:bg-line/40'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous tool"
            onClick={() => goTo(active - 1)}
            className="inline-flex h-11 w-11 items-center justify-center bg-raised text-content hover:bg-line/40"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next tool"
            onClick={() => goTo(active + 1)}
            className="inline-flex h-11 w-11 items-center justify-center bg-raised text-content hover:bg-line/40"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};
