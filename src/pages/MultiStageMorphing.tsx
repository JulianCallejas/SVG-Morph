import React, { useState, useCallback } from 'react';
import { Layers, Zap, Download, Video, FileText, Image, Settings, X } from 'lucide-react';
import { EnhancedMultiStageMorphingPanel } from '../components/EnhancedMultiStageMorphingPanel';
import { MultiStageSequence } from '../utils/multiStageMorphing';
import { SVGData } from '../types/svg';
import { exportSystem, VideoExportOptionsExtended, createVideoExportOptions } from '../utils/exportSystem';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/Fields';
import { Panel } from '../components/ui/Panel';

const INPUT_CLASS = 'h-11 w-full bg-raised px-3 text-content';

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
        <div className="w-full h-full flex items-center justify-center text-muted">
          <div className="text-center">
            <Layers className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-medium">No Preview Available</p>
            <p className="text-sm">Select a sequence to see the preview</p>
          </div>
        </div>
      );
    }

    // Check if paths exist and is an array
    if (!previewSVG.paths || !Array.isArray(previewSVG.paths)) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted">
          <div className="text-center">
            <Layers className="w-16 h-16 mx-auto mb-4" />
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
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.035em]">
            Multi-Stage Morphing
          </h1>
          <p className="mt-4 max-w-[70ch] text-lg text-muted">Create complex morphing sequences</p>
          {currentSequence && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Zap className="w-4 h-4" />
              <span>{currentSequence.name}</span>
              <span aria-hidden="true">•</span>
              <span>{currentSequence.stages.length} stages</span>
            </p>
          )}
        </header>

        {/* One column on small screens (builder, preview, details, export, tips); on large screens the
            preview stays in view on the right, sized to fit the viewport height, while everything else scrolls on the left. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
          {/* Control Panel */}
          <div className="lg:col-start-1">
            <EnhancedMultiStageMorphingPanel
              onSequenceChange={handleSequenceChange}
              onPreviewUpdate={handlePreviewUpdate}
            />
          </div>

          {/* Preview Panel */}
          <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-4 lg:row-start-1">
            <Panel
              title="Live Preview"
              actions={
                previewSVG && (
                  <div className="text-sm text-muted">
                    {previewSVG.width} × {previewSVG.height}
                  </div>
                )
              }
            >
              <div className="mx-auto aspect-square w-[min(100%,max(16rem,calc(100vh-14rem)))] bg-canvas p-8">
                {renderSVGPreview()}
              </div>
            </Panel>
          </div>

          {/* Sequence Information */}
          {currentSequence && (
            <Panel title="Sequence Details" className="lg:col-start-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-raised p-4">
                  <div className="text-3xl font-light text-link">{currentSequence.stages.length}</div>
                  <div className="text-sm text-muted">Stages</div>
                </div>
                <div className="bg-raised p-4">
                  <div className="text-3xl font-light text-link">{(currentSequence.totalDuration / 1000).toFixed(1)}s</div>
                  <div className="text-sm text-muted">Duration</div>
                </div>
              </div>

              <h3 className="mb-3 font-medium">Stage Timeline</h3>
              <ol className="list-decimal space-y-3 pl-6 marker:text-muted">
                {currentSequence.stages.map((stage) => (
                  <li key={stage.id}>
                    <div className="font-medium">{stage.name}</div>
                    <div className="text-sm text-muted">
                      {stage.duration}ms • {stage.easing}
                      {stage.delay > 0 && ` • ${stage.delay}ms delay`}
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {/* Quick Actions */}
          <Panel title="Export Options" className="lg:col-start-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="primary"
                className="justify-center"
                onClick={() => setShowExportPanel(true)}
                disabled={!currentSequence || isExporting}
              >
                <Download className="w-4 h-4" />
                <span>Export Sequence</span>
              </Button>
              <Button
                className="justify-center"
                onClick={() => handleExport('svg')}
                disabled={!currentSequence || isExporting}
              >
                <Image className="w-4 h-4" />
                <span>Quick SVG</span>
              </Button>
            </div>
          </Panel>

          {/* Tips & Help */}
          <Panel title="Tips & Features" className="lg:col-start-1">
            <ul className="list-disc space-y-3 pl-5 text-sm text-muted marker:text-link">
              <li>
                <strong className="font-medium text-content">Multi-Stage Sequences:</strong> Create complex animations by chaining multiple SVG morphs together
              </li>
              <li>
                <strong className="font-medium text-content">Custom Timing:</strong> Set individual durations, delays, and easing functions for each stage
              </li>
              <li>
                <strong className="font-medium text-content">Loop & Reverse:</strong> Enable looping or auto-reverse for continuous animations
              </li>
              <li>
                <strong className="font-medium text-content">Export Options:</strong> Save sequences as JSON files or export as video/code
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      {/* Export Panel Modal */}
      {showExportPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-sequence-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-surface shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 id="export-sequence-title" className="text-2xl font-medium">Export Sequence</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowExportPanel(false)} aria-label="Close export dialog">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {currentSequence && (
                <div className="mb-6 bg-raised p-4">
                  <h3 className="font-medium mb-2">{currentSequence.name}</h3>
                  <div className="text-sm text-muted">
                    {currentSequence.stages.length} stages • {(currentSequence.totalDuration / 1000).toFixed(1)}s duration
                    {currentSequence.loop && ' • Looping'}
                    {currentSequence.autoReverse && ' • Auto-reverse'}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Export Format Selection */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Export Format</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleExport('svg')}
                      disabled={isExporting}
                      className="press flex flex-col items-center bg-raised p-4 transition-colors hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Image className="w-8 h-8 text-link mb-2" />
                      <span className="font-medium">Static SVG</span>
                      <span className="text-sm text-muted text-center">First stage as SVG file</span>
                    </button>

                    <button
                      onClick={() => handleExport('smil')}
                      disabled={isExporting}
                      className="press flex flex-col items-center bg-raised p-4 transition-colors hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileText className="w-8 h-8 text-link mb-2" />
                      <span className="font-medium">SMIL SVG</span>
                      <span className="text-sm text-muted text-center">Animated SVG with SMIL</span>
                    </button>

                    <button
                      onClick={() => handleExport('video')}
                      disabled={isExporting || !currentSequence || currentSequence.stages.length < 2}
                      className="press flex flex-col items-center bg-raised p-4 transition-colors hover:bg-line/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Video className="w-8 h-8 text-link mb-2" />
                      <span className="font-medium">Video</span>
                      <span className="text-sm text-muted text-center">MP4, WebM, or GIF</span>
                    </button>
                  </div>
                </div>

                {/* Video Export Options */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-link" />
                    <h3 className="text-lg font-medium">Video Export Settings</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Format">
                      <Select
                        value={videoOptions.videoFormat}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, videoFormat: e.target.value as 'gif' | 'mp4' | 'webm' }))}
                      >
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                        <option value="gif">GIF</option>
                      </Select>
                    </Field>

                    <Field label="Quality">
                      <Select
                        value={videoOptions.quality}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra' }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="ultra">Ultra</option>
                      </Select>
                    </Field>

                    <Field label="Width">
                      <input
                        type="number"
                        value={videoOptions.width}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                        className={INPUT_CLASS}
                        min="100"
                        max="4096"
                      />
                    </Field>

                    <Field label="Height">
                      <input
                        type="number"
                        value={videoOptions.height}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, height: parseInt(e.target.value) || 600 }))}
                        className={INPUT_CLASS}
                        min="100"
                        max="4096"
                      />
                    </Field>

                    <Field label="Frame Rate (FPS)">
                      <input
                        type="number"
                        value={videoOptions.fps}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, fps: parseInt(e.target.value) || 30 }))}
                        className={INPUT_CLASS}
                        min="1"
                        max="120"
                      />
                    </Field>

                    <Field label="Background Color">
                      <input
                        type="color"
                        value={videoOptions.backgroundColor}
                        onChange={(e) => setVideoOptions(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="h-11 w-full cursor-pointer bg-raised p-1"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowExportPanel(false)} disabled={isExporting}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
