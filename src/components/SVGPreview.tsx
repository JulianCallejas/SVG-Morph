import React, { useEffect, useRef } from 'react';
import { useMorphStore } from '../store/morphStore';

interface SVGPreviewProps {
  sourceSVG: string | null;
  targetSVG: string | null;
  viewMode: 'split' | 'overlay';
  currentProgress: number;
  animationSettings: { duration: number; easing: string; };
}

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
              ${sourceSVG}
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
              ${targetSVG}
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
      const displaySVG = interpolatedSVG || `
        <div style="position: relative; width: 100%; height: 100%;">
          <div style="position: absolute; opacity: ${1 - currentProgress};">
            ${sourceSVG}
          </div>
          <div style="position: absolute; opacity: ${currentProgress};">
            ${targetSVG}
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