import React, { useState, useCallback } from 'react';
import { Upload, Download, Eye, Settings, FileText, Zap, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { analyzeAnimation, extractMorphingParameters, type AnalysisResult } from '../utils/animationAnalysis';
import { useMorphStore } from '../store/morphStore';
import { useToast } from '../contexts/ToastContext';

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

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAnimationTypeIcon = (type: string) => {
    switch (type) {
      case 'smil': return '🎬';
      case 'css': return '🎨';
      case 'javascript': return '⚡';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Reverse Engineering
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Analyze existing SVG animations and extract morphing parameters for recreation in SVG-Morph
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-accent" />
                Upload Animation
              </h2>

              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-accent transition-colors duration-200 cursor-pointer"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Drop your animated SVG file here
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Supports SMIL, CSS, and JavaScript animations
                  </p>
                  <label className="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-accent mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setAnalysisState({ isAnalyzing: false, result: null, error: null });
                      }}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>

                  {analysisState.isAnalyzing && (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-300">Analyzing animation...</span>
                    </div>
                  )}

                  {analysisState.error && (
                    <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm text-red-700 dark:text-red-300">{analysisState.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            {analysisState.result && (
              <div className="space-y-6">
                {/* Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Eye className="h-5 w-5 mr-2 text-accent" />
                    Analysis Overview
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-accent">
                        {analysisState.result.metadata.totalAnimations}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Animations</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className={`text-sm px-2 py-1 rounded-full ${getComplexityColor(analysisState.result.metadata.complexity)}`}>
                        {analysisState.result.metadata.complexity.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Complexity</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {analysisState.result.metadata.estimatedParameters.duration || 'N/A'}ms
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Duration</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {analysisState.result.metadata.estimatedParameters.easing || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Easing</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {analysisState.result.metadata.animationTypes.map(type => (
                      <span
                        key={type}
                        className="inline-flex items-center px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium"
                      >
                        <span className="mr-1">{getAnimationTypeIcon(type)}</span>
                        {type.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={applyToMorphStore}
                      className="flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply to Project
                    </button>
                    <button
                      onClick={exportParameters}
                      className="flex items-center px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Analysis
                    </button>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {showAdvanced ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                </div>

                {/* Detailed Analysis */}
                {showAdvanced && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Detailed Animation Analysis
                    </h3>

                    <div className="space-y-4">
                      {analysisState.result.animations.map((animation, index) => (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAnimation === index
                              ? 'border-accent bg-accent/5'
                              : 'border-gray-200 dark:border-gray-600 hover:border-accent/50'
                          }`}
                          onClick={() => setSelectedAnimation(index)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{getAnimationTypeIcon(animation.type)}</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {animation.type.toUpperCase()} Animation {index + 1}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {animation.keyframes.length} keyframes
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-300">Duration:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {animation.duration}ms
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300">Easing:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {animation.easing || 'linear'}
                              </span>
                            </div>
                            {animation.morphingPaths && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-300">Type:</span>
                                <span className="ml-2 font-medium text-accent">Path Morphing</span>
                              </div>
                            )}
                          </div>

                          {selectedAnimation === index && animation.morphingPaths && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Source Path:</h4>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded block overflow-x-auto">
                                    {animation.morphingPaths.source.substring(0, 100)}...
                                  </code>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Target Path:</h4>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded block overflow-x-auto">
                                    {animation.morphingPaths.target.substring(0, 100)}...
                                  </code>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted SVGs Preview */}
                {analysisState.result.extractedSVGs && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Extracted SVG Shapes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Source Shape</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center">
                          <div
                            dangerouslySetInnerHTML={{ __html: analysisState.result.extractedSVGs.source }}
                            className="max-w-full max-h-48"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Target Shape</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center">
                          <div
                            dangerouslySetInnerHTML={{ __html: analysisState.result.extractedSVGs.target }}
                            className="max-w-full max-h-48"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!analysisState.result && !analysisState.isAnalyzing && !analysisState.error && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Upload an animated SVG file to extract morphing parameters and recreate the animation in SVG-Morph.
                </p>
                <div className="text-left max-w-md mx-auto">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Supported Animation Types:</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• SMIL animations (animate, animateTransform)</li>
                    <li>• CSS keyframe animations</li>
                    <li>• JavaScript-based morphing (GSAP, Anime.js)</li>
                    <li>• Path morphing and property animations</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
