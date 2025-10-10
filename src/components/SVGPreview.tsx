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
      sourceContainer.className = 'bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-center';
      sourceContainer.innerHTML = `
        <div class="text-center">
          <div class="w-48 h-48 mx-auto mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              ${sourceSVG}
            </div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Source SVG</p>
        </div>
      `;

      const targetContainer = document.createElement('div');
      targetContainer.className = 'bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-center justify-center';
      targetContainer.innerHTML = `
        <div class="text-center">
          <div class="w-48 h-48 mx-auto mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
            <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
              ${targetSVG}
            </div>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Target SVG</p>
        </div>
      `;

      container.appendChild(sourceContainer);
      container.appendChild(targetContainer);
      canvas.appendChild(container);
    } else {
      // Overlay view - show morphing animation
      const container = document.createElement('div');
      container.className = 'h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg';

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
        <div class="w-64 h-64 mx-auto mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${displaySVG}
          </div>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Morphing Animation (${Math.round(currentProgress * 100)}%)
        </p>
        <div class="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 mx-auto">
          <div 
            class="h-full bg-gradient-to-r from-accent to-secondary rounded-full transition-all duration-100"
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
      <div className="h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-accent to-secondary rounded-full opacity-20"></div>
          <p className="text-gray-500 dark:text-gray-400">
            Upload SVG files to see the preview
          </p>
        </div>
      </div>
    );
  }

  return <div ref={canvasRef} className="h-96" />;
};