import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DEMO_SHAPES } from '../../utils/homeDemo';

const [circle, star, square] = DEMO_SHAPES;

const SWIPE_DISTANCE = 50;

const Tile: React.FC<{ label: string; d: string }> = ({ label, d }) => (
  <div className="flex flex-col items-center justify-center gap-2 bg-surface p-4">
    <svg viewBox="0 0 300 300" aria-hidden="true" className="h-24 w-24 sm:h-28 sm:w-28">
      <path d={d} className="fill-sun-400" />
    </svg>
    <span className="text-sm">{label}</span>
  </div>
);

const Row: React.FC<{ label: string; note?: string; selected?: boolean }> = ({ label, note, selected }) => (
  <div
    className={`flex flex-1 items-center justify-between gap-4 px-4 py-3 text-sm ${
      selected ? 'bg-sun-400 text-ash-900' : 'bg-surface'
    }`}
  >
    <span className="font-medium">{label}</span>
    {note && <span className={selected ? 'text-ash-900' : 'text-muted'}>{note}</span>}
  </div>
);

const PlaygroundPanel: React.FC = () => (
  <div className="flex flex-1 flex-col gap-3">
    <div className="grid flex-1 grid-cols-2 gap-3">
      <Tile label="Source" d={circle.d} />
      <Tile label="Target" d={star.d} />
    </div>
    <div className="flex items-center gap-3 bg-surface p-4">
      <div className="h-2 flex-1 bg-ash-500">
        <div className="h-2 w-1/2 bg-sun-400" />
      </div>
      <span className="w-10 text-right text-sm tabular-nums">50%</span>
    </div>
  </div>
);

const StudioPanel: React.FC = () => (
  <div className="flex flex-1 flex-col gap-2">
    <Row label="Upload your SVG files" />
    <Row label="Node matching" selected />
    <Row label="Animation controls" />
    <Row label="Preview" />
    <Row label="Export" />
  </div>
);

const MultiStagePanel: React.FC = () => (
  <div className="flex flex-1 flex-col gap-2">
    <div className="grid grid-cols-4 gap-2">
      {[circle, star, square, circle].map((shape, i) => (
        <Tile key={i} label={shape.label} d={shape.d} />
      ))}
    </div>
    <Row label="Circle to Star" note="Ease in-out" />
    <Row label="Star to Square" note="Linear" selected />
    <Row label="Square to Circle" note="Ease in-out" />
  </div>
);

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

const ReversePanel: React.FC = () => (
  <div className="flex flex-1 flex-col gap-2">
    <p className="px-1 pb-1 text-sm">Found in animated.svg</p>
    <Row label="SMIL" note="animate on d" selected />
    <Row label="CSS" note="@keyframes" />
    <Row label="JavaScript" note="GSAP, Anime.js" />
  </div>
);

interface Tool {
  id: string;
  name: string;
  summary: string;
  path: string;
  // Each slide owns a flat dark field so neighbours are told apart without brightening the page.
  field: string;
  Panel: React.FC;
}

const TOOLS: Tool[] = [
  {
    id: 'playground',
    name: 'Playground',
    summary: 'Two files and one slider. The quickest way to see a morph.',
    path: '/playground',
    field: 'bg-field-sun',
    Panel: PlaygroundPanel,
  },
  {
    id: 'studio',
    name: 'Studio',
    summary: 'Node matching, animation controls, preview and every export in one flow.',
    path: '/playground-enhanced',
    field: 'bg-surface',
    Panel: StudioPanel,
  },
  {
    id: 'multi-stage',
    name: 'Multi-stage',
    summary: 'Chain several SVGs, A to B to C to D, with a transition between each.',
    path: '/multi-stage',
    field: 'bg-field-gold',
    Panel: MultiStagePanel,
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
    field: 'bg-selected',
    Panel: ReversePanel,
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
          {TOOLS.map(({ id, name, summary, path, field, Panel }, i) => (
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
                  <div
                    data-ui
                    className="mx-auto flex min-h-[340px] w-full max-w-[560px] flex-col bg-canvas p-5 text-content sm:p-6"
                  >
                    <p className="mb-4 text-sm font-semibold">{name}</p>
                    <Panel />
                  </div>
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
