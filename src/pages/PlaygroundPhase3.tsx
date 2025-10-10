import React, { useState, useEffect } from 'react';
import { useMorphStore } from '../store/morphStore';
import { InteractiveTutorial, useTutorial } from '../components/InteractiveTutorial';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PerformanceMonitor, usePerformanceMonitor } from '../components/PerformanceMonitor';
import { KeyboardShortcuts, useKeyboardShortcuts, createDefaultShortcuts } from '../components/KeyboardShortcuts';
import { EnhancedFileUploadZone } from '../components/EnhancedFileUploadZone';
import { BezierEasingEditor } from '../components/BezierEasingEditor';
import { AnimationPresets } from '../components/AnimationPresets';
import { KeyframeTimeline } from '../components/KeyframeTimeline';
import { RealTimeAdjustment } from '../components/RealTimeAdjustment';
import { RecentFilesHistory } from '../components/RecentFilesHistory';
import { LoadingOverlay } from '../components/LoadingStates';
import { Settings, HelpCircle, Zap, Upload, Download, Play, Pause, RotateCcw, Eye, Monitor } from 'lucide-react';

export const PlaygroundPhase3: React.FC = () => {
  const {
    sourceSVG,
    targetSVG,
    animationSettings,
    isAnimating,
    currentProgress,
    processingState,
    keyframes,
    // showTutorial, // Unused but kept for potential future use
    // showPerformanceMonitor, // Unused but kept for potential future use
    // customEasingCurves, // Unused but kept for potential future use
    setSourceSVG,
    setTargetSVG,
    updateAnimationSettings,
    startAnimation,
    pauseAnimation,
    resetAnimation,
    setProgress,
    setKeyframes,
    // addKeyframe, // Unused but kept for potential future use
    // toggleTutorial, // Unused but kept for potential future use
    // togglePerformanceMonitor, // Unused but kept for potential future use
    toggleRealTimeAdjustment,
    setCustomEasingCurve,
    addRecentFile
  } = useMorphStore();

  const [activeTab, setActiveTab] = useState<'upload' | 'animation' | 'timeline' | 'export'>('upload');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showEasingEditor, setShowEasingEditor] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showRecentFiles, setShowRecentFiles] = useState(false);

  // Tutorial system
  const {
    showTutorial: tutorialVisible,
    startTutorial,
    closeTutorial,
    completeTutorial
  } = useTutorial();

  // Performance monitoring
  const {
    isEnabled: performanceEnabled,
    toggleMonitor: togglePerformanceMonitorLocal
  } = usePerformanceMonitor();

  // Keyboard shortcuts
  const { shortcuts, addShortcut } = useKeyboardShortcuts();

  // Initialize keyboard shortcuts
  useEffect(() => {
    const defaultShortcuts = createDefaultShortcuts({
      uploadSource: () => document.querySelector('[data-tutorial="upload-source"] input')?.click(),
      uploadTarget: () => document.querySelector('[data-tutorial="upload-target"] input')?.click(),
      playAnimation: () => isAnimating ? pauseAnimation() : startAnimation(),
      resetAnimation,
      exportAnimation: () => setActiveTab('export'),
      togglePreview: () => setShowAdvancedSettings(!showAdvancedSettings),
      openSettings: () => setShowAdvancedSettings(true)
    });

    defaultShortcuts.forEach(shortcut => addShortcut(shortcut));
  }, [addShortcut, isAnimating, pauseAnimation, startAnimation, resetAnimation, showAdvancedSettings]);

  // Handle file selection
  const handleFileSelect = (svgContent: string, fileName: string, isTarget = false) => {
    if (isTarget) {
      setTargetSVG(svgContent);
    } else {
      setSourceSVG(svgContent);
    }

    // Add to recent files
    addRecentFile({
      name: fileName,
      svgContent,
      size: new Blob([svgContent]).size,
      tags: ['uploaded'],
      metadata: {
        pathCount: (svgContent.match(/<path/g) || []).length,
        elementCount: (svgContent.match(/<[^/][^>]*>/g) || []).length,
        complexity: 'medium' // This would be calculated properly
      }
    });

    // Auto-advance to animation tab if both files are loaded
    if (sourceSVG && isTarget || targetSVG && !isTarget) {
      setActiveTab('animation');
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset: { settings: unknown; customEasing?: unknown; name: string }) => {
    updateAnimationSettings(preset.settings);
    if (preset.customEasing) {
      setCustomEasingCurve(preset.name, preset.customEasing);
      updateAnimationSettings({ easing: 'custom', customEasing: preset.customEasing });
    }
  };

  // Handle custom easing change
  const handleEasingChange = (curve: unknown) => {
    updateAnimationSettings({ easing: 'custom', customEasing: curve });
    setCustomEasingCurve('custom', curve);
  };

  // Handle keyframe changes
  const handleKeyframesChange = (newKeyframes: unknown[]) => {
    setKeyframes(newKeyframes);
  };

  // Handle real-time parameter changes
  const handleParameterChange = (parameterId: string, value: number) => {
    // Apply parameter changes in real-time
    switch (parameterId) {
      case 'morphIntensity':
        // This would affect the morphing algorithm
        break;
      case 'playbackSpeed':
        updateAnimationSettings({ playbackSpeed: value });
        break;
      // Add more parameter handlers as needed
    }
  };

  const tabs = [
    { id: 'upload', name: 'Upload', icon: Upload, disabled: false },
    { id: 'animation', name: 'Animation', icon: Play, disabled: !sourceSVG || !targetSVG },
    { id: 'timeline', name: 'Timeline', icon: Zap, disabled: !sourceSVG || !targetSVG },
    { id: 'export', name: 'Export', icon: Download, disabled: !sourceSVG || !targetSVG }
  ];

  return (
    <PageErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900">SVG Morph Studio</h1>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Phase 3</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRecentFiles(!showRecentFiles)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Recent Files"
                >
                  <Eye className="w-5 h-5" />
                </button>

                <button
                  onClick={togglePerformanceMonitorLocal}
                  className={`p-2 rounded-lg transition-colors ${
                    performanceEnabled 
                      ? 'bg-green-100 text-green-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Performance Monitor"
                >
                  <Zap className="w-5 h-5" />
                </button>

                <button
                  onClick={startTutorial}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Start Tutorial"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showAdvancedSettings 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Advanced Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Tab Navigation */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                          disabled={tab.disabled}
                          className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : tab.disabled
                                ? 'border-transparent text-gray-400 cursor-not-allowed'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{tab.name}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'upload' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div data-tutorial="upload-source">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source SVG</h3>
                          <EnhancedFileUploadZone
                            onFileSelect={(content, name) => handleFileSelect(content, name, false)}
                            title="Upload Source SVG"
                            description="This will be the starting point of your animation"
                          />
                        </div>

                        <div data-tutorial="upload-target">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Target SVG</h3>
                          <EnhancedFileUploadZone
                            onFileSelect={(content, name) => handleFileSelect(content, name, true)}
                            title="Upload Target SVG"
                            description="This will be the end point of your animation"
                          />
                        </div>
                      </div>

                      {showRecentFiles && (
                        <RecentFilesHistory
                          onFileSelect={(file) => {
                            if (!sourceSVG) {
                              handleFileSelect(file.svgContent, file.name, false);
                            } else {
                              handleFileSelect(file.svgContent, file.name, true);
                            }
                          }}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'animation' && (
                    <div className="space-y-8">
                      {/* Animation Controls */}
                      <div data-tutorial="animation-controls" className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Animation Controls</h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowPresets(!showPresets)}
                              className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              Presets
                            </button>
                            <button
                              onClick={() => setShowEasingEditor(!showEasingEditor)}
                              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              Custom Easing
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <button
                            onClick={isAnimating ? pauseAnimation : startAnimation}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                              isAnimating
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            <span>{isAnimating ? 'Pause' : 'Play'}</span>
                          </button>

                          <button
                            onClick={resetAnimation}
                            className="flex items-center space-x-2 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            <RotateCcw className="w-5 h-5" />
                            <span>Reset</span>
                          </button>

                          <div className="flex-1">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={currentProgress}
                              onChange={(e) => setProgress(parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                              <span>0%</span>
                              <span>{Math.round(currentProgress * 100)}%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Animation Presets */}
                      {showPresets && (
                        <AnimationPresets
                          onPresetSelect={handlePresetSelect}
                          currentSettings={animationSettings}
                        />
                      )}

                      {/* Custom Easing Editor */}
                      {showEasingEditor && (
                        <BezierEasingEditor
                          onCurveChange={handleEasingChange}
                          onPreview={(t) => setProgress(t)}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === 'timeline' && (
                    <div className="space-y-8">
                      <KeyframeTimeline
                        duration={animationSettings.duration}
                        keyframes={keyframes}
                        currentTime={currentProgress}
                        isPlaying={isAnimating}
                        onKeyframesChange={handleKeyframesChange}
                        onTimeChange={setProgress}
                        onPlayPause={isAnimating ? pauseAnimation : startAnimation}
                        onReset={resetAnimation}
                      />
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div data-tutorial="export-panel" className="space-y-8">
                      <div className="text-center py-12 text-gray-500">
                        <Download className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Export Coming Soon</h3>
                        <p>Enhanced export functionality will be integrated here.</p>
                        <p className="text-sm mt-2">This will include the existing export system from Phase 2.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Real-time Adjustment Panel */}
              {realTimeAdjustmentEnabled && (
                <RealTimeAdjustment
                  settings={animationSettings}
                  onSettingsChange={updateAnimationSettings}
                  onParameterChange={handleParameterChange}
                  isPlaying={isAnimating}
                  currentProgress={currentProgress}
                />
              )}

              {/* Advanced Settings */}
              {showAdvancedSettings && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={realTimeAdjustmentEnabled}
                        onChange={toggleRealTimeAdjustment}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Real-time Adjustment</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={performanceEnabled}
                        onChange={togglePerformanceMonitorLocal}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Performance Monitor</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showRecentFiles}
                        onChange={() => setShowRecentFiles(!showRecentFiles)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Show Recent Files</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium">{Math.round(currentProgress * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{animationSettings.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Easing:</span>
                    <span className="font-medium capitalize">{animationSettings.easing}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Keyframes:</span>
                    <span className="font-medium">{keyframes.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Components */}
        <InteractiveTutorial
          isVisible={tutorialVisible}
          onClose={closeTutorial}
          onComplete={completeTutorial}
        />

        <PerformanceMonitor
          isVisible={performanceEnabled}
          position="top-right"
        />

        <KeyboardShortcuts
          shortcuts={shortcuts}
          onShortcut={(id) => console.log('Shortcut triggered:', id)}
        />

        <LoadingOverlay
          isVisible={processingState.isProcessing}
          message={processingState.currentTask || 'Processing...'}
          progress={processingState.progress}
        />
      </div>
    </PageErrorBoundary>
  );
};
