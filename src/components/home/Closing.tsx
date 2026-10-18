import React from 'react';
import { Link } from 'react-router-dom';

export const Closing: React.FC = () => (
  <>
    <section aria-labelledby="cta-title" className="bg-sun-800 px-4 py-16 text-content sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1600px]">
        <h2
          id="cta-title"
          data-reveal
          className="text-[clamp(2.5rem,7vw,6.5rem)] font-light leading-[1] tracking-[-0.035em]"
        >
          <span className="block">Drop two SVGs.</span>
          <span className="block">Get the animation.</span>
        </h2>
        <div data-reveal style={{ '--i': 1 } as React.CSSProperties} className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link
            to="/playground-enhanced"
            className="press inline-flex h-14 items-center bg-action px-8 text-lg font-semibold text-on-action hover:bg-sun-300"
          >
            Open the studio
          </Link>
          <Link
            to="/playground"
            className="inline-flex h-11 items-center text-lg font-medium underline decoration-action decoration-2 underline-offset-8 hover:no-underline"
          >
            or start in the playground
          </Link>
        </div>
        <p className="mt-6 max-w-[48ch] text-base">No account and no upload: your files stay in this browser.</p>
      </div>
    </section>

    <footer className="px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:pt-24">
      <div className="mx-auto grid max-w-[1600px] gap-2 text-sm lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <p className="text-muted">SVG morphing studio</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 lg:justify-center">
          <Link to="/playground" className="inline-flex h-11 items-center text-content hover:text-link">
            Playground
          </Link>
          <Link to="/playground-enhanced" className="inline-flex h-11 items-center text-content hover:text-link">
            Studio
          </Link>
          <Link to="/about" className="inline-flex h-11 items-center text-content hover:text-link">
            About
          </Link>
        </nav>
        <p className="text-muted lg:text-right">&copy; {new Date().getFullYear()} SVG Morph</p>
      </div>
    </footer>
  </>
);
