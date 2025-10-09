import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useMorphStore } from '../store/morphStore';
import { 
  Settings, 
  Zap, 
  Cpu, 
  Memory, 
  Video, 
  Share2, 
  Palette, 
  Type, 
  Layers, 
  Physics,
  Download,
  Play,
  Pause,
  RotateCcw,
  Monitor,
  Gauge,
  Sparkles
} from 'lucide-react';
import { gradientMorpher } from '../utils/gradientMorphing';
import { textPathMorpher } from '../utils/textPathMorphing';
import { multiPathProcessor } from '../utils/multiPathSupport';
import { physicsSimulator, SpringPresets } from '../utils/physicsSimulation';
import { videoExporter } from '../utils/videoExport';
import { socialIntegrator } from '../utils/socialIntegration';
import { CanvasRenderer } from '../utils/canvasRenderer';
import { svgUpdateManager } from '../utils/debouncedUpdates';
import { memoryManager, svgMemoryManager } from '../utils/memoryManagement';
import { progressiveLoader } from '../utils/progressiveLoading';

// Lazy load heavy components
const AdvancedGradientPanel = React.lazy(() => import('../components/AdvancedGradientPanel'));
const TextPathEditor = React.lazy(() => import('../components/TextPathEditor'));
const MultiPathVisualizer = React.lazy(() => import('../components/MultiPathVisualizer'));
const PhysicsControls = React.lazy(() => import('../components/PhysicsControls'));
const VideoExportPanel = React.lazy(() => import('../components/VideoExportPanel'));
const SocialSharingPanel = React.lazy(() => import('../components/SocialSharingPanel'));
const PerformanceMonitor = React.lazy(() => import('../components/PerformanceMonitor'));

interface Phase4PlaygroundProps {
  className?: string;
}

export default function PlaygroundPhase4({ className = '' }: Phase4PlaygroundProps) {
  const {
    sourceSVG,
    targetSVG,
    currentProgress,
    isAnimating,
    animationType,
    renderMode,
    enableHardwareAcceleration,
    enableMemoryOptimization,
    enableProgressiveLoading,
    debouncedUpdatesEnabled,
    gradientMorphOptions,
    textMorphOptions,
    multiPathMorphOptions,
    physicsOptions,
    videoExportOptions,
    shareOptions,
    canvasRenderOptions,
    processingState,
    startAnimation,
    pauseAnimation,
    resetAnimation,
    setProgress,
    setAnimationType,
    setRenderMode,
    toggleHardwareAcceleration,
    toggleMemoryOptimization,
    toggleProgressiveLoading,
    toggleDebouncedUpdates,
    optimizePerformance,
    exportVideo,
    shareToSocial,
    updateGradientMorphOptions,
    updateTextMorphOptions,
    updateMultiPathMorphOptions,
    updatePhysicsOptions,
    updateVideoExportOptions,
    updateShareOptions,
    updateCanvasRenderOptions,
  } = useMorphStore();

  const [activeTab, setActiveTab] = useState<'gradient' | 'text' | 'multipath' | 'physics' | 'export' | 'share' | 'performance'>('gradient');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // Initialize canvas renderer
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current, canvasRenderOptions);
    }
  }, [canvasRenderOptions]);

  // Initialize debounced updates
  useEffect(() => {
    if (debouncedUpdatesEnabled) {
      svgUpdateManager.initializeSVGUpdates({
        onAnimationSettingsChange: (settings) => {
          console.log('Debounced animation settings update:', settings);
        },
        onProgressChange: (progress) => {
          setProgress(progress);
        },
        onPhysicsSettingsChange: (settings) => {
          updatePhysicsOptions(settings);
        },
      });
    }

    return () => {
      svgUpdateManager.cancelAll();
    };
  }, [debouncedUpdatesEnabled]);

  // Memory monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (enableMemoryOptimization) {
        const stats = memoryManager.getMemoryStats();
        const svgStats = svgMemoryManager.getSVGMemoryStats();
        setMemoryStats({ ...stats, ...svgStats });

        // Auto-optimize if memory pressure is high
        if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
          memoryManager.handleMemoryPressure();
          svgMemoryManager.handleMemoryPressure();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enableMemoryOptimization]);

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      if (rendererRef.current) {
        const stats = rendererRef.current.getRenderStats();
        setPerformanceStats(stats);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle animation type changes
  const handleAnimationTypeChange = (type: 'standard' | 'spring' | 'elastic' | 'damped') => {
    setAnimationType(type);
    
    if (type === 'spring') {
      updatePhysicsOptions({
        springConfig: SpringPresets.gentle,
      });
    } else if (type === 'elastic') {
      updatePhysicsOptions({
        springConfig: SpringPresets.bouncy,
      });
    }
  };

  // Handle video export
  const handleVideoExport = async () => {
    if (!sourceSVG || !targetSVG) return;

    try {
      await exportVideo();
    } catch (error) {
      console.error('Video export failed:', error);
    }
  };

  // Handle social sharing
  const handleSocialShare = async (platform: string) => {
    try {
      await shareToSocial(platform);
    } catch (error) {
      console.error('Social sharing failed:', error);
    }
  };

  // Render canvas preview
  const renderPreview = async () => {
    if (!rendererRef.current || !sourceSVG || !targetSVG) return;

    try {
      // Apply advanced morphing based on active features
      let morphedSVG = sourceSVG;

      if (gradientMorphOptions && activeTab === 'gradient') {
        morphedSVG = gradientMorpher.applyGradientMorphing(sourceSVG, targetSVG, currentProgress);
      }

      if (textMorphOptions && activeTab === 'text') {
        morphedSVG = textPathMorpher.applyTextPathMorphing(sourceSVG, targetSVG, currentProgress);
      }

      if (multiPathMorphOptions && activeTab === 'multipath') {
        const sourceData = multiPathProcessor.parseSVG(sourceSVG);
        const targetData = multiPathProcessor.parseSVG(targetSVG);
        const morphedData = multiPathProcessor.morphMultiPathSVGs(sourceData, targetData, currentProgress);
        morphedSVG = multiPathProcessor.generateSVG(morphedData);
      }

      if (animationType !== 'standard' && activeTab === 'physics') {
        const frames = physicsSimulator.applyPhysicsToMorph(
          sourceSVG,
          targetSVG,
          animationType,
          2, // duration
          physicsOptions
        );
        
        if (frames.length > 0) {
          const frameIndex = Math.floor(currentProgress * (frames.length - 1));
          morphedSVG = frames[frameIndex] || morphedSVG;
        }
      }

      await rendererRef.current.renderSVG(morphedSVG);
    } catch (error) {
      console.error('Preview rendering failed:', error);
    }
  };

  // Update preview when progress changes
  useEffect(() => {
    renderPreview();
  }, [currentProgress, activeTab, sourceSVG, targetSVG]);

  const tabs = [
    { id: 'gradient', label: 'Gradients', icon: Palette },
    { id: 'text', label: 'Text Paths', icon: Type },
    { id: 'multipath', label: 'Multi-Path', icon: Layers },
    { id: 'physics', label: 'Physics', icon: Physics },
    { id: 'export', label: 'Video Export', icon: Video },
    { id: 'share', label: 'Social Share', icon: Share2 },
    { id: 'performance', label: 'Performance', icon: Gauge },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#262a23] to-[#1a1d17] text-white ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Sparkles className="w-8 h-8 text-[#5cbe2c]" />
              <div>
                <h1 className="text-2xl font-bold">SVG Morph Phase 4</h1>
                <p className="text-gray-400">Advanced morphing with physics, video export, and optimization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Performance indicators */}
              {performanceStats && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Monitor className="w-4 h-4" />
                    <span>{Math.round(performanceStats.fps)} FPS</span>
                  </div>
                  {memoryStats && (
                    <div className="flex items-center space-x-1">
                      <Memory className="w-4 h-4" />
                      <span className={`${
                        memoryStats.memoryPressure === 'high' ? 'text-yellow-400' :
                        memoryStats.memoryPressure === 'critical' ? 'text-red-400' :
                        'text-green-400'
                      }`}>
                        {memoryStats.memoryPressure}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Quick optimization button */}
              <button
                onClick={optimizePerformance}
                className="px-3 py-2 bg-[#5cbe2c] text-white rounded-xl hover:bg-[#4a9c23] transition-colors duration-200 flex items-center space-x-2"
              >
                <Zap className="w-4 h-4" />
                <span>Optimize</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Preview Canvas</h2>
                <div className="flex items-center space-x-2">
                  <select
                    value={renderMode}
                    onChange={(e) => setRenderMode(e.target.value as any)}
                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5cbe2c]"
                  >
                    <option value="2d">2D Canvas</option>
                    <option value="webgl">WebGL</option>
                    <option value="offscreen">Offscreen</option>
                  </select>
                  
                  <button
                    onClick={toggleHardwareAcceleration}
                    className={`p-2 rounded-lg transition-colors duration-200 ${
                      enableHardwareAcceleration
                        ? 'bg-[#5cbe2c] text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Hardware Acceleration"
                  >
                    <Cpu className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-96 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                
                {processingState.isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-[#5cbe2c] border-t-transparent rounded-full mx-auto mb-2"></div>
                      <p className="text-sm">{processingState.currentTask}</p>
                      <div className="w-48 bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-[#5cbe2c] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${processingState.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Animation Controls */}
              <div className="mt-4 space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={isAnimating ? pauseAnimation : startAnimation}
                    className="p-3 bg-[#5cbe2c] text-white rounded-xl hover:bg-[#4a9c23] transition-colors duration-200"
                  >
                    {isAnimating ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  
                  <button
                    onClick={resetAnimation}
                    className="p-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors duration-200"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={currentProgress}
                      onChange={(e) => {
                        const progress = parseFloat(e.target.value);
                        if (debouncedUpdatesEnabled) {
                          svgUpdateManager.updateProgress(progress);
                        } else {
                          setProgress(progress);
                        }
                      }}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  
                  <span className="text-sm font-mono min-w-[4rem]">
                    {Math.round(currentProgress * 100)}%
                  </span>
                </div>
                
                {/* Animation Type Selector */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Animation Type:</label>
                  <select
                    value={animationType}
                    onChange={(e) => handleAnimationTypeChange(e.target.value as any)}
                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5cbe2c]"
                  >
                    <option value="standard">Standard</option>
                    <option value="spring">Spring Physics</option>
                    <option value="elastic">Elastic Bounce</option>
                    <option value="damped">Damped Oscillation</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Control Panel */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-black/40 rounded-xl backdrop-blur-sm border border-gray-800">
              <div className="grid grid-cols-2 gap-1 p-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`p-3 rounded-xl transition-all duration-200 flex flex-col items-center space-y-1 ${
                        activeTab === tab.id
                          ? 'bg-[#5cbe2c] text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-black/40 rounded-xl p-6 backdrop-blur-sm border border-gray-800">
              <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-[#5cbe2c] border-t-transparent rounded-full"></div>
                </div>
              }>
                {activeTab === 'gradient' && (
                  <AdvancedGradientPanel
                    options={gradientMorphOptions}
                    onOptionsChange={updateGradientMorphOptions}
                  />
                )}
                
                {activeTab === 'text' && (
                  <TextPathEditor
                    options={textMorphOptions}
                    onOptionsChange={updateTextMorphOptions}
                  />
                )}
                
                {activeTab === 'multipath' && (
                  <MultiPathVisualizer
                    options={multiPathMorphOptions}
                    onOptionsChange={updateMultiPathMorphOptions}
                  />
                )}
                
                {activeTab === 'physics' && (
                  <PhysicsControls
                    options={physicsOptions}
                    onOptionsChange={updatePhysicsOptions}
                    animationType={animationType}
                  />
                )}
                
                {activeTab === 'export' && (
                  <VideoExportPanel
                    options={videoExportOptions}
                    onOptionsChange={updateVideoExportOptions}
                    onExport={handleVideoExport}
                    isExporting={processingState.isProcessing}
                  />
                )}
                
                {activeTab === 'share' && (
                  <SocialSharingPanel
                    options={shareOptions}
                    onOptionsChange={updateShareOptions}
                    onShare={handleSocialShare}
                    isSharing={processingState.isProcessing}
                  />
                )}
                
                {activeTab === 'performance' && (
                  <PerformanceMonitor
                    memoryStats={memoryStats}
                    performanceStats={performanceStats}
                    enableMemoryOptimization={enableMemoryOptimization}
                    enableProgressiveLoading={enableProgressiveLoading}
                    debouncedUpdatesEnabled={debouncedUpdatesEnabled}
                    onToggleMemoryOptimization={toggleMemoryOptimization}
                    onToggleProgressiveLoading={toggleProgressiveLoading}
                    onToggleDebouncedUpdates={toggleDebouncedUpdates}
                    onOptimize={optimizePerformance}
                  />
                )}
              </Suspense>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/40 rounded-xl p-4 backdrop-blur-sm border border-gray-800">
              <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleVideoExport}
                  disabled={!sourceSVG || !targetSVG || processingState.isProcessing}
                  className="p-2 bg-[#d6b77c] text-[#262a23] rounded-lg hover:bg-[#c4a66a] transition-colors duration-200 flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">Export</span>
                </button>
                
                <button
                  onClick={() => handleSocialShare('twitter')}
                  disabled={!sourceSVG || !targetSVG || processingState.isProcessing}
                  className="p-2 bg-[#5cbe2c] text-white rounded-lg hover:bg-[#4a9c23] transition-colors duration-200 flex items-center justify-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Performance Monitor (if enabled) */}
      {performanceStats && (
        <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-xs border border-gray-700">
          <div className="flex items-center space-x-4">
            <div>FPS: {Math.round(performanceStats.fps)}</div>
            <div>Frame: {Math.round(performanceStats.frameTime)}ms</div>
            {memoryStats && (
              <div className={`${
                memoryStats.memoryPressure === 'high' ? 'text-yellow-400' :
                memoryStats.memoryPressure === 'critical' ? 'text-red-400' :
                'text-green-400'
              }`}>
                Memory: {memoryStats.memoryPressure}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5cbe2c;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #000;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5cbe2c;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #000;
        }
      `}</style>
    </div>
  );
}
