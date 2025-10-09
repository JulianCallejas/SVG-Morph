import React, { useState, useCallback } from 'react';
import { FileUploadZone } from '../components/FileUploadZone';
import { SVGPreview } from '../components/SVGPreview';
import { AnimationControls } from '../components/AnimationControls';
import { ExportPanel } from '../components/ExportPanel';
import { useMorphStore } from '../store/morphStore';

export const Playground: React.FC = () => {
  const {
    sourceSVG,
    targetSVG,
    animationSettings,
    isAnimating,
    currentProgress,
    setSourceSVG,
    setTargetSVG,
    updateAnimationSettings,
    startAnimation,
    pauseAnimation,
    resetAnimation,
  } = useMorphStore();

  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');

  const handleSourceUpload = useCallback((file: File, content: string) => {
    setSourceSVG(content);
  }, [setSourceSVG]);

  const handleTargetUpload = useCallback((file: File, content: string) => {
    setTargetSVG(content);
  }, [setTargetSVG]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            SVG Morph Playground
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Upload your SVGs, customize the animation, and create stunning morphing effects
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - File Upload */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Upload SVGs
              </h2>
              <div className="space-y-4">
                <FileUploadZone
                  label="Source SVG"
                  onUpload={handleSourceUpload}
                  hasFile={!!sourceSVG}
                />
                <FileUploadZone
                  label="Target SVG"
                  onUpload={handleTargetUpload}
                  hasFile={!!targetSVG}
                />
              </div>
            </div>

            {/* Animation Controls */}
            <AnimationControls
              settings={animationSettings}
              onUpdateSettings={updateAnimationSettings}
              isAnimating={isAnimating}
              onStart={startAnimation}
              onPause={pauseAnimation}
              onReset={resetAnimation}
            />

            {/* Export Panel */}
            <ExportPanel
              canExport={!!(sourceSVG && targetSVG)}
              animationSettings={animationSettings}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Preview
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('split')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      viewMode === 'split'
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Split View
                  </button>
                  <button
                    onClick={() => setViewMode('overlay')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      viewMode === 'overlay'
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Overlay
                  </button>
                </div>
              </div>

              <SVGPreview
                sourceSVG={sourceSVG}
                targetSVG={targetSVG}
                viewMode={viewMode}
                currentProgress={currentProgress}
                animationSettings={animationSettings}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};