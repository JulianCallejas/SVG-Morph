import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Settings, Play, Pause, RotateCcw, Download, Maximize, Minimize } from 'lucide-react';
import { threeDMorphing, ThreeDMorphingOptions } from '../utils/threeDMorphing';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';

interface ThreeDMorphingPanelProps {
  sourceSVG: SVGData | null;
  targetSVG: SVGData | null;
  morphProgress?: number;
}

export const ThreeDMorphingPanel: React.FC<ThreeDMorphingPanelProps> = ({
  sourceSVG,
  targetSVG,
  morphProgress = 0
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
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
  const { showSuccess, showError, showWarning } = useToast();

  // Initialize 3D scene
  const initialize3DScene = useCallback(async () => {
    if (!containerRef.current || !sourceSVG || !targetSVG) return;

    setIsLoading(true);
    try {
      // Clean up existing scene
      if (sceneRef.current) {
        threeDMorphing.dispose();
        sceneRef.current = null;
      }

      // Create new 3D scene
      const scene = await threeDMorphing.create3DScene(
        containerRef.current,
        sourceSVG,
        targetSVG,
        options
      );

      sceneRef.current = scene;
      setIsInitialized(true);
      showSuccess('3D scene initialized successfully!');
    } catch (error) {
      showError(`Failed to initialize 3D scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('3D initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceSVG, targetSVG, options, showSuccess, showError]);

  // Update morphing progress
  useEffect(() => {
    if (isInitialized && sceneRef.current) {
      threeDMorphing.updateMorphing(morphProgress, targetSVG);
    }
  }, [morphProgress, targetSVG, isInitialized]);

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
      if (sceneRef.current) {
        threeDMorphing.dispose();
      }
    };
  }, []);

  const handleExportImage = useCallback(() => {
    if (!isInitialized) {
      showWarning('3D scene not initialized');
      return;
    }

    try {
      const imageData = threeDMorphing.exportImage('png', 1.0);
      const link = document.createElement('a');
      link.href = imageData;
      link.download = '3d-morph-preview.png';
      link.click();
      showSuccess('3D preview exported as image!');
    } catch (error) {
      showError(`Failed to export image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isInitialized, showSuccess, showError, showWarning]);

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">3D Morphing Preview</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visualize morphing in 3D space</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle Controls"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleExportImage}
            disabled={!isInitialized}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Image"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* 3D Canvas Container */}
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
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Loading Three.js...</p>
                </div>
              </div>
            )}
            
            {!isInitialized && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                  <Box className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Upload both SVG files to view in 3D</p>
                  <button
                    onClick={initialize3DScene}
                    disabled={!sourceSVG || !targetSVG}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <Box className="w-5 h-5" />
                    <span>Initialize 3D Preview</span>
                  </button>
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                />
              </div>
            </div>

            {/* Lighting Controls */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Lighting</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ambient: {options.lighting.ambient.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={options.lighting.ambient}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    lighting: { ...prev.lighting, ambient: parseFloat(e.target.value) }
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Directional: {options.lighting.directional.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={options.lighting.directional}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    lighting: { ...prev.lighting, directional: parseFloat(e.target.value) }
                  }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
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

              {options.animation.autoRotate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rotation Speed: {(options.animation.rotationSpeed * 100).toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={options.animation.rotationSpeed}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      animation: { ...prev.animation, rotationSpeed: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 slider"
                  />
                </div>
              )}
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
              <span>Reset to Defaults</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
