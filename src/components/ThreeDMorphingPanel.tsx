import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Settings, Play, Pause, RotateCcw, Download, Maximize, Minimize } from 'lucide-react';
import { threeDMorphing, ThreeDMorphingOptions, DEFAULT_MATERIAL_COLOR } from '../utils/threeDMorphing';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';
import { useMorphStore } from '../store/morphStore';
import { Button } from './ui/Button';
import { CheckRow, Field, Slider } from './ui/Fields';
import { Panel } from './ui/Panel';

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
      color: DEFAULT_MATERIAL_COLOR,
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
  // the contour plan chosen in the playground (morph / swap / static per contour)
  const contourPlan = useMorphStore((state) => state.contourPlan);

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
        { ...options, contourPlan: contourPlan ?? undefined }
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
  }, [sourceSVG, targetSVG, options, contourPlan, showSuccess, showError]);

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
    <Panel
      title="3D Morphing Preview"
      className="overflow-hidden"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowControls(!showControls)}
            title="Toggle Controls"
            aria-label="Toggle Controls"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportImage}
            disabled={!isInitialized}
            title="Export Image"
            aria-label="Export Image"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      }
    >
      <p className="-mt-3 mb-5 text-sm text-muted">Visualize morphing in 3D space</p>

      <div className="flex flex-col lg:flex-row">
        {/* 3D Canvas Container */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={containerRef}
            className={`bg-canvas ${isFullscreen ? 'h-screen' : 'h-96'} relative overflow-hidden`}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-canvas">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-action border-t-transparent motion-reduce:animate-none"></div>
                  <p className="text-muted">Initializing 3D scene...</p>
                  <p className="text-sm text-muted mt-1">Loading Three.js...</p>
                </div>
              </div>
            )}
            
            {!isInitialized && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-canvas">
                <div className="text-center">
                  <Box className="w-16 h-16 mx-auto mb-4 text-muted" />
                  <p className="text-muted mb-4">Upload both SVG files to view in 3D</p>
                  <Button
                    variant="primary"
                    onClick={initialize3DScene}
                    disabled={!sourceSVG || !targetSVG}
                  >
                    <Box className="w-5 h-5" />
                    <span>Initialize 3D Preview</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls Panel */}
        {showControls && (
          <div className="w-full lg:w-80 bg-canvas p-6 space-y-6 overflow-y-auto max-h-96">
            <h3 className="text-lg font-medium">3D Controls</h3>
            
            {/* Geometry Controls */}
            <div className="space-y-4">
              <h4 className="font-medium">Geometry</h4>
              
              <Field label={<>Depth: {options.depth}</>}>
                <Slider
                  min="5"
                  max="100"
                  value={options.depth}
                  onChange={(e) => setOptions(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                />
              </Field>

              <Field label={<>Perspective: {options.perspective}</>}>
                <Slider
                  min="500"
                  max="2000"
                  value={options.perspective}
                  onChange={(e) => setOptions(prev => ({ ...prev, perspective: parseInt(e.target.value) }))}
                />
              </Field>
            </div>

            {/* Material Controls */}
            <div className="space-y-4">
              <h4 className="font-medium">Material</h4>
              
              <Field label="Color">
                <input
                  type="color"
                  value={options.material.color}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    material: { ...prev.material, color: e.target.value }
                  }))}
                  className="h-11 w-full bg-raised p-1"
                />
              </Field>

              <Field label={<>Metalness: {options.material.metalness.toFixed(2)}</>}>
                <Slider
                  min="0"
                  max="1"
                  step="0.01"
                  value={options.material.metalness}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    material: { ...prev.material, metalness: parseFloat(e.target.value) }
                  }))}
                />
              </Field>

              <Field label={<>Roughness: {options.material.roughness.toFixed(2)}</>}>
                <Slider
                  min="0"
                  max="1"
                  step="0.01"
                  value={options.material.roughness}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    material: { ...prev.material, roughness: parseFloat(e.target.value) }
                  }))}
                />
              </Field>
            </div>

            {/* Lighting Controls */}
            <div className="space-y-4">
              <h4 className="font-medium">Lighting</h4>
              
              <Field label={<>Ambient: {options.lighting.ambient.toFixed(2)}</>}>
                <Slider
                  min="0"
                  max="1"
                  step="0.01"
                  value={options.lighting.ambient}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    lighting: { ...prev.lighting, ambient: parseFloat(e.target.value) }
                  }))}
                />
              </Field>

              <Field label={<>Directional: {options.lighting.directional.toFixed(2)}</>}>
                <Slider
                  min="0"
                  max="2"
                  step="0.01"
                  value={options.lighting.directional}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    lighting: { ...prev.lighting, directional: parseFloat(e.target.value) }
                  }))}
                />
              </Field>
            </div>

            {/* Animation Controls */}
            <div className="space-y-4">
              <h4 className="font-medium">Animation</h4>
              
              <CheckRow
                label="Auto Rotate"
                checked={options.animation.autoRotate}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  animation: { ...prev.animation, autoRotate: e.target.checked }
                }))}
              />

              {options.animation.autoRotate && (
                <Field label={<>Rotation Speed: {(options.animation.rotationSpeed * 100).toFixed(1)}</>}>
                  <Slider
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={options.animation.rotationSpeed}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      animation: { ...prev.animation, rotationSpeed: parseFloat(e.target.value) }
                    }))}
                  />
                </Field>
              )}
            </div>

            {/* Reset Button */}
            <Button
              className="w-full justify-center"
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
                  color: DEFAULT_MATERIAL_COLOR,
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
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Defaults</span>
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
};
