import React from 'react';

// The real runtime libraries from package.json. No customer logos are invented.
const LIBRARIES = ['svg-path-commander', 'd3-interpolate', 'SVG.js', 'Three.js', 'Web Workers'];

export const BuiltOn: React.FC = () => (
  <section aria-label="Built on" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div
      data-reveal
      className="mx-auto flex max-w-[1600px] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
    >
      <p className="text-lg">Built on</p>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-8 text-[22px] font-light lg:flex lg:flex-1 lg:justify-between lg:pl-16">
        {LIBRARIES.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  </section>
);
