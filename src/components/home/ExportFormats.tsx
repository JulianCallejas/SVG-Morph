import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface ExportFormat {
  name: string;
  note: string;
}

interface ExportGroup {
  id: string;
  label: string;
  formats: ExportFormat[];
}

const GROUPS: ExportGroup[] = [
  {
    id: 'code',
    label: 'Code',
    formats: [
      { name: 'SVG with SMIL', note: 'Self-contained. Keeps running inside an img tag or a CSS background.' },
      { name: 'CSS keyframes', note: 'For inline SVG that should stay in sync with the page.' },
      { name: 'JavaScript', note: 'Vanilla, GSAP or Anime.js.' },
      { name: 'React component', note: 'The morph as a component you drop into your app.' },
    ],
  },
  {
    id: '3d',
    label: '3D',
    formats: [
      { name: 'STL', note: 'For 3D printing.' },
      { name: 'OBJ', note: 'Opens in most 3D tools.' },
      { name: 'PLY', note: 'Mesh data with vertex colors.' },
      { name: 'GLTF', note: 'For the web and game engines.' },
    ],
  },
  {
    id: 'video',
    label: 'Video',
    formats: [
      { name: 'GIF', note: 'Plays anywhere, no player needed.' },
      { name: 'MP4', note: 'Small files for sharing and embedding.' },
      { name: 'WebM', note: 'Web-native video.' },
    ],
  },
];

export const ExportFormats: React.FC = () => {
  const [activeId, setActiveId] = useState(GROUPS[0].id);
  const group = GROUPS.find(({ id }) => id === activeId) ?? GROUPS[0];

  return (
    <section aria-labelledby="export-title" className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2
            id="export-title"
            data-reveal
            className="max-w-[18ch] text-[clamp(2rem,4vw,3.75rem)] font-light leading-[1.05] tracking-[-0.035em]"
          >
            <span className="block text-muted">Export as code,</span>
            <span className="block">3D or video</span>
          </h2>
          <Link
            to="/playground-enhanced"
            data-reveal
            style={{ '--i': 1 } as React.CSSProperties}
            className="press inline-flex h-12 items-center justify-center bg-action px-6 font-semibold text-on-action hover:bg-sun-300"
          >
            Open the studio
          </Link>
        </div>

        <div className="mt-14 flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div role="tablist" aria-label="Export type" className="flex gap-2 lg:w-[150px] lg:shrink-0 lg:flex-col">
            {GROUPS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`export-tab-${id}`}
                aria-selected={id === activeId}
                aria-controls="export-panel"
                onClick={() => setActiveId(id)}
                className={`h-16 flex-1 px-4 text-left text-base font-medium transition-colors duration-150 lg:flex-none ${
                  id === activeId ? 'bg-action text-on-action' : 'bg-surface text-content hover:bg-raised'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <ul
            id="export-panel"
            role="tabpanel"
            aria-labelledby={`export-tab-${group.id}`}
            className="flex flex-1 flex-col gap-1"
          >
            {group.formats.map(({ name, note }, i) => (
              <li
                key={name}
                data-reveal
                style={{ '--i': i } as React.CSSProperties}
                className={`grid gap-1 px-5 py-5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-6 ${
                  i % 2 === 0 ? 'bg-surface' : 'bg-raised'
                }`}
              >
                <span className="text-xl font-medium">{name}</span>
                <span className="text-base text-content">{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
