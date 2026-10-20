import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Segmented } from '../ui/Segmented';
import { CodeSnippet } from './CodeSnippet';
import {
  DEMO_SHAPES,
  applyEasing,
  buildSmilSnippet,
  getDemoShape,
  interpolatePath,
  type DemoEasing,
  type DemoShapeId,
} from '../../utils/homeDemo';

const CYCLE_SECONDS = 2.4;

// The demo paints with the accent variable directly, so it never depends on a generated utility class.
const ACTION = 'rgb(var(--color-action))';
const STAGE = 'rgb(var(--color-action) / 0.16)';
const EASINGS: { id: DemoEasing; label: string }[] = [
  { id: 'ease-in-out', label: 'Ease in-out' },
  { id: 'linear', label: 'Linear' },
];

export const HeroMorph: React.FC = () => {
  const [fromId, setFromId] = useState<DemoShapeId>('circle');
  const [toId, setToId] = useState<DemoShapeId>('star');
  const [easing, setEasing] = useState<DemoEasing>('ease-in-out');
  const [progress, setProgress] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);

  const from = getDemoShape(fromId);
  const to = getDemoShape(toId);
  const shapeD = interpolatePath(from.d, to.d, applyEasing(easing, progress));
  const snippet = buildSmilSnippet({ from: from.d, to: to.d, durationSeconds: CYCLE_SECONDS, easing });

  useEffect(() => {
    // Autoplay is motion: leave it off for people who asked for less of it.
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !visible) return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setProgress((current) => {
        const next = current + (directionRef.current * delta) / (CYCLE_SECONDS / 2);
        if (next >= 1) {
          directionRef.current = -1;
          return 1;
        }
        if (next <= 0) {
          directionRef.current = 1;
          return 0;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible]);

  const shapeOptions = DEMO_SHAPES.map(({ id, label }) => ({ id, label }));

  return (
    <section aria-labelledby="hero-title" className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-32 lg:pt-10">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <h1
            id="hero-title"
            className="lines text-[clamp(2.5rem,7vw,6.5rem)] font-light leading-[1] tracking-[-0.035em] lg:col-span-8"
          >
            <span className="line">
              <span data-line style={{ '--i': 0 } as React.CSSProperties}>
                Morph one SVG
              </span>
            </span>
            <span className="line">
              <span data-line style={{ '--i': 1 } as React.CSSProperties}>
                into another.
              </span>
            </span>
          </h1>
          <div className="lg:col-span-4">
            <p className="rise max-w-[40ch] text-lg text-content" style={{ '--i': 0 } as React.CSSProperties}>
              Pick two shapes, drag the progress and copy the SMIL it writes. Everything runs in your browser.
            </p>
            <Link
              to="/playground-enhanced"
              className="rise press mt-6 inline-flex h-12 items-center bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              Open the studio
            </Link>
          </div>
        </div>

        <div
          data-ui
          className="rise mt-10 grid gap-px bg-line/30 lg:grid-cols-12"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <div className="flex flex-col gap-6 bg-surface p-4 sm:p-6 lg:col-span-7">
            <div ref={stageRef} className="flex items-center justify-center py-4" style={{ backgroundColor: STAGE }}>
              <svg viewBox="0 0 300 300" role="img" aria-label={`${from.label} morphing into ${to.label}`} className="h-[min(72vw,280px)] w-[min(72vw,280px)]">
                <path d={from.d} fill="none" stroke="none" strokeWidth="2" strokeDasharray="5 7" />
                <path d={to.d} fill="none" stroke="none" strokeWidth="2" strokeDasharray="5 7" />
                <path d={shapeD} fill={ACTION} />
              </svg>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                aria-pressed={playing}
                className="h-11 w-24 shrink-0 bg-raised text-sm font-medium text-content hover:bg-line/40"
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              <label className="flex flex-1 items-center gap-4">
                <span className="sr-only">Morph progress</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progress * 100)}
                  onChange={(event) => {
                    setPlaying(false);
                    setProgress(Number(event.target.value) / 100);
                  }}
                  className="h-11 w-full accent-[rgb(var(--color-action))]"
                />
                <output className="w-12 text-right text-sm tabular-nums text-content">{Math.round(progress * 100)}%</output>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Segmented label="From" value={fromId} options={shapeOptions} onChange={setFromId} />
              <Segmented label="To" value={toId} options={shapeOptions} onChange={setToId} />
              <Segmented label="Easing" value={easing} options={EASINGS} onChange={setEasing} />
            </div>
          </div>

          <CodeSnippet label="SMIL for this morph" code={snippet} className="bg-surface p-4 sm:p-6 lg:col-span-5" />
        </div>
      </div>
    </section>
  );
};
