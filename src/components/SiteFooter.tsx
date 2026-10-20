import React from 'react';
import { Link } from 'react-router-dom';

export const SiteFooter: React.FC = () => (
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
);
