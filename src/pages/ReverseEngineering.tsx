import React, { useState, useCallback } from 'react';
import { Upload, Download, Settings, FileText, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { analyzeAnimation, extractMorphingParameters, type AnalysisResult } from '../utils/animationAnalysis';
import { useMorphStore } from '../store/morphStore';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';

interface AnalysisState {
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export const ReverseEngineering: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    result: null,
    error: null
  });
  const [selectedAnimation, setSelectedAnimation] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { setSourceSVG, setTargetSVG, updateAnimationSettings } = useMorphStore();
  const { showSuccess, showError, showInfo } = useToast();

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!uploadedFile.type.includes('svg') && !uploadedFile.type.includes('xml')) {
      showError('Please upload an SVG file with animations');
      return;
    }

    setFile(uploadedFile);
    setAnalysisState({ isAnalyzing: true, result: null, error: null });

    try {
      const content = await uploadedFile.text();
      const result = analyzeAnimation(content);
      
      setAnalysisState({
        isAnalyzing: false,
        result,
        error: null
      });

      showSuccess(`Analysis complete! Found ${result.animations.length} animations`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze animation';
      setAnalysisState({
        isAnalyzing: false,
        result: null,
        error: errorMessage
      });
      showError(`Analysis failed: ${errorMessage}`);
    }
  }, [showSuccess, showError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  }, [handleFileUpload]);

  const applyToMorphStore = useCallback(() => {
    if (!analysisState.result) return;

    const parameters = extractMorphingParameters(analysisState.result);
    if (!parameters) {
      showError('No morphing parameters could be extracted');
      return;
    }

    // Apply extracted SVGs if available
    if (analysisState.result.extractedSVGs) {
      setSourceSVG(analysisState.result.extractedSVGs.source);
      setTargetSVG(analysisState.result.extractedSVGs.target);
    }

    // Apply animation parameters
    updateAnimationSettings({
      duration: parameters.duration / 1000, // Convert to seconds
      easing: parameters.easing === 'ease-in-out' ? 'easeInOut' : 
              parameters.easing === 'ease-in' ? 'easeIn' : 
              parameters.easing === 'ease-out' ? 'easeOut' : 'easeInOut',
      loop: parameters.loop
    });

    showSuccess('Parameters applied to morphing project!');
    showInfo('Navigate to Enhanced Playground to see the results');
  }, [analysisState.result, setSourceSVG, setTargetSVG, updateAnimationSettings, showSuccess, showError, showInfo]);

  const exportParameters = useCallback(() => {
    if (!analysisState.result) return;

    const parameters = extractMorphingParameters(analysisState.result);
    if (!parameters) {
      showError('No parameters to export');
      return;
    }

    const exportData = {
      metadata: {
        extractedFrom: file?.name || 'unknown',
        extractedAt: new Date().toISOString(),
        tool: 'SVG-Morph Reverse Engineering'
      },
      analysis: analysisState.result,
      morphingParameters: parameters
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace('.svg', '') || 'animation'}-analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Analysis exported successfully!');
  }, [analysisState.result, file, showSuccess, showError]);


  const clearFile = () => {
    setFile(null);
    setAnalysisState({ isAnalyzing: false, result: null, error: null });
  };

  const result = analysisState.result;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em]">
            Reverse Engineering
          </h1>
          <p className="mt-4 max-w-[70ch] text-lg text-muted">
            Analyze existing SVG animations and extract morphing parameters for recreation in SVG-Morph
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:items-start">
          <Panel title="Upload Animation">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-line bg-canvas p-8 text-center transition-colors hover:border-action"
              >
                <Upload className="h-12 w-12 text-muted mx-auto mb-4" aria-hidden="true" />
                <p className="mb-2">Drop your animated SVG file here</p>
                <p className="text-sm text-muted mb-6">Supports SMIL, CSS, and JavaScript animations</p>
                <label className="press inline-flex h-11 cursor-pointer items-center gap-2 bg-action px-5 font-medium text-on-action hover:bg-sun-300 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Choose File
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 bg-raised pl-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-link" aria-hidden="true" />
                    <span className="truncate text-sm font-medium">{file.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remove file" className="hover:bg-line/40">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {analysisState.isAnalyzing && (
                  <p role="status" className="p-4 text-center text-muted">Analyzing animation...</p>
                )}

                {analysisState.error && (
                  <p role="alert" className="flex items-center gap-2 bg-canvas p-3 text-sm text-danger">
                    <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{analysisState.error}</span>
                  </p>
                )}
              </div>
            )}
          </Panel>

          <div className="lg:col-span-2">
            {result && (
              <div className="space-y-6 enter">
                <Panel title="Analysis Overview">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-raised p-4">
                      <div className="text-2xl font-light text-link">{result.metadata.totalAnimations}</div>
                      <div className="text-sm text-muted">Animations</div>
                    </div>
                    <div className="bg-raised p-4">
                      <div className="text-lg font-medium capitalize">{result.metadata.complexity}</div>
                      <div className="text-sm text-muted">Complexity</div>
                    </div>
                    <div className="bg-raised p-4">
                      <div className="text-lg font-medium">
                        {result.metadata.estimatedParameters.duration || 'N/A'}ms
                      </div>
                      <div className="text-sm text-muted">Duration</div>
                    </div>
                    <div className="bg-raised p-4">
                      <div className="text-lg font-medium">
                        {result.metadata.estimatedParameters.easing || 'N/A'}
                      </div>
                      <div className="text-sm text-muted">Easing</div>
                    </div>
                  </div>

                  <p className="mb-6 text-sm text-muted">
                    Animation types:{' '}
                    <span className="font-medium text-content">
                      {result.metadata.animationTypes.map((type) => type.toUpperCase()).join(', ')}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" onClick={applyToMorphStore}>
                      <CheckCircle className="h-4 w-4" aria-hidden="true" />
                      Apply to Project
                    </Button>
                    <Button onClick={exportParameters}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export Analysis
                    </Button>
                    <Button onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      {showAdvanced ? 'Hide' : 'Show'} Details
                    </Button>
                  </div>
                </Panel>

                {showAdvanced && (
                  <Panel title="Detailed Animation Analysis" className="enter">
                    <div className="space-y-3">
                      {result.animations.map((animation, index) => (
                        <button
                          key={index}
                          type="button"
                          aria-pressed={selectedAnimation === index}
                          onClick={() => setSelectedAnimation(index)}
                          className={`press block w-full p-4 text-left transition-colors ${
                            selectedAnimation === index ? 'bg-sun-800' : 'bg-raised hover:bg-line/40'
                          }`}
                        >
                          <span className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">
                              {animation.type.toUpperCase()} Animation {index + 1}
                            </span>
                            <span className="text-sm text-muted">{animation.keyframes.length} keyframes</span>
                          </span>

                          <span className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <span>
                              <span className="text-muted">Duration:</span>
                              <span className="ml-2 font-medium">{animation.duration}ms</span>
                            </span>
                            <span>
                              <span className="text-muted">Easing:</span>
                              <span className="ml-2 font-medium">{animation.easing || 'linear'}</span>
                            </span>
                            {animation.morphingPaths && (
                              <span>
                                <span className="text-muted">Type:</span>
                                <span className="ml-2 font-medium text-link">Path Morphing</span>
                              </span>
                            )}
                          </span>

                          {selectedAnimation === index && animation.morphingPaths && (
                            <span className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <span className="block min-w-0">
                                <span className="mb-2 block font-medium">Source Path:</span>
                                <code className="block truncate bg-canvas p-2 text-xs">
                                  {animation.morphingPaths.source.substring(0, 100)}...
                                </code>
                              </span>
                              <span className="block min-w-0">
                                <span className="mb-2 block font-medium">Target Path:</span>
                                <code className="block truncate bg-canvas p-2 text-xs">
                                  {animation.morphingPaths.target.substring(0, 100)}...
                                </code>
                              </span>
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </Panel>
                )}

                {result.extractedSVGs && (
                  <Panel title="Extracted SVG Shapes">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="mb-2 font-medium">Source Shape</h3>
                        <div className="bg-canvas p-4 flex items-center justify-center">
                          <div
                            dangerouslySetInnerHTML={{ __html: result.extractedSVGs.source }}
                            className="w-full min-w-0 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-48 [&_svg]:max-w-full [&_path]:stroke-action"
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="mb-2 font-medium">Target Shape</h3>
                        <div className="bg-canvas p-4 flex items-center justify-center">
                          <div
                            dangerouslySetInnerHTML={{ __html: result.extractedSVGs.target }}
                            className="w-full min-w-0 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-48 [&_svg]:max-w-full [&_path]:stroke-action"
                          />
                        </div>
                      </div>
                    </div>
                  </Panel>
                )}
              </div>
            )}

            {!result && !analysisState.isAnalyzing && !analysisState.error && (
              <Panel className="p-8 sm:p-12">
                <div className="text-center">
                  <Info className="h-16 w-16 text-muted mx-auto mb-4" aria-hidden="true" />
                  <h2 className="text-xl font-medium mb-2">Ready to Analyze</h2>
                  <p className="text-muted mb-6">
                    Upload an animated SVG file to extract morphing parameters and recreate the animation in SVG-Morph.
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="font-medium mb-2">Supported Animation Types:</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted marker:text-link">
                    <li>SMIL animations (animate, animateTransform)</li>
                    <li>CSS keyframe animations</li>
                    <li>JavaScript-based morphing (GSAP, Anime.js)</li>
                    <li>Path morphing and property animations</li>
                  </ul>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
