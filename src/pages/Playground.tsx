import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileUploadZone } from '../components/FileUploadZone';
import { SVGPreview } from '../components/SVGPreview';
import { AnimationControls } from '../components/AnimationControls';
import { ExportPanel } from '../components/ExportPanel';
import { ContourPlanPanel } from '../components/ContourPlanPanel';
import { IconLibraryButton } from '../components/IconLibraryButton';
import { OutputSizeSelect } from '../components/OutputSizeSelect';
import { UrlImport } from '../components/UrlImport';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { useMorphStore } from '../store/morphStore';
import { studioEntryStep, type StudioLocationState } from '../utils/studioEntry';

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
  const studioStep = studioEntryStep(!!sourceSVG, !!targetSVG);

  const handleSourceUpload = useCallback(async (_file: File, content: string) => {
    await setSourceSVG(content);
  }, [setSourceSVG]);

  const handleTargetUpload = useCallback(async (_file: File, content: string) => {
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

        {/* Way into the Studio: node matching, advanced options and more exports. With both SVGs loaded it
            skips the upload step and opens on node matching. */}
        <Panel className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-medium">Need more control?</h2>
              <p className="mt-1 max-w-[70ch] text-muted">
                The Studio adds manual point matching, advanced matching options and React and 3D export.
                {studioStep === 'match' && ' Your SVGs come with you: it opens on node matching.'}
              </p>
            </div>
            <Link
              to="/playground-enhanced"
              state={{ step: studioStep } satisfies StudioLocationState}
              className="press inline-flex h-11 shrink-0 items-center justify-center bg-action px-5 font-semibold text-on-action hover:bg-sun-300"
            >
              {studioStep === 'match' ? 'Continue in the Studio' : 'Open the Studio'}
            </Link>
          </div>
        </Panel>

        {/* One column on small screens (upload, preview, contours, controls, export); on large screens
            the preview and the contour plan stack in the right two columns beside the controls. */}
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <Panel title="Upload SVGs" className="lg:col-start-1">
            <div className="space-y-4">
              <IconLibraryButton
                onUse={async (side, svg) => {
                  await (side === 'source' ? setSourceSVG(svg) : setTargetSVG(svg));
                }}
              />
              <FileUploadZone
                label="Source SVG"
                onUpload={handleSourceUpload}
                hasFile={!!sourceSVG}
              />
              <UrlImport label="Or import the source from a URL" onImport={setSourceSVG} />
              <FileUploadZone
                label="Target SVG"
                onUpload={handleTargetUpload}
                hasFile={!!targetSVG}
              />
              <UrlImport label="Or import the target from a URL" onImport={setTargetSVG} />
              {sourceSVG && targetSVG && <OutputSizeSelect />}
            </div>
          </Panel>

          <div className="space-y-8 lg:col-span-2 lg:col-start-2 lg:row-span-3 lg:row-start-1">
            {/* Stays in view while the rest of the column scrolls (two-column layout only: on a phone it
                would cover the screen). top-20 clears the 4rem sticky navigation. */}
            <Panel
              title="Preview"
              className="z-10 lg:sticky lg:top-20"
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

            {/* Contour plan: what each outline does during the animation (renders nothing until both SVGs are loaded) */}
            <ContourPlanPanel />
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
      </div>
    </div>
  );
};
