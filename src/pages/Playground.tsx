import React, { useState, useCallback } from 'react';
import { FileUploadZone } from '../components/FileUploadZone';
import { SVGPreview } from '../components/SVGPreview';
import { AnimationControls } from '../components/AnimationControls';
import { ExportPanel } from '../components/ExportPanel';
import { ContourPlanPanel } from '../components/ContourPlanPanel';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
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

  const handleSourceUpload = useCallback(async (file: File, content: string) => {
    await setSourceSVG(content);
  }, [setSourceSVG]);

  const handleTargetUpload = useCallback(async (file: File, content: string) => {
    await setTargetSVG(content);
  }, [setTargetSVG]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em]">
            SVG Morph Playground
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg text-muted">
            Upload your SVGs, customize the animation, and create stunning morphing effects
          </p>
        </header>

        {/* One column on small screens (upload, preview, controls, export); on large screens the
            preview spans the right two columns and stays in view while the left column scrolls. */}
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <Panel title="Upload SVGs" className="lg:col-start-1">
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
          </Panel>

          <div className="lg:sticky lg:top-24 lg:col-span-2 lg:col-start-2 lg:row-span-3 lg:row-start-1">
            <Panel
              title="Preview"
              actions={
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'split' ? 'primary' : 'secondary'}
                    aria-pressed={viewMode === 'split'}
                    onClick={() => setViewMode('split')}
                  >
                    Split View
                  </Button>
                  <Button
                    variant={viewMode === 'overlay' ? 'primary' : 'secondary'}
                    aria-pressed={viewMode === 'overlay'}
                    onClick={() => setViewMode('overlay')}
                  >
                    Overlay
                  </Button>
                </div>
              }
            >
              <SVGPreview
                sourceSVG={sourceSVG}
                targetSVG={targetSVG}
                viewMode={viewMode}
                currentProgress={currentProgress}
                animationSettings={animationSettings}
              />
            </Panel>
          </div>

          {/* Animation Controls */}
          <div className="lg:col-start-1">
            <AnimationControls
              settings={animationSettings}
              onUpdateSettings={updateAnimationSettings}
              isAnimating={isAnimating}
              onStart={startAnimation}
              onPause={pauseAnimation}
              onReset={resetAnimation}
            />
          </div>

          {/* Export Panel */}
          <div className="lg:col-start-1">
            <ExportPanel
              canExport={!!(sourceSVG && targetSVG)}
              animationSettings={animationSettings}
            />
          </div>
        </div>

        {/* Contour plan: what each outline does during the animation (renders nothing until both SVGs are loaded) */}
        <div className="mt-8">
          <ContourPlanPanel />
        </div>
      </div>
    </div>
  );
};
