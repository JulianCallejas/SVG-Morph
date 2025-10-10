import React, { useState, useCallback } from 'react';
import { ArrowLeft, Layers, Zap, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnhancedMultiStageMorphingPanel } from '../components/EnhancedMultiStageMorphingPanel';
import { MultiStageSequence } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';

export const MultiStageMorphing: React.FC = () => {
  const [currentSequence, setCurrentSequence] = useState<MultiStageSequence | null>(null);
  const [previewSVG, setPreviewSVG] = useState<SVGData | null>(null);

  const handleSequenceChange = useCallback((sequence: MultiStageSequence | null) => {
    setCurrentSequence(sequence);
    // Show the first stage when sequence is selected
    if (sequence && sequence.stages.length > 0) {
      setPreviewSVG(sequence.stages[0].svgData);
    } else {
      setPreviewSVG(null);
    }
  }, []);

  const handlePreviewUpdate = useCallback((svgData: SVGData) => {
    setPreviewSVG(svgData);
  }, []);

  const renderSVGPreview = () => {
    if (!previewSVG) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Preview Available</p>
            <p className="text-sm">Select a sequence to see the preview</p>
          </div>
        </div>
      );
    }

    const svgContent = `
      <svg 
        width="100%" 
        height="100%" 
        viewBox="${previewSVG.viewBox}" 
        xmlns="http://www.w3.org/2000/svg"
        style="max-width: 100%; max-height: 100%;"
      >
        ${previewSVG.paths.map(path => `
          <path 
            d="${path.d}" 
            fill="${path.fill || 'none'}" 
            stroke="${path.stroke || 'none'}" 
            stroke-width="${path.strokeWidth || '1'}"
            opacity="${path.opacity || '1'}"
          />
        `).join('')}
      </svg>
    `;

    return (
      <div 
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Multi-Stage Morphing</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create complex morphing sequences</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {currentSequence && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Zap className="w-4 h-4" />
                  <span>{currentSequence.name}</span>
                  <span>•</span>
                  <span>{currentSequence.stages.length} stages</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="space-y-6">
            <EnhancedMultiStageMorphingPanel
              onSequenceChange={handleSequenceChange}
              onPreviewUpdate={handlePreviewUpdate}
            />

            {/* Sequence Information */}
            {currentSequence && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sequence Details</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent">{currentSequence.stages.length}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Stages</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-2xl font-bold text-secondary">{(currentSequence.totalDuration / 1000).toFixed(1)}s</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Stage Timeline</h4>
                  <div className="space-y-2">
                    {currentSequence.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{stage.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {stage.duration}ms • {stage.easing}
                            {stage.delay > 0 && ` • ${stage.delay}ms delay`}
                          </div>
                        </div>
                        {index < currentSequence.stages.length - 1 && (
                          <div className="text-gray-400">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="flex items-center justify-center space-x-2 p-3 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export as Video</span>
                </button>
                <button className="flex items-center justify-center space-x-2 p-3 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors">
                  <Zap className="w-4 h-4" />
                  <span>Generate Code</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h3>
                  {previewSVG && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {previewSVG.width} × {previewSVG.height}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="aspect-square bg-gray-50 dark:bg-gray-700 p-8">
                {renderSVGPreview()}
              </div>
            </div>

            {/* Tips & Help */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tips & Features</h3>
              
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Multi-Stage Sequences:</strong> Create complex animations by chaining multiple SVG morphs together
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Custom Timing:</strong> Set individual durations, delays, and easing functions for each stage
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Loop & Reverse:</strong> Enable looping or auto-reverse for continuous animations
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">Export Options:</strong> Save sequences as JSON files or export as video/code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
