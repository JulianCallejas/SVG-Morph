import React, { useState, useEffect } from 'react';
import { useMorphStore } from '../store/morphStore';
import { FileUploadZone } from '../components/FileUploadZone';
import { SVGPreview } from '../components/SVGPreview';
import { AnimationControls } from '../components/AnimationControls';
import { NodePairingInterface } from '../components/NodePairingInterface';
import { EnhancedExportPanel } from '../components/EnhancedExportPanel';
import { ReactComponentExportPanel } from '../components/ReactComponentExportPanel';
import { ThreeDMorphingPanel } from '../components/ThreeDMorphingPanel';
import { ProcessingIndicator } from '../components/ProcessingIndicator';
import { Button } from '../components/ui/Button';
import { CheckRow } from '../components/ui/Fields';
import { Panel } from '../components/ui/Panel';
import { extractPointsFromSVGData, scalePointsToFit } from '../utils/pointExtraction';
import { Settings, Zap, Eye, Download, Play, Code, Box, X } from 'lucide-react';
import { sanitizeSVG } from '../utils/sanitizeSVG';

type StudioTab = 'upload' | 'match' | 'animate' | 'export' | 'react' | '3d';

// The heading of one step: left aligned, with a muted line under it.
const StepHeader: React.FC<{ title: string; text: string; children?: React.ReactNode }> = ({ title, text, children }) => (
  <div>
    <h2 className="text-2xl font-medium">{title}</h2>
    <p className="mt-2 max-w-[70ch] text-muted">{text}</p>
    {children}
  </div>
);

export const PlaygroundEnhanced: React.FC = () => {
  const {
    sourceSVG,
    targetSVG,
    sourceSVGData,
    targetSVGData,
    processingState,
    manualModeEnabled,
    toggleManualMode,
    sourcePoints,
    targetPoints,
    nodeMatches,
    setSourcePoints,
    setTargetPoints,
    autoMatchNodes,
    setSourceSVG,
    setTargetSVG,
    animationSettings,
    updateAnimationSettings,
    isAnimating,
    currentProgress,
    startAnimation,
    pauseAnimation,
    resetAnimation,
  } = useMorphStore();

  const [activeTab, setActiveTab] = useState<StudioTab>('upload');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('overlay');

  // Extract points from SVG data when available
  useEffect(() => {
    if (sourceSVGData?.paths) {
      try {
        const extractedPoints = extractPointsFromSVGData(sourceSVGData, {
          pointsPerPath: 30,
          normalizeCoordinates: true,
        });

        // Scale points to fit in the visualization area (300x400)
        const scaledPoints = scalePointsToFit(extractedPoints, 300, 400, 20);
        setSourcePoints(scaledPoints);
      } catch (error) {
        console.error('Failed to extract source points:', error);
        setSourcePoints([]);
      }
    }
  }, [sourceSVGData, setSourcePoints]);

  useEffect(() => {
    if (targetSVGData?.paths) {
      try {
        const extractedPoints = extractPointsFromSVGData(targetSVGData, {
          pointsPerPath: 30,
          normalizeCoordinates: true,
        });

        // Scale points to fit in the visualization area (300x400)
        const scaledPoints = scalePointsToFit(extractedPoints, 300, 400, 20);
        setTargetPoints(scaledPoints);
      } catch (error) {
        console.error('Failed to extract target points:', error);
        setTargetPoints([]);
      }
    }
  }, [targetSVGData, setTargetPoints]);

  const canProceedToMatching = sourceSVG && targetSVG && !processingState.isProcessing;
  const canProceedToAnimation = canProceedToMatching && (sourcePoints.length > 0 || targetPoints.length > 0);
  const canExport = canProceedToAnimation;

  const handleQuickAutoMatch = () => {
    autoMatchNodes();
    setActiveTab('animate');
  };

  const getTabClassName = (isActive: boolean, canAccess: boolean) => {
    const baseClass = "inline-flex h-11 items-center gap-2 px-4 font-medium transition-colors duration-150 ";

    if (!canAccess) {
      return baseClass + "cursor-not-allowed bg-surface text-muted";
    }

    if (isActive) {
      return baseClass + "bg-action text-on-action";
    }

    return baseClass + "cursor-pointer bg-raised text-content hover:bg-line/40";
  };

  const tabs: { id: StudioTab; label: string; icon: React.ReactNode; canAccess: boolean }[] = [
    { id: 'upload', label: 'Upload & Preview', icon: <Eye size={16} />, canAccess: true },
    { id: 'match', label: 'Node Matching', icon: <Settings size={16} />, canAccess: !!canProceedToMatching },
    { id: 'animate', label: 'Animation', icon: <Play size={16} />, canAccess: !!canProceedToAnimation },
    { id: 'export', label: 'Export', icon: <Download size={16} />, canAccess: !!canExport },
    { id: 'react', label: 'React Components', icon: <Code size={16} />, canAccess: !!canExport },
    { id: '3d', label: '3D Preview', icon: <Box size={16} />, canAccess: !!canExport },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em]">
              SVG Morph Studio
            </h1>

            <div className="flex items-center gap-3">
              <Button
                variant={showAdvanced ? 'primary' : 'secondary'}
                aria-pressed={showAdvanced}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings size={16} />
                Advanced
              </Button>

              {canProceedToMatching && (
                <Button variant="primary" onClick={handleQuickAutoMatch}>
                  <Zap size={16} />
                  Quick Match
                </Button>
              )}
            </div>
          </div>
          <p className="mt-4 max-w-[70ch] text-lg text-muted">
            Advanced SVG morphing with intelligent node matching and professional export options
          </p>
        </header>

        {/* Progress Indicator */}
        {processingState.isProcessing && (
          <div className="mb-6">
            <ProcessingIndicator />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-10 bg-surface p-4 sm:p-6">
          <div role="tablist" aria-label="Studio steps" className="flex flex-wrap items-center gap-2">
            {tabs.map(({ id, label, icon, canAccess }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                aria-disabled={!canAccess}
                onClick={() => canAccess && setActiveTab(id)}
                className={getTabClassName(activeTab === id, canAccess)}
              >
                {icon}
                {label}
              </button>
            ))}

            <div className="ml-auto">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={manualModeEnabled}
                  onChange={toggleManualMode}
                  className="h-5 w-5 accent-[rgb(var(--color-action))]"
                />
                Manual Mode
              </label>
            </div>
          </div>
        </div>

        {activeTab === 'upload' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Upload Your SVG Files"
              text="Start by uploading your source and target SVG files to create morphing animations"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Source SVG</h3>
                <FileUploadZone
                  onUpload={async (_, content) => {
                    await setSourceSVG(content);
                  }}
                  label="Drop your source SVG here"
                  hasFile={!!sourceSVG}
                />
                {sourceSVG && (
                  <Panel>
                    <h4 className="mb-3 text-sm font-medium text-muted">Source Preview</h4>
                    <div className="flex h-48 w-full items-center justify-center overflow-hidden bg-canvas">
                      <div
                        className="max-w-full max-h-full"
                        dangerouslySetInnerHTML={{ __html: sanitizeSVG(sourceSVG) }}
                      />
                    </div>
                  </Panel>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Target SVG</h3>
                <FileUploadZone
                  onUpload={async (_, content) => {
                    await setTargetSVG(content);
                  }}
                  label="Drop your target SVG here"
                  hasFile={!!targetSVG}
                />
                {targetSVG && (
                  <Panel>
                    <h4 className="mb-3 text-sm font-medium text-muted">Target Preview</h4>
                    <div className="flex h-48 w-full items-center justify-center overflow-hidden bg-canvas">
                      <div
                        className="max-w-full max-h-full"
                        dangerouslySetInnerHTML={{ __html: sanitizeSVG(targetSVG) }}
                      />
                    </div>
                  </Panel>
                )}
              </div>
            </div>

            {canProceedToMatching && (
              <Button variant="primary" onClick={() => setActiveTab('match')}>
                Proceed to Node Matching →
              </Button>
            )}
          </div>
        )}

        {activeTab === 'match' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Node Matching"
              text="Configure how nodes between your SVGs are paired for smooth morphing"
            />

            <NodePairingInterface
              sourcePoints={sourcePoints}
              targetPoints={targetPoints}
            />

            {canProceedToAnimation && (
              <Button variant="primary" onClick={() => setActiveTab('animate')}>
                Proceed to Animation →
              </Button>
            )}
          </div>
        )}

        {activeTab === 'animate' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Tune Your Animation"
              text="Fine-tune your morphing animation settings and preview the result"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
              <div className="lg:col-span-2">
                <Panel
                  title="Animation Preview"
                  actions={
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'split' ? 'primary' : 'secondary'}
                        aria-pressed={viewMode === 'split'}
                        onClick={() => setViewMode('split')}
                      >
                        Split
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

              <div>
                <AnimationControls
                  settings={animationSettings}
                  onUpdateSettings={updateAnimationSettings}
                  isAnimating={isAnimating}
                  onStart={startAnimation}
                  onPause={pauseAnimation}
                  onReset={resetAnimation}
                />
              </div>
            </div>

            {canExport && (
              <Button variant="primary" onClick={() => setActiveTab('export')}>
                Proceed to Export →
              </Button>
            )}
          </div>
        )}
        {activeTab === 'export' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Export Your Animation"
              text="Export your morphing animation in multiple formats with advanced options"
            >
              {manualModeEnabled && nodeMatches.length > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-action motion-safe:animate-pulse" />
                  Using Manual Node Matching ({nodeMatches.length} pairs)
                </p>
              )}
              {manualModeEnabled && nodeMatches.length === 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold-400" />
                  Manual Mode Enabled (No pairs created yet)
                </p>
              )}
            </StepHeader>

            <EnhancedExportPanel />
          </div>
        )}
        {activeTab === 'react' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Export to React"
              text="Export your morphing animation as ready-to-use React components with TypeScript support"
            />

            <ReactComponentExportPanel
              sourceSVG={sourceSVGData}
              targetSVG={targetSVGData}
            />
          </div>
        )}

        {activeTab === '3d' && (
          <div role="tabpanel" className="space-y-8">
            <StepHeader
              title="Preview in 3D"
              text="Visualize your morphing animation in 3D space with depth, lighting, and interactive controls"
            />

            <ThreeDMorphingPanel
              sourceSVG={sourceSVGData}
              targetSVG={targetSVGData}
              morphProgress={currentProgress}
            />
          </div>
        )}
      </div>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="advanced-settings-title"
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 id="advanced-settings-title" className="text-xl font-medium">Advanced Settings</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowAdvanced(false)} aria-label="Close advanced settings">
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Processing Options</h4>
                  <div className="space-y-2">
                    <CheckRow label="Use Web Workers for processing" defaultChecked />
                    <CheckRow label="Enable progress callbacks" defaultChecked />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Matching Algorithm</h4>
                  <div className="space-y-2">
                    <CheckRow label="Use Thin-Plate Spline optimization" />
                    <CheckRow label="Balance matching for better results" defaultChecked />
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Export Settings</h4>
                  <div className="space-y-2">
                    <CheckRow label="Optimize SVG output" defaultChecked />
                    <CheckRow label="Include metadata in exports" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowAdvanced(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setShowAdvanced(false)}>
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
