import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';

interface ToolLink {
  path: string;
  label: string;
  note: string;
}

const TOOLS: ToolLink[] = [
  { path: '/playground-enhanced', label: 'Studio', note: 'Node matching, controls and every export in one flow' },
  { path: '/multi-stage', label: 'Multi-stage', note: 'Chain several SVGs, A to B to C to D' },
  { path: '/3d-morphing', label: '3D Studio', note: 'Extrude the morph and export OBJ, STL, PLY or GLTF' },
  { path: '/reverse-engineering', label: 'Reverse engineering', note: 'Read the parameters of an animated SVG' },
];

const linkClass = (active: boolean): string =>
  `inline-flex h-11 items-center font-medium underline-offset-8 decoration-2 hover:text-link ${
    active ? 'text-content underline decoration-action' : 'text-muted hover:text-content'
  }`;

export const Navigation: React.FC = () => {
  const { pathname } = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsButtonRef = useRef<HTMLButtonElement>(null);

  const toolsActive = TOOLS.some((tool) => tool.path === pathname);

  useEffect(() => {
    setToolsOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolsOpen && !menuOpen) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setToolsOpen(false);
      setMenuOpen(false);
      toolsButtonRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [toolsOpen, menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-canvas">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight text-content">
          SVG Morph
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/playground" className={linkClass(pathname === '/playground')}>
            Playground
          </Link>

          <div ref={toolsRef} className="relative">
            <button
              ref={toolsButtonRef}
              type="button"
              aria-expanded={toolsOpen}
              aria-controls="tools-menu"
              onClick={() => setToolsOpen((open) => !open)}
              className={`${linkClass(toolsActive)} gap-1`}
            >
              Tools
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {toolsOpen && (
              <ul id="tools-menu" className="absolute left-1/2 top-full mt-2 w-80 -translate-x-1/2 bg-raised p-2">
                {TOOLS.map((tool) => (
                  <li key={tool.path}>
                    <Link
                      to={tool.path}
                      aria-current={pathname === tool.path ? 'page' : undefined}
                      className="block px-4 py-3 hover:bg-surface"
                    >
                      <span className="block font-medium text-content">{tool.label}</span>
                      <span className="block text-sm text-muted">{tool.note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/about" className={linkClass(pathname === '/about')}>
            About
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/playground-enhanced"
            className="press hidden h-11 items-center bg-action px-5 font-semibold text-on-action hover:bg-sun-300 md:inline-flex"
          >
            Open the studio
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center text-content md:hidden"
          >
            {menuOpen ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className="bg-surface px-4 pb-6 pt-2 md:hidden">
          <Link to="/playground" className="flex h-12 items-center text-lg font-medium text-content">
            Playground
          </Link>
          <p className="mt-4 text-sm text-muted">Tools</p>
          {TOOLS.map((tool) => (
            <Link key={tool.path} to={tool.path} className="flex h-12 items-center text-lg font-medium text-content">
              {tool.label}
            </Link>
          ))}
          <Link to="/about" className="mt-4 flex h-12 items-center text-lg font-medium text-content">
            About
          </Link>
          <Link
            to="/playground-enhanced"
            className="mt-4 flex h-12 items-center justify-center bg-action font-semibold text-on-action"
          >
            Open the studio
          </Link>
        </div>
      )}
    </header>
  );
};
