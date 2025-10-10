import React, { useState, useCallback } from 'react';
import { ArrowLeft, Layers, Zap, Download, Video, FileText, Image, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EnhancedMultiStageMorphingPanel } from '../components/EnhancedMultiStageMorphingPanel';
import { MultiStageSequence } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';
import { exportSystem, VideoExportOptionsExtended, createVideoExportOptions } from '../utils/exportSystem';
import { useToast } from '../contexts/ToastContext';

export const MultiStageMorphing: React.FC = () => {
  const [currentSequence, setCurrentSequence] = useState<MultiStageSequence | null>(null);
  const [previewSVG, setPreviewSVG] = useState<SVGData | null>(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [videoOptions, setVideoOptions] = useState({
    videoFormat: 'mp4' as 'gif' | 'mp4' | 'webm',
    width: 800,
    height: 600,
    fps: 30,
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    backgroundColor: '#ffffff',
  });
  const { showSuccess, showError, showWarning } = useToast();

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

  const convertSVGDataToString = (svgData: SVGData): string => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgData.width}" height="${svgData.height}" viewBox="${svgData.viewBox}">
${svgData.paths.map(path => `  <path d="${path.d}" fill="${path.fill || 'none'}" stroke="${path.stroke || 'none'}" stroke-width="${path.strokeWidth || 1}" opacity="${path.opacity || 1}" />`).join('\n')}
</svg>`;
  };

  const generateSequenceSMIL = (sequence: MultiStageSequence): string => {
    if (sequence.stages.length < 2) {
      return convertSVGDataToString(sequence.stages[0]?.svgData || { paths: [], viewBox: '0 0 400 400', width: 400, height: 400 });
    }

    const firstStage = sequence.stages[0];
    const totalDuration = sequence.totalDuration / 1000; // Convert to seconds
    const repeatCount = sequence.loop ? 'indefinite' : '1';

    // Create SMIL animation for the entire sequence
    const pathAnimations = firstStage.svgData.paths.map((_, pathIndex) => {
      const pathValues = sequence.stages.map(stage => {
        const path = stage.svgData.paths[pathIndex];
        return path ? path.d : firstStage.svgData.paths[pathIndex]?.d || '';
      }).join(';');

      const fillValues = sequence.stages.map(stage => {
        const path = stage.svgData.paths[pathIndex];
        return path ? (path.fill || 'none') : (firstStage.svgData.paths[pathIndex]?.fill || 'none');
      }).join(';');

      const opacityValues = sequence.stages.map(stage => {
        const path = stage.svgData.paths[pathIndex];
        return path ? (path.opacity || 1) : (firstStage.svgData.paths[pathIndex]?.opacity || 1);
      }).join(';');

      const firstPath = firstStage.svgData.paths[pathIndex];
      if (!firstPath) return '';

      return `    <path id="path-${pathIndex}" d="${firstPath.d}" fill="${firstPath.fill || 'none'}" stroke="${firstPath.stroke || 'none'}" stroke-width="${firstPath.strokeWidth || 1}" opacity="${firstPath.opacity || 1}">
      <animate attributeName="d" values="${pathValues}" dur="${totalDuration}s" repeatCount="${repeatCount}" calcMode="spline" keySplines="${sequence.stages.slice(1).map(() => '0.4 0 0.6 1').join(';')}" keyTimes="${sequence.stages.map((_, i) => (i / (sequence.stages.length - 1)).toFixed(2)).join(';')}" />
      <animate attributeName="fill" values="${fillValues}" dur="${totalDuration}s" repeatCount="${repeatCount}" />
      <animate attributeName="opacity" values="${opacityValues}" dur="${totalDuration}s" repeatCount="${repeatCount}" />
    </path>`;
    }).filter(Boolean).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${firstStage.svgData.width}" height="${firstStage.svgData.height}" viewBox="${firstStage.svgData.viewBox}">
  <defs>
    <style>
      path:not([fill]) { fill: none !important; }
      path[fill=""] { fill: none !important; }
    </style>
  </defs>
${pathAnimations}
</svg>`;
  };

  const handleExport = async (format: 'svg' | 'smil' | 'video') => {
    if (!currentSequence) {
      showWarning('No Sequence Selected', 'Please create and select a sequence to export.');
      return;
    }

    if (currentSequence.stages.length === 0) {
      showWarning('Empty Sequence', 'The selected sequence has no stages to export.');
      return;
    }

    setIsExporting(true);
    try {
      let result;
      const sequenceName = currentSequence.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

      switch (format) {
        case 'svg': {
          // Export as static SVG (first stage)
          const svgContent = convertSVGDataToString(currentSequence.stages[0].svgData);
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${sequenceName}-static.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showSuccess('SVG Export Complete', `Exported static SVG: ${sequenceName}-static.svg`);
          break;
        }

        case 'smil': {
          // Export as SMIL animated SVG
          const smilContent = generateSequenceSMIL(currentSequence);
          const blob = new Blob([smilContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${sequenceName}-animated.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showSuccess('SMIL Export Complete', `Exported animated SVG: ${sequenceName}-animated.svg`);
          break;
        }

        case 'video': {
          // Export as video using the video export system
          if (currentSequence.stages.length < 2) {
            showWarning('Insufficient Stages', 'Video export requires at least 2 stages in the sequence.');
            return;
          }

          const sourceSVG = convertSVGDataToString(currentSequence.stages[0].svgData);
          const targetSVG = convertSVGDataToString(currentSequence.stages[currentSequence.stages.length - 1].svgData);

          const videoExportOptions: VideoExportOptionsExtended = {
            ...createVideoExportOptions(),
            videoFormat: videoOptions.videoFormat,
            width: videoOptions.width,
            height: videoOptions.height,
            fps: videoOptions.fps,
            quality: videoOptions.quality,
            backgroundColor: videoOptions.backgroundColor,
            duration: currentSequence.totalDuration / 1000, // Convert to seconds
            loop: currentSequence.loop,
            filename: `${sequenceName}-sequence.${videoOptions.videoFormat}`,
          };

          result = await exportSystem.exportAnimation(sourceSVG, targetSVG, videoExportOptions);
          
          if (result.content instanceof Blob) {
            const url = URL.createObjectURL(result.content);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }

          showSuccess('Video Export Complete', `Generated ${videoOptions.videoFormat.toUpperCase()} video: ${result.filename}`);
          break;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export Failed', 'An error occurred during export. Please check the console for details.');
    } finally {
      setIsExporting(false);
      setShowExportPanel(false);
    }
  };

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

    // Check if paths exist and is an array
    if (!previewSVG.paths || !Array.isArray(previewSVG.paths)) {
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Invalid SVG Data</p>
            <p className="text-sm">SVG paths are missing or invalid</p>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Options</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowExportPanel(true)}
                  disabled={!currentSequence || isExporting}
                  className="flex items-center justify-center space-x-2 p-3 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Sequence</span>
                </button>
                <button 
                  onClick={() => handleExport('svg')}
                  disabled={!currentSequence || isExporting}
                  className="flex items-center justify-center space-x-2 p-3 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image className="w-4 h-4" />
                  <span>Quick SVG</span>
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

      {/* Export Panel Modal */}
      {showExportPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Sequence</h2>
                <button
                  onClick={() => setShowExportPanel(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {currentSequence && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{currentSequence.name}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {currentSequence.stages.length} stages • {(currentSequence.totalDuration / 1000).toFixed(1)}s duration
                    {currentSequence.loop && ' • Looping'}
                    {currentSequence.autoReverse && ' • Auto-reverse'}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Export Format Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Format</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleExport('svg')}
                      disabled={isExporting}
                      className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Image className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
                      <span className="font-medium text-gray-900 dark:text-white">Static SVG</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">First stage as SVG file</span>
                    </button>
                    
                    <button
                      onClick={() => handleExport('smil')}
                      disabled={isExporting}
                      className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-secondary hover:bg-secondary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
                      <span className="font-medium text-gray-900 dark:text-white">SMIL SVG</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Animated SVG with SMIL</span>
                    </button>
                    
                    <button
                      onClick={() => handleExport('video')}
                      disabled={isExporting || !currentSequence || currentSequence.stages.length < 2}
                      className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="w-8 h-8 text-gray-600 dark:text-gray-400 mb-2" />
                      <span className="font-medium text-gray-900 dark:text-white">Video</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">MP4, WebM, or GIF</span>
                    </button>
                  </div>
                </div>

                {/* Video Export Options */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Video Export Settings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Format
                      </label>
                      <select
                        value={videoOptions.videoFormat}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, videoFormat: e.target.value as 'gif' | 'mp4' | 'webm' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="gif">GIF</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quality
                      </label>
                      <select
                        value={videoOptions.quality}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Width
                      </label>
                      <input
                        type="number"
                        value={videoOptions.width}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                        min="100"
                        max="4096"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Height
                      </label>
                      <input
                        type="number"
                        value={videoOptions.height}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                        min="100"
                        max="4096"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Frame Rate (FPS)
                      </label>
                      <input
                        type="number"
                        value={videoOptions.fps}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, fps: parseInt(e.target.value) || 30 }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                        min="1"
                        max="120"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={videoOptions.backgroundColor}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowExportPanel(false)}
                  disabled={isExporting}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
