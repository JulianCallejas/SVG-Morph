import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMorphStore } from '../store/morphStore';
import { sanitizeSVG } from '../utils/sanitizeSVG';
import { fitSVGs } from '../utils/fitSVG';
import { CheckRow } from './ui/Fields';
import { ContourOverlay } from './ContourOverlay';

interface SVGPreviewProps {
  sourceSVG: string | null;
  targetSVG: string | null;
  viewMode: 'split' | 'overlay';
  currentProgress: number;
  animationSettings: { duration: number; easing: string; };
}

// The viewBox of the drawing a cell shows (fitSVGs gave it one when the file had none), so the
// contour boxes drawn over it are framed exactly like it.
const shownViewBox = (cell: HTMLElement): string | null =>
  cell.querySelector('div > svg')?.getAttribute('viewBox') ?? null;

export const SVGPreview: React.FC<SVGPreviewProps> = ({
  sourceSVG,
  targetSVG,
  viewMode,
  currentProgress,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { interpolatedSVG, contourPlan, showContourBoxes, setShowContourBoxes } = useMorphStore();
  // The two boxes of the split view that hold the drawings: the contour boxes are drawn inside them
  const [hosts, setHosts] = useState<{ source: HTMLElement | null; target: HTMLElement | null }>({
    source: null,
    target: null,
  });

  // Split view: both SVGs side by side. It does not depend on the progress, so it is built once and
  // the contour boxes over it are not torn down on every frame.
  useEffect(() => {
    if (viewMode !== 'split') {
      setHosts({ source: null, target: null });
      return;
    }
    if (!canvasRef.current || !sourceSVG || !targetSVG) return;

    const canvas = canvasRef.current;
    canvas.innerHTML = '';

    // The files are untrusted: only sanitized markup reaches innerHTML below.
    const safeSource = sanitizeSVG(sourceSVG);
    const safeTarget = sanitizeSVG(targetSVG);

    const container = document.createElement('div');
    container.className = 'grid grid-cols-2 gap-4 h-full';

    const sourceContainer = document.createElement('div');
    sourceContainer.className = 'bg-canvas p-4 flex items-center justify-center';
    sourceContainer.innerHTML = `
      <div class="text-center">
        <div data-preview-cell="source" class="relative w-full max-w-48 aspect-square mx-auto mb-2 bg-surface flex items-center justify-center overflow-hidden">
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
        <div data-preview-cell="target" class="relative w-full max-w-48 aspect-square mx-auto mb-2 bg-surface flex items-center justify-center overflow-hidden">
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

    fitSVGs(canvas);
    setHosts({
      source: canvas.querySelector<HTMLElement>('[data-preview-cell="source"]'),
      target: canvas.querySelector<HTMLElement>('[data-preview-cell="target"]'),
    });
  }, [sourceSVG, targetSVG, viewMode]);

  // Overlay view: the morphing animation, redrawn as the progress moves
  useEffect(() => {
    if (viewMode === 'split') return;
    if (!canvasRef.current || !sourceSVG || !targetSVG) return;

    const canvas = canvasRef.current;
    canvas.innerHTML = '';

    const safeSource = sanitizeSVG(sourceSVG);
    const safeTarget = sanitizeSVG(targetSVG);
    const safeInterpolated = interpolatedSVG ? sanitizeSVG(interpolatedSVG) : '';

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

  // The contour boxes belong to the split view: the overlay mode shows the morph, where the boxes
  // of the source and the target would not line up with the moving shape.
  const showBoxes = viewMode === 'split' && !!contourPlan;

  return (
    <>
      <div ref={canvasRef} className="h-96" />
      {showBoxes && (
        <div className="mt-3 max-w-xs">
          <CheckRow
            label="Show contour boxes"
            checked={showContourBoxes}
            onChange={(event) => setShowContourBoxes(event.target.checked)}
          />
        </div>
      )}
      {showBoxes && showContourBoxes && hosts.source && createPortal(
        <ContourOverlay side="source" viewBox={shownViewBox(hosts.source)} />,
        hosts.source,
      )}
      {showBoxes && showContourBoxes && hosts.target && createPortal(
        <ContourOverlay side="target" viewBox={shownViewBox(hosts.target)} />,
        hosts.target,
      )}
    </>
  );
};
