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
import { extractPointsFromSVGData, scalePointsToFit } from '../utils/pointExtraction';
import { Settings, Zap, Eye, Download, Play, Code, Box } from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'upload' | 'match' | 'animate' | 'export' | 'react' | '3d'>('upload');
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

  const getTabClassName = (tab: string, isActive: boolean, canAccess: boolean) => {
    const baseClass = "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ";
    
    if (!canAccess) {
      return baseClass + "text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-100 dark:bg-gray-700";
    }
    
    if (isActive) {
      return baseClass + "bg-accent text-white shadow-md";
    }
    
    return baseClass + "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent cursor-pointer";
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg"></div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">SVG Morph Studio</h1>
              <span className="px-2 py-1 text-xs bg-accent/10 text-accent rounded-full font-medium">
                Phase 2
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  showAdvanced 
                    ? 'bg-accent/10 text-accent border border-accent/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-accent'
                }`}
              >
                <Settings size={16} />
                Advanced
              </button>
              
              {canProceedToMatching && (
                <button
                  onClick={handleQuickAutoMatch}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Zap size={16} />
                  Quick Match
                </button>
              )}
            </div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Advanced SVG morphing with intelligent node matching and professional export options
          </p>
        </div>

        {/* Progress Indicator */}
        {processingState.isProcessing && (
          <div className="mb-6">
            <ProcessingIndicator />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={getTabClassName('upload', activeTab === 'upload', true)}
            >
              <Eye size={16} />
              1. Upload & Preview
            </button>
            
            <button
              onClick={() => canProceedToMatching && setActiveTab('match')}
              className={getTabClassName('match', activeTab === 'match', canProceedToMatching)}
            >
              <Settings size={16} />
              2. Node Matching
            </button>
            
            <button
              onClick={() => canProceedToAnimation && setActiveTab('animate')}
              className={getTabClassName('animate', activeTab === 'animate', canProceedToAnimation)}
            >
              <Play size={16} />
              3. Animation
            </button>
            
            <button
              onClick={() => canExport && setActiveTab('export')}
              className={getTabClassName('export', activeTab === 'export', canExport)}
            >
              <Download size={16} />
              4. Export
            </button>
            
            <button
              onClick={() => canExport && setActiveTab('react')}
              className={getTabClassName('react', activeTab === 'react', canExport)}
            >
              <Code size={16} />
              5. React Components
            </button>
            
            <button
              onClick={() => canExport && setActiveTab('3d')}
              className={getTabClassName('3d', activeTab === '3d', canExport)}
            >
              <Box size={16} />
              6. 3D Preview
            </button>

            <div className="ml-auto">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={manualModeEnabled}
                  onChange={toggleManualMode}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                />
                Manual Mode
              </label>
            </div>
          </div>
        </div>
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upload Your SVG Files</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Start by uploading your source and target SVG files to create morphing animations
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Source SVG</h3>
                <FileUploadZone
                  onUpload={async (_, content) => {
                    await setSourceSVG(content);
                  }}
                  label="Drop your source SVG here"
                  hasFile={!!sourceSVG}
                />
                {sourceSVG && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Source Preview</h4>
                      <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                        <div 
                          className="max-w-full max-h-full"
                          dangerouslySetInnerHTML={{ __html: sourceSVG }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Target SVG</h3>
                <FileUploadZone
                  onUpload={async (_, content) => {
                    await setTargetSVG(content);
                  }}
                  label="Drop your target SVG here"
                  hasFile={!!targetSVG}
                />
                {targetSVG && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Target Preview</h4>
                      <div className="w-full h-48 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                        <div 
                          className="max-w-full max-h-full"
                          dangerouslySetInnerHTML={{ __html: targetSVG }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {canProceedToMatching && (
              <div className="text-center">
                <button
                  onClick={() => setActiveTab('match')}
                  className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Proceed to Node Matching →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'match' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Node Matching</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure how nodes between your SVGs are paired for smooth morphing
              </p>
            </div>

            <NodePairingInterface
              sourcePoints={sourcePoints}
              targetPoints={targetPoints}
            />

            {canProceedToAnimation && (
              <div className="text-center">
                <button
                  onClick={() => setActiveTab('animate')}
                  className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Proceed to Animation →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'animate' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Animation Controls</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Fine-tune your morphing animation settings and preview the result
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Animation Preview</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewMode('split')}
                        className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                          viewMode === 'split'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Split
                      </button>
                      <button
                        onClick={() => setViewMode('overlay')}
                        className={`px-3 py-1 text-sm rounded-lg transition-all duration-200 ${
                          viewMode === 'overlay'
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
              <div className="text-center">
                <button
                  onClick={() => setActiveTab('export')}
                  className="px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Proceed to Export →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Export Your Animation</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Export your morphing animation in multiple formats with advanced options
              </p>
            </div>

            <EnhancedExportPanel />
          </div>
        )}

        {activeTab === 'react' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">React Component Generator</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Export your morphing animation as ready-to-use React components with TypeScript support
              </p>
            </div>

            <ReactComponentExportPanel 
              sourceSVG={sourceSVGData}
              targetSVG={targetSVGData}
            />
          </div>
        )}

        {activeTab === '3d' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">3D Morphing Preview</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Visualize your morphing animation in 3D space with depth, lighting, and interactive controls
              </p>
            </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Settings</h3>
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Processing Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" defaultChecked />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Use Web Workers for processing</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" defaultChecked />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Enable progress callbacks</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Matching Algorithm</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Use Thin-Plate Spline optimization</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" defaultChecked />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Balance matching for better results</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Export Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" defaultChecked />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Optimize SVG output</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-gray-300 text-accent focus:ring-accent" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Include metadata in exports</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowAdvanced(false)}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-medium transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
