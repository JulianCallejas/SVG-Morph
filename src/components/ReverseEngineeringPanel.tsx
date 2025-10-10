import React, { useState, useCallback, useRef } from 'react';
import { Upload, Search, Download, Eye, Code, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { reverseEngineering, ExtractedAnimation, ReverseEngineeringOptions } from '../utils/reverseEngineering';
import { useToast } from '../contexts/ToastContext';

interface ReverseEngineeringPanelProps {
  onAnimationExtracted?: (animation: ExtractedAnimation) => void;
  onConvertToMorph?: (sourceSVG: any, targetSVG: any, settings: any) => void;
}

export const ReverseEngineeringPanel: React.FC<ReverseEngineeringPanelProps> = ({
  onAnimationExtracted,
  onConvertToMorph
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedAnimations, setExtractedAnimations] = useState<ExtractedAnimation[]>([]);
  const [selectedAnimation, setSelectedAnimation] = useState<ExtractedAnimation | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState<ReverseEngineeringOptions>({
    sampleRate: 30,
    minConfidence: 0.7,
    extractProperties: true,
    simplifyPaths: true,
    detectEasing: true
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showWarning } = useToast();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg')) {
      showWarning('Please select an SVG file');
      return;
    }

    setIsAnalyzing(true);
    try {
      const svgContent = await file.text();
      const animations = await reverseEngineering.analyzeSVGAnimation(svgContent, analysisOptions);
      
      setExtractedAnimations(animations);
      
      if (animations.length === 0) {
        showWarning('No animations found in the SVG file');
      } else {
        showSuccess(`Found ${animations.length} animation${animations.length > 1 ? 's' : ''}`);
        if (onAnimationExtracted && animations[0]) {
          onAnimationExtracted(animations[0]);
        }
      }
    } catch (error) {
      showError(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [analysisOptions, onAnimationExtracted, showSuccess, showError, showWarning]);

  const handleAnimationSelect = useCallback((animation: ExtractedAnimation) => {
    setSelectedAnimation(animation);
    if (onAnimationExtracted) {
      onAnimationExtracted(animation);
    }
  }, [onAnimationExtracted]);

  const handleConvertToMorph = useCallback((animation: ExtractedAnimation) => {
    const morphData = reverseEngineering.convertToMorphingSequence(animation);
    if (!morphData) {
      showError('Cannot convert this animation to morphing sequence');
      return;
    }

    if (onConvertToMorph) {
      onConvertToMorph(morphData.sourceSVG, morphData.targetSVG, morphData.settings);
      showSuccess('Animation converted to morphing sequence');
    }
  }, [onConvertToMorph, showSuccess, showError]);

  const handleExportAnimation = useCallback((animation: ExtractedAnimation) => {
    const dataStr = JSON.stringify(animation, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${animation.name.replace(/\s+/g, '_')}_extracted.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    showSuccess(`Animation "${animation.name}" exported`);
  }, [showSuccess]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reverse Engineering</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Analyze existing SVG animations</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Code className="w-5 h-5" />
        </button>
      </div>

      {/* File Upload */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all"
        >
          {isAnalyzing ? (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-accent animate-pulse" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">Analyzing Animation...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Extracting keyframes and properties</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 dark:text-white">Upload Animated SVG</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drop an SVG file or click to browse</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvancedOptions && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Analysis Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sample Rate (fps)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={analysisOptions.sampleRate}
                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, sampleRate: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Confidence
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={analysisOptions.minConfidence}
                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={analysisOptions.extractProperties}
                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, extractProperties: e.target.checked }))}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white">Extract Properties</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={analysisOptions.simplifyPaths}
                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, simplifyPaths: e.target.checked }))}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white">Simplify Paths</span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={analysisOptions.detectEasing}
                onChange={(e) => setAnalysisOptions(prev => ({ ...prev, detectEasing: e.target.checked }))}
                className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <span className="text-gray-900 dark:text-white">Detect Easing</span>
            </label>
          </div>
        </div>
      )}

      {/* Extracted Animations */}
      {extractedAnimations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Extracted Animations</h3>
          
          <div className="space-y-3">
            {extractedAnimations.map((animation) => (
              <div
                key={animation.id}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedAnimation?.id === animation.id
                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-accent/50'
                }`}
                onClick={() => handleAnimationSelect(animation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{animation.name}</h4>
                      <span className={`inline-flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${getConfidenceColor(animation.confidence)} bg-current bg-opacity-10`}>
                        {getConfidenceIcon(animation.confidence)}
                        <span>{Math.round(animation.confidence * 100)}%</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{(animation.duration / 1000).toFixed(1)}s</span>
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {animation.sourceType.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">Keyframes:</span> {animation.keyframes.length}
                      </div>
                      <div>
                        <span className="font-medium">Complexity:</span> 
                        <span className={`ml-1 ${getComplexityColor(animation.metadata.complexity)}`}>
                          {animation.metadata.complexity}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Easing:</span> {animation.easing}
                      {animation.metadata.pathCount > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Paths:</span> {animation.metadata.pathCount}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvertToMorph(animation);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Convert to Morph"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportAnimation(animation);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export Animation"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Animation Details */}
      {selectedAnimation && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Animation Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Original Format:</span>
                <p className="text-gray-900 dark:text-white">{selectedAnimation.metadata.originalFormat}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Extracted At:</span>
                <p className="text-gray-900 dark:text-white">
                  {selectedAnimation.metadata.extractedAt.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                <p className="text-gray-900 dark:text-white">{selectedAnimation.duration}ms</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Easing Function:</span>
                <p className="text-gray-900 dark:text-white">{selectedAnimation.easing}</p>
              </div>
            </div>
          </div>

          {selectedAnimation.keyframes.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Keyframes Timeline</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedAnimation.keyframes.map((keyframe, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <div className="w-8 h-8 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-gray-900 dark:text-white">
                        {Math.round(keyframe.progress * 100)}% ({keyframe.time}ms)
                      </div>
                      {Object.keys(keyframe.properties).length > 0 && (
                        <div className="text-gray-600 dark:text-gray-400 text-xs">
                          {Object.entries(keyframe.properties).map(([key, value]) => (
                            <span key={key} className="mr-3">{key}: {value}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {extractedAnimations.length === 0 && !isAnalyzing && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No animations analyzed yet</p>
          <p className="text-sm">Upload an animated SVG file to get started</p>
        </div>
      )}
    </div>
  );
};
