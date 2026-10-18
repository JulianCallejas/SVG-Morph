import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Download, Settings, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { threeDMorphing, ThreeDMorphingOptions, DEFAULT_MATERIAL_COLOR } from '../utils/threeDMorphing';
import { useToast } from '../contexts/ToastContext';
import { useMorphStore } from '../store/morphStore';
import { FileUploadZone } from '../components/FileUploadZone';
import { ThreeDExportPanel } from '../components/ThreeDExportPanel';
import { Button } from '../components/ui/Button';
import { CheckRow, Field, Slider } from '../components/ui/Fields';

const DEFAULT_OPTIONS: ThreeDMorphingOptions = {
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
};

export const ThreeDMorphing: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [morphProgress, setMorphProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const [options, setOptions] = useState<ThreeDMorphingOptions>(DEFAULT_OPTIONS);

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
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em]">
            3D Morphing Studio
          </h1>
          <p className="mt-4 max-w-[70ch] text-lg text-muted">Create and export 3D morphing animations</p>
        </header>

        {/* File Upload Section */}
        {(!sourceSVG || !targetSVG) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Source SVG</h3>
              <FileUploadZone
                label="Drop source SVG here"
                onUpload={async (file, content) => {
                  await setSourceSVG(content);
                }}
                hasFile={!!sourceSVG}
              />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-4">Target SVG</h3>
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
          <div className="bg-surface overflow-hidden">
            {/* Controls Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  onClick={initialize3DScene}
                  disabled={isLoading || isInitialized}
                >
                  <Box className="w-5 h-5" />
                  <span>{isInitialized ? 'Scene Ready' : 'Initialize 3D'}</span>
                </Button>

                {isInitialized && (
                  <>
                    <Button
                      variant="primary"
                      onClick={isAnimating ? stopMorphAnimation : startMorphAnimation}
                    >
                      {isAnimating ? 'Stop' : 'Animate'}
                    </Button>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted">Progress:</span>
                      <div className="w-32">
                        <Slider
                          aria-label="Morph progress"
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
                        />
                      </div>
                      <span className="w-10 text-sm tabular-nums">
                        {(morphProgress * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle 3D controls"
                  aria-pressed={showControls}
                  onClick={() => setShowControls(!showControls)}
                >
                  <Settings className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open export panel"
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  disabled={!isInitialized}
                >
                  <Download className="w-5 h-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle fullscreen"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* 3D Canvas */}
              <div className="flex-1 min-w-0 relative">
                <div
                  ref={containerRef}
                  className={`bg-canvas ${isFullscreen ? 'h-screen' : 'h-96'} relative overflow-hidden`}
                >
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-canvas">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-action border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
                        <p className="text-muted">Initializing 3D scene...</p>
                      </div>
                    </div>
                  )}

                  {!isInitialized && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-canvas">
                      <div className="text-center">
                        <Box className="w-16 h-16 mx-auto mb-4 text-muted" />
                        <p className="text-muted">Click "Initialize 3D" to start</p>
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

                    <Field label={`Depth: ${options.depth}`}>
                      <Slider
                        min="5"
                        max="100"
                        value={options.depth}
                        onChange={(e) => setOptions(prev => ({ ...prev, depth: parseInt(e.target.value) }))}
                      />
                    </Field>

                    <Field label={`Perspective: ${options.perspective}`}>
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
                        className="h-11 w-full cursor-pointer bg-raised p-1"
                      />
                    </Field>

                    <Field label={`Metalness: ${options.material.metalness.toFixed(2)}`}>
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

                    <Field label={`Roughness: ${options.material.roughness.toFixed(2)}`}>
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

                    <Field label={`Morph Speed: ${(options.animation.morphSpeed * 100).toFixed(1)}`}>
                      <Slider
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={options.animation.morphSpeed}
                        onChange={(e) => setOptions(prev => ({
                          ...prev,
                          animation: { ...prev.animation, morphSpeed: parseFloat(e.target.value) }
                        }))}
                      />
                    </Field>
                  </div>

                  {/* Reset Button */}
                  <Button className="w-full justify-center" onClick={() => setOptions(DEFAULT_OPTIONS)}>
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </Button>
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
