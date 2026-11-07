import React from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../SiteFooter';

export const Closing: React.FC = () => (
  <>
    <section aria-labelledby="cta-title" className="bg-field-sun px-4 py-16 text-content sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-[1600px] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-[1fr_auto] lg:gap-x-16">
        <img
          src="/svg-morph-logo-512.webp"
          alt=""
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="col-start-1 row-start-1 h-16 w-16 sm:h-24 sm:w-24 lg:col-start-2 lg:row-span-2 lg:h-80 lg:w-80"
        />
        <h2
          id="cta-title"
          data-reveal
          className="col-start-2 row-start-1 text-[clamp(1.75rem,7vw,6.5rem)] font-light leading-[1] tracking-[-0.035em] lg:col-start-1"
        >
          <span className="block">Drop two SVGs.</span>
          <span className="block">Get the animation.</span>
        </h2>
        <div className="col-span-2 row-start-2 lg:col-span-1 lg:col-start-1">
          <div data-reveal style={{ '--i': 1 } as React.CSSProperties} className="flex flex-wrap items-center gap-x-8 gap-y-4">
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
      </div>
    </section>

    <SiteFooter />
  </>
);
