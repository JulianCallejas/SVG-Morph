import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Download, Settings, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { threeDMorphing, ThreeDMorphingOptions } from '../utils/threeDMorphing';
import { useToast } from '../contexts/ToastContext';
import { useMorphStore } from '../store/morphStore';
import { FileUploadZone } from '../components/FileUploadZone';
import { ThreeDExportPanel } from '../components/ThreeDExportPanel';

export const ThreeDMorphing: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [morphProgress, setMorphProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [options, setOptions] = useState<ThreeDMorphingOptions>({
    depth: 20,
    perspective: 1000,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    lighting: {
      ambient: 0.4,
      directional: 0.8,
      position: { x: 10, y: 10, z: 10 }
    },
    material: {
      color: '#5cbe2c',
      metalness: 0.3,
      roughness: 0.4,
      opacity: 1.0
    },
    animation: {
      autoRotate: true,
      rotationSpeed: 0.01,
      morphSpeed: 0.02
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const { showSuccess, showError, showWarning } = useToast();
  const { 
    sourceSVG, 
    targetSVG, 
    sourceSVGData, 
    targetSVGData, 
    setSourceSVG, 
    setTargetSVG 
  } = useMorphStore();

  // Initialize 3D scene
  const initialize3DScene = useCallback(async () => {
    if (!containerRef.current || !sourceSVGData || !targetSVGData) {
      showError('Please upload both SVG files and wait for processing to complete');
      return;
    }

    setIsLoading(true);
    try {
      if (sceneRef.current) {
        threeDMorphing.dispose();
        sceneRef.current = null;
      }

      const scene = await threeDMorphing.create3DScene(
        containerRef.current,
        sourceSVGData,
        targetSVGData,
        options
      );

      sceneRef.current = scene;
      setIsInitialized(true);
      showSuccess('3D scene initialized successfully!');
    } catch (error) {
      showError(`Failed to initialize 3D scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [sourceSVGData, targetSVGData, options, showSuccess, showError]);

  // Animation loop for morphing
  const startMorphAnimation = useCallback(() => {
    if (!isInitialized || isAnimating) return;
    
    setIsAnimating(true);
    let progress = 0;
    const speed = options.animation.morphSpeed;
    
    const animate = () => {
      progress += speed;
      if (progress > 1) progress = 0;
      
      setMorphProgress(progress);
      if (targetSVGData) {
        threeDMorphing.updateMorphing(progress, targetSVGData);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, [isInitialized, isAnimating, options.animation.morphSpeed, targetSVGData]);

  const stopMorphAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // Update 3D options
  useEffect(() => {
    if (isInitialized) {
      threeDMorphing.updateOptions(options);
    }
  }, [options, isInitialized]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && isInitialized) {
        const rect = containerRef.current.getBoundingClientRect();
        threeDMorphing.resize(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMorphAnimation();
      if (sceneRef.current) {
        threeDMorphing.dispose();
      }
    };
  }, [stopMorphAnimation]);


  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">3D Morphing Studio</h1>
              <p className="text-gray-600 dark:text-gray-400">Create and export 3D morphing animations</p>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        {(!sourceSVG || !targetSVG) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Source SVG</h3>
              <FileUploadZone
                label="Drop source SVG here"
                onUpload={async (file, content) => {
                  await setSourceSVG(content);
                }}
                hasFile={!!sourceSVG}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Target SVG</h3>
              <FileUploadZone
                label="Drop target SVG here"
                onUpload={async (file, content) => {
                  await setTargetSVG(content);
                }}
                hasFile={!!targetSVG}
              />
            </div>
          </div>
        )}

        {/* Main 3D Interface */}
        {sourceSVG && targetSVG && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Controls Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <button
                  onClick={initialize3DScene}
                  disabled={isLoading || isInitialized}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Box className="w-5 h-5" />
                  <span>{isInitialized ? 'Scene Ready' : 'Initialize 3D'}</span>
                </button>

                {isInitialized && (
                  <>
                    <button
                      onClick={isAnimating ? stopMorphAnimation : startMorphAnimation}
                      className="inline-flex items-center space-x-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      {isAnimating ? 'Stop' : 'Animate'}
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Progress:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={morphProgress}
                        onChange={(e) => {
                          const progress = parseFloat(e.target.value);
                          setMorphProgress(progress);
                          if (targetSVGData) {
                            threeDMorphing.updateMorphing(progress, targetSVGData);
                          }
                        }}
                        className="w-32"
                      />
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                        {(morphProgress * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowControls(!showControls)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  disabled={!isInitialized}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex">
              {/* 3D Canvas */}
              <div className="flex-1 relative">
                <div
                  ref={containerRef}
                  className={`bg-gray-100 dark:bg-gray-900 ${isFullscreen ? 'h-screen' : 'h-96'} relative overflow-hidden`}
                >
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-600 dark:text-gray-400">Initializing 3D scene...</p>
                      </div>
                    </div>
                  )}
                  
                  {!isInitialized && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                      <div className="text-center">
                        <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">Click "Initialize 3D" to start</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls Panel */}
              {showControls && (
                <div className="w-80 bg-gray-50 dark:bg-gray-700 p-6 space-y-6 overflow-y-auto max-h-96">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">3D Controls</h3>
                  
                  {/* Geometry Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Geometry</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Depth: {options.depth}
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={options.depth}
                        onChange={(e) => setOptions(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Perspective: {options.perspective}
                      </label>
                      <input
                        type="range"
                        min="500"
                        max="2000"
                        value={options.perspective}
                        onChange={(e) => setOptions(prev => ({ ...prev, perspective: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                      />
                    </div>
                  </div>

                  {/* Material Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Material</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <input
                        type="color"
                        value={options.material.color}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          material: { ...prev.material, color: e.target.value }
                        }))}
                        className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Metalness: {options.material.metalness.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={options.material.metalness}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          material: { ...prev.material, metalness: parseFloat(e.target.value) }
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Roughness: {options.material.roughness.toFixed(2)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={options.material.roughness}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          material: { ...prev.material, roughness: parseFloat(e.target.value) }
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                      />
                    </div>
                  </div>

                  {/* Animation Controls */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Animation</h4>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={options.animation.autoRotate}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          animation: { ...prev.animation, autoRotate: e.target.checked }
                        }))}
                        className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                      />
                      <span className="text-gray-900 dark:text-white">Auto Rotate</span>
                    </label>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Morph Speed: {(options.animation.morphSpeed * 100).toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={options.animation.morphSpeed}
                        onChange={(e) => setOptions(prev => ({ 
                          ...prev, 
                          animation: { ...prev.animation, morphSpeed: parseFloat(e.target.value) }
                        }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                      />
                    </div>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => setOptions({
                      depth: 20,
                      perspective: 1000,
                      rotationX: 0,
                      rotationY: 0,
                      rotationZ: 0,
                      lighting: {
                        ambient: 0.4,
                        directional: 0.8,
                        position: { x: 10, y: 10, z: 10 }
                      },
                      material: {
                        color: '#5cbe2c',
                        metalness: 0.3,
                        roughness: 0.4,
                        opacity: 1.0
                      },
                      animation: {
                        autoRotate: true,
                        rotationSpeed: 0.01,
                        morphSpeed: 0.02
                      }
                    })}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl font-medium transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3D Export Panel */}
        <ThreeDExportPanel
          scene={sceneRef.current}
          isOpen={showExportPanel}
          onClose={() => setShowExportPanel(false)}
        />
      </div>
    </div>
  );
};
