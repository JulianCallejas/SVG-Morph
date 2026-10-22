import React, { useState, useCallback } from 'react';
import { useMorphStore } from '../store/morphStore';
import { exportSystem, ExportOptions, JavaScriptExportOptions, ExportResult, createExportOptions, VideoExportOptionsExtended } from '../utils/exportSystem';
import { useToast } from '../contexts/ToastContext';
import { activeContourPlan } from '../utils/contourSvg';
import { 
  Download, 
  FileText, 
  Image, 
  Code, 
  Database,
  History,
  Trash2,
  Loader2,
  Zap,
  Video
} from 'lucide-react';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';
import { Field, Select, CheckRow } from './ui/Fields';

const INPUT_CLASS = 'h-11 w-full bg-raised px-3 text-content placeholder:text-muted';

export const EnhancedExportPanel: React.FC = () => {
  const {
    sourceSVG,
    targetSVG,
    animationSettings,
    nodeMatches,
    manualModeEnabled,
    sourceContours,
    targetContours,
    contourPlan,
    contourPlanCustomized,
  } = useMorphStore();
  const canExport = !!sourceSVG && !!targetSVG;
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [exportOptions, setExportOptions] = useState<ExportOptions>(createExportOptions({
    duration: animationSettings.duration,
    easing: animationSettings.easing,
    loop: animationSettings.loop,
  }));
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exportResults, setExportResults] = useState<ExportResult[]>([]);
  const [jsOptions, setJsOptions] = useState<Partial<JavaScriptExportOptions>>({
    library: 'vanilla',
    includeLibraryImport: true,
    functionName: 'createSVGMorph',
    exportType: 'function',
    minified: false,
    includeTypeScript: false,
  });
  const [videoOptions, setVideoOptions] = useState({
    videoFormat: 'mp4' as 'gif' | 'mp4' | 'webm',
    width: 800,
    height: 600,
    fps: 30,
    quality: 'high' as 'low' | 'medium' | 'high' | 'ultra',
    backgroundColor: '#ffffff',
  });

  const formatIcons = {
    svg: Image,
    css: Code,
    smil: FileText,
    json: Database,
    javascript: Zap,
    video: Video,
  };

  const formatDescriptions = {
    svg: 'Animated SVG with CSS animations',
    css: 'CSS animation classes for external use',
    smil: 'SVG with SMIL animations (native)',
    json: 'Animation data in JSON format',
    javascript: 'JavaScript function for programmatic control',
    video: 'Video animation (MP4, WebM, GIF)',
  };

  const handleSingleExport = useCallback(async (format: ExportOptions['format']) => {
    if (!sourceSVG || !targetSVG) {
      showWarning('Missing SVG Files', 'Please load both source and target SVG files first.');
      return;
    }

    setIsExporting(true);
    try {
      let options: ExportOptions | JavaScriptExportOptions | VideoExportOptionsExtended;
      
      if (format === 'javascript') {
        options = { 
          ...exportOptions, 
          format,
          ...jsOptions 
        } as JavaScriptExportOptions;
      } else if (format === 'video') {
        options = {
          ...exportOptions,
          format,
          videoFormat: videoOptions.videoFormat,
          width: videoOptions.width,
          height: videoOptions.height,
          fps: videoOptions.fps,
          quality: videoOptions.quality,
          backgroundColor: videoOptions.backgroundColor,
        } as VideoExportOptionsExtended;
      } else {
        options = { ...exportOptions, format };
      }
      
      // Add manual node matches to export options if Manual Mode is enabled and pairs exist
      const shouldUseManualMatches = manualModeEnabled && nodeMatches.length > 0;
      // Same rule as the preview: the per-contour plan only applies to paths with several subpaths
      // or a plan the user edited, and never while the point-matching mode is selected.
      const activePlan = activeContourPlan(
        contourPlan,
        sourceContours,
        targetContours,
        contourPlanCustomized,
        manualModeEnabled,
      );
      const optionsWithMatches = {
        ...options,
        nodeMatches: shouldUseManualMatches ? nodeMatches : undefined,
        useManualMatching: shouldUseManualMatches,
        contourPlan: activePlan ?? undefined,
      };
      
      if (shouldUseManualMatches) {
        console.log('🎯 Export: Using manual node matches for export:', nodeMatches.length, 'matches');
      } else if (manualModeEnabled && nodeMatches.length === 0) {
        console.log('🟡 Export: Manual Mode enabled but no pairs, using default export');
      } else {
        console.log('⚡ Export: Manual Mode disabled, using default export');
      }
      
      const result = await exportSystem.exportAnimation(sourceSVG, targetSVG, optionsWithMatches);
      
      // Handle download for different content types
      if (result.content instanceof Blob) {
        const url = URL.createObjectURL(result.content);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        exportSystem.downloadResult(result);
      }
      
      setExportResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
      
      if (format === 'javascript') {
        showSuccess('JavaScript Export Complete', `Generated ${jsOptions.library} JavaScript function: ${jsOptions.functionName}`);
      } else if (format === 'video') {
        showSuccess('Video Export Complete', `Generated ${videoOptions.videoFormat.toUpperCase()} video: ${result.filename}`);
      } else {
        showSuccess('Export Complete', `Generated ${format.toUpperCase()} file: ${result.filename}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      showError('Export Failed', 'An error occurred during export. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [sourceSVG, targetSVG, exportOptions, jsOptions, videoOptions, nodeMatches, manualModeEnabled, sourceContours, targetContours, contourPlan, contourPlanCustomized, showWarning, showError, showSuccess]);

  const handleHistoryDownload = useCallback(() => {
    // In a real implementation, you'd re-export or store the content
    showInfo('Feature Coming Soon', 'Re-export functionality will be implemented in a future update.');
  }, [showInfo]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Export Options */}
      <Panel title="Export Options">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <Field label="Resolution Scale">
              <Select
                value={exportOptions.resolution}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  resolution: Number(e.target.value) as 1 | 2 | 4
                }))}
              >
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={4}>4x (Ultra High DPI)</option>
              </Select>
            </Field>

            <Field label="Duration (seconds)">
              <input
                type="number"
                value={exportOptions.duration}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  duration: Number(e.target.value)
                }))}
                className={INPUT_CLASS}
                min="0.1"
                max="10"
                step="0.1"
              />
            </Field>

            <Field label="Easing Function">
              <Select
                value={exportOptions.easing}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  easing: e.target.value
                }))}
              >
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In Out</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
              </Select>
            </Field>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <Field label="Filename (optional)">
              <input
                type="text"
                value={exportOptions.filename || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  filename: e.target.value || undefined
                }))}
                placeholder="Auto-generated if empty"
                className={INPUT_CLASS}
              />
            </Field>

            <div className="space-y-3">
              <CheckRow
                label="Include Animation"
                checked={exportOptions.includeAnimation}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeAnimation: e.target.checked
                }))}
              />

              <CheckRow
                label="Loop Animation"
                checked={exportOptions.loop}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  loop: e.target.checked
                }))}
              />

              <CheckRow
                label="Optimize SVG"
                checked={exportOptions.optimize}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  optimize: e.target.checked
                }))}
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* JavaScript Options */}
      <Panel title="JavaScript Options">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Library Selection */}
          <div className="space-y-4">
            <Field label="Animation Library">
              <Select
                value={jsOptions.library}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  library: e.target.value as 'vanilla' | 'gsap' | 'anime'
                }))}
              >
                <option value="vanilla">Vanilla JavaScript</option>
                <option value="gsap">GSAP (GreenSock)</option>
                <option value="anime">Anime.js</option>
              </Select>
            </Field>

            <Field label="Export Type">
              <Select
                value={jsOptions.exportType}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  exportType: e.target.value as 'function' | 'class' | 'module'
                }))}
              >
                <option value="function">Function</option>
                <option value="class">Class</option>
                <option value="module">ES6 Module</option>
              </Select>
            </Field>

            <Field label="Function/Class Name">
              <input
                type="text"
                value={jsOptions.functionName}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  functionName: e.target.value
                }))}
                className={INPUT_CLASS}
                placeholder="createSVGMorph"
              />
            </Field>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <CheckRow
                label="Include Library Import"
                checked={jsOptions.includeLibraryImport}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  includeLibraryImport: e.target.checked
                }))}
              />

              <CheckRow
                label="Minify Code"
                checked={jsOptions.minified}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  minified: e.target.checked
                }))}
              />

              <CheckRow
                label="Include TypeScript Definitions"
                checked={jsOptions.includeTypeScript}
                onChange={(e) => setJsOptions(prev => ({
                  ...prev,
                  includeTypeScript: e.target.checked
                }))}
              />
            </div>

            {/* Library Info */}
            <div className="p-4 bg-raised">
              <h4 className="font-medium mb-2">
                {jsOptions.library === 'vanilla' && 'Vanilla JavaScript'}
                {jsOptions.library === 'gsap' && 'GSAP (GreenSock)'}
                {jsOptions.library === 'anime' && 'Anime.js'}
              </h4>
              <p className="text-sm text-muted">
                {jsOptions.library === 'vanilla' && 'Pure JavaScript with no dependencies. Uses Web Animations API and requestAnimationFrame.'}
                {jsOptions.library === 'gsap' && 'Professional animation library with MorphSVG plugin. Requires GSAP license for commercial use.'}
                {jsOptions.library === 'anime' && 'Lightweight animation library (~17KB). MIT license, good SVG support.'}
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Format Selection */}
      <Panel title="Export Formats">
        {!canExport && (
          <p className="mb-4 text-sm text-muted">Load both SVG files to enable exporting.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(formatIcons).map(([format, Icon]) => (
            <div key={format} className="flex flex-col bg-raised p-4">
              <div className="mb-1 flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted" />
                <span className="font-medium uppercase">{format}</span>
              </div>
              <p className="mb-4 flex-1 text-sm text-muted">
                {formatDescriptions[format as keyof typeof formatDescriptions]}
              </p>
              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => handleSingleExport(format as ExportOptions['format'])}
                disabled={isExporting || !canExport}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export {format.toUpperCase()}
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={() => setShowHistory(!showHistory)}>
          <History className="w-4 h-4" />
          Export History
        </Button>
      </Panel>

      {/* Recent Exports */}
      {exportResults.length > 0 && (
        <Panel title="Recent Exports">
          <div className="space-y-2">
            {exportResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between gap-3 p-4 bg-raised">
                <div className="flex items-center gap-3 min-w-0">
                  <Download className="w-5 h-5 flex-shrink-0 text-link" />
                  <div className="min-w-0">
                    <p className="font-medium break-all">{result.filename}</p>
                    <p className="text-sm text-muted">{formatFileSize(result.size)}</p>
                  </div>
                </div>
                <Button onClick={() => exportSystem.downloadResult(result)}>
                  Download Again
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Export History */}
      {showHistory && (
        <Panel
          title="Export History"
          actions={
            <Button
              variant="ghost"
              onClick={() => {
                exportSystem.clearHistory();
                setShowHistory(false);
              }}
              className="text-danger"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </Button>
          }
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exportSystem.getHistory().map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 p-4 bg-raised">
                <div className="flex items-center gap-3 min-w-0">
                  {React.createElement(formatIcons[item.options.format], {
                    className: "w-5 h-5 flex-shrink-0 text-link"
                  })}
                  <div className="min-w-0">
                    <p className="font-medium break-all">{item.filename}</p>
                    <p className="text-sm text-muted">
                      {new Date(item.timestamp).toLocaleString()} • {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
                <Button onClick={() => handleHistoryDownload()}>
                  Re-export
                </Button>
              </div>
            ))}

            {exportSystem.getHistory().length === 0 && (
              <p className="text-center text-muted py-8">No export history available</p>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};
