import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_SHAPES } from '../../utils/homeDemo';

const [circle, star, square] = DEMO_SHAPES;

const Tile: React.FC<{ label: string; d: string; lit: boolean }> = ({ label, d, lit }) => (
  <div className={`flex flex-col items-center gap-2 p-4 ${lit ? 'bg-ash-200' : 'bg-surface'}`}>
    <svg viewBox="0 0 300 300" aria-hidden="true" className="h-24 w-24">
      <path d={d} className={lit ? 'fill-sun-700' : 'fill-sun-400'} />
    </svg>
    <span className="text-sm">{label}</span>
  </div>
);

const Row: React.FC<{ label: string; note?: string; selected?: boolean; lit: boolean }> = ({
  label,
  note,
  selected,
  lit,
}) => (
  <div
    className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${
      selected ? 'bg-sun-400 text-ash-900' : lit ? 'bg-ash-200' : 'bg-surface'
    }`}
  >
    <span className="font-medium">{label}</span>
    {note && <span className={selected ? 'text-ash-900' : lit ? 'text-ash-700' : 'text-muted'}>{note}</span>}
  </div>
);

const PlaygroundPanel: React.FC<{ lit: boolean }> = ({ lit }) => (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-3">
      <Tile label="Source" d={circle.d} lit={lit} />
      <Tile label="Target" d={star.d} lit={lit} />
    </div>
    <div className={`flex items-center gap-3 p-4 ${lit ? 'bg-ash-200' : 'bg-surface'}`}>
      <div className="h-2 flex-1 bg-ash-500">
        <div className="h-2 w-1/2 bg-sun-400" />
      </div>
      <span className="w-10 text-right text-sm tabular-nums">50%</span>
    </div>
  </div>
);

const StudioPanel: React.FC<{ lit: boolean }> = ({ lit }) => (
  <div className="flex flex-col gap-2">
    <Row label="Upload your SVG files" lit={lit} />
    <Row label="Node matching" selected lit={lit} />
    <Row label="Animation controls" lit={lit} />
    <Row label="Preview" lit={lit} />
    <Row label="Export" lit={lit} />
  </div>
);

const MultiStagePanel: React.FC<{ lit: boolean }> = ({ lit }) => (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-4 gap-2">
      {[circle, star, square, circle].map((shape, i) => (
        <Tile key={i} label={shape.label} d={shape.d} lit={lit} />
      ))}
    </div>
    <Row label="Circle to Star" note="Ease in-out" lit={lit} />
    <Row label="Star to Square" note="Linear" selected lit={lit} />
    <Row label="Square to Circle" note="Ease in-out" lit={lit} />
  </div>
);

const ThreeDPanel: React.FC<{ lit: boolean }> = ({ lit }) => (
  <div className="flex flex-col gap-3">
    <div className={`flex items-center justify-center p-4 ${lit ? 'bg-ash-200' : 'bg-surface'}`}>
      <svg viewBox="0 0 300 300" aria-hidden="true" className="h-36 w-36">
        {[18, 12, 6].map((offset) => (
          <path
            key={offset}
            d={star.d}
            transform={`translate(${offset} ${offset})`}
            className={lit ? 'fill-sun-900' : 'fill-sun-700'}
          />
        ))}
        <path d={star.d} className={lit ? 'fill-sun-700' : 'fill-sun-400'} />
      </svg>
    </div>
    <div className="grid grid-cols-4 gap-2">
      {['OBJ', 'STL', 'PLY', 'GLTF'].map((format) => (
        <div
          key={format}
          className={`py-3 text-center text-sm font-medium ${
            format === 'STL' ? 'bg-sun-400 text-ash-900' : lit ? 'bg-ash-200' : 'bg-surface'
          }`}
        >
          {format}
        </div>
      ))}
    </div>
  </div>
);

const ReversePanel: React.FC<{ lit: boolean }> = ({ lit }) => (
  <div className="flex flex-col gap-2">
    <p className="px-1 pb-1 text-sm">Found in animated.svg</p>
    <Row label="SMIL" note="animate on d" selected lit={lit} />
    <Row label="CSS" note="@keyframes" lit={lit} />
    <Row label="JavaScript" note="GSAP, Anime.js" lit={lit} />
  </div>
);

interface Tool {
  id: string;
  name: string;
  summary: string;
  path: string;
  Panel: React.FC<{ lit: boolean }>;
}

const TOOLS: Tool[] = [
  {
    id: 'playground',
    name: 'Playground',
    summary: 'Two files and one slider. The quickest way to see a morph.',
    path: '/playground',
    Panel: PlaygroundPanel,
  },
  {
    id: 'studio',
    name: 'Studio',
    summary: 'Node matching, animation controls, preview and every export in one flow.',
    path: '/playground-enhanced',
    Panel: StudioPanel,
  },
  {
    id: 'multi-stage',
    name: 'Multi-stage',
    summary: 'Chain several SVGs, A to B to C to D, with a transition between each.',
    path: '/multi-stage',
    Panel: MultiStagePanel,
  },
  {
    id: '3d',
    name: '3D Studio',
    summary: 'Extrude the morph into 3D and export OBJ, STL, PLY or GLTF.',
    path: '/3d-morphing',
    Panel: ThreeDPanel,
  },
  {
    id: 'reverse',
    name: 'Reverse engineering',
    summary: 'Upload an animated SVG and read back its SMIL, CSS or JavaScript.',
    path: '/reverse-engineering',
    Panel: ReversePanel,
  },
];

export const ToolsShowcase: React.FC = () => {
  const [active, setActive] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const syncActive = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const center = row.getBoundingClientRect().left + row.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    panelRefs.current.forEach((panel, i) => {
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    syncActive();
  }, [syncActive]);

  const goTo = (index: number) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRefs.current[index]?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  };

  const tool = TOOLS[active];

  return (
    <section aria-labelledby="tools-title" className="bg-surface py-24 lg:py-40">
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
        ref={rowRef}
        onScroll={syncActive}
        data-reveal
        style={{ '--i': 1 } as React.CSSProperties}
        className="mt-12 flex snap-x snap-mandatory items-center gap-6 overflow-x-auto px-[calc(50vw-min(43vw,210px))] py-4 lg:mt-16 lg:gap-[8vw]"
      >
        {TOOLS.map(({ id, name, Panel }, i) => {
          const lit = i === active;
          return (
            <div
              key={id}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              data-ui
              aria-hidden="true"
              className={`w-[min(86vw,420px)] shrink-0 snap-center p-5 transition-colors duration-300 ${
                lit ? 'bg-ash-50 text-ash-900' : 'bg-canvas text-content'
              }`}
            >
              <p className="mb-4 text-sm font-semibold">{name}</p>
              <Panel lit={lit} />
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-12 grid max-w-[1600px] gap-10 px-4 sm:px-6 lg:mt-16 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <p className="text-2xl font-light tracking-[-0.02em]">{tool.name}</p>
          <p className="mt-3 max-w-[42ch] text-lg text-content">{tool.summary}</p>
          <Link
            to={tool.path}
            className="press mt-6 inline-flex h-12 items-center bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
          >
            Open {tool.name}
          </Link>
        </div>
        <div role="tablist" aria-label="Tools" className="flex flex-wrap content-start gap-2 lg:col-span-6 lg:col-start-7">
          {TOOLS.map(({ id, name }, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => goTo(i)}
              className={`h-11 px-4 text-sm font-medium transition-colors duration-150 ${
                i === active ? 'bg-action text-on-action' : 'bg-raised text-content hover:bg-line/40'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
