import React, { useEffect, useRef } from 'react';
import { useMorphStore } from '../store/morphStore';
import { sanitizeSVG } from '../utils/sanitizeSVG';

interface SVGPreviewProps {
  sourceSVG: string | null;
  targetSVG: string | null;
  viewMode: 'split' | 'overlay';
  currentProgress: number;
  animationSettings: { duration: number; easing: string; };
}

// Makes every injected SVG fit whole inside its box (scaled to the width or the height, whichever
// is tighter), whatever size its own attributes ask for. Without a viewBox the size attributes
// become one, so the drawing can scale at all.
const fitSVGs = (root: HTMLElement) => {
  root.querySelectorAll('svg').forEach((svg) => {
    if (!svg.hasAttribute('viewBox')) {
      const width = svg.getAttribute('width') ?? '';
      const height = svg.getAttribute('height') ?? '';
      if (!width.includes('%') && !height.includes('%') && parseFloat(width) > 0 && parseFloat(height) > 0) {
        svg.setAttribute('viewBox', `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
      }
    }
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.style.width = '100%';
    svg.style.height = '100%';
  });
};

export const SVGPreview: React.FC<SVGPreviewProps> = ({
  sourceSVG,
  targetSVG,
  viewMode,
  currentProgress,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { interpolatedSVG } = useMorphStore();

  useEffect(() => {
    if (!canvasRef.current || !sourceSVG || !targetSVG) return;

    const canvas = canvasRef.current;
    canvas.innerHTML = '';

    // The files are untrusted: only sanitized markup reaches innerHTML below.
    const safeSource = sanitizeSVG(sourceSVG);
    const safeTarget = sanitizeSVG(targetSVG);
    const safeInterpolated = interpolatedSVG ? sanitizeSVG(interpolatedSVG) : '';

    if (viewMode === 'split') {
      // Split view - show both SVGs side by side
      const container = document.createElement('div');
      container.className = 'grid grid-cols-2 gap-4 h-full';

      const sourceContainer = document.createElement('div');
      sourceContainer.className = 'bg-canvas p-4 flex items-center justify-center';
      sourceContainer.innerHTML = `
        <div class="text-center">
          <div class="w-full max-w-48 aspect-square mx-auto mb-2 bg-surface flex items-center justify-center overflow-hidden">
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              ${safeSource}
            </div>
          </div>
          <p class="text-sm text-muted">Source SVG</p>
        </div>
      `;

      const targetContainer = document.createElement('div');
      targetContainer.className = 'bg-canvas p-4 flex items-center justify-center';
      targetContainer.innerHTML = `
        <div class="text-center">
          <div class="w-full max-w-48 aspect-square mx-auto mb-2 bg-surface flex items-center justify-center overflow-hidden">
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              ${safeTarget}
            </div>
          </div>
          <p class="text-sm text-muted">Target SVG</p>
        </div>
      `;

      container.appendChild(sourceContainer);
      container.appendChild(targetContainer);
      canvas.appendChild(container);
    } else {
      // Overlay view - show morphing animation
      const container = document.createElement('div');
      container.className = 'h-full flex items-center justify-center bg-canvas';

      const morphContainer = document.createElement('div');
      morphContainer.className = 'text-center';
      
      // Use interpolated SVG from Web Worker or fallback
      const displaySVG = safeInterpolated || `
        <div style="position: relative; width: 100%; height: 100%;">
          <div style="position: absolute; inset: 0; opacity: ${1 - currentProgress};">
            ${safeSource}
          </div>
          <div style="position: absolute; inset: 0; opacity: ${currentProgress};">
            ${safeTarget}
          </div>
        </div>
      `;
      
      morphContainer.innerHTML = `
        <div class="w-full max-w-64 aspect-square mx-auto mb-4 bg-surface flex items-center justify-center overflow-hidden">
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${displaySVG}
          </div>
        </div>
        <p class="text-sm text-muted">
          Morphing Animation (${Math.round(currentProgress * 100)}%)
        </p>
        <div class="w-full max-w-64 h-2 bg-raised mt-2 mx-auto">
          <div 
            class="h-full bg-action transition-all duration-100"
            style="width: ${currentProgress * 100}%"
          ></div>
        </div>
      `;

      container.appendChild(morphContainer);
      canvas.appendChild(container);
    }

    fitSVGs(canvas);
  }, [sourceSVG, targetSVG, viewMode, currentProgress, interpolatedSVG]);

  if (!sourceSVG && !targetSVG) {
    return (
      <div className="h-96 flex items-center justify-center bg-canvas border-2 border-dashed border-line">
        <div className="text-center">
          <p className="text-muted">
            Upload SVG files to see the preview
          </p>
        </div>
      </div>
    );
  }

  return <div ref={canvasRef} className="h-96" />;
};