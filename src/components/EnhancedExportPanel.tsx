import React, { useState, useCallback } from 'react';
import { useMorphStore } from '../store/morphStore';
import { exportSystem, ExportOptions, ExportResult, createExportOptions } from '../utils/exportSystem';
import { 
  Download, 
  Settings, 
  FileText, 
  Image, 
  Code, 
  Database,
  History,
  Trash2,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

export const EnhancedExportPanel: React.FC = () => {
  const { sourceSVG, targetSVG, animationSettings } = useMorphStore();
  const [exportOptions, setExportOptions] = useState<ExportOptions>(createExportOptions({
    duration: animationSettings.duration,
    easing: animationSettings.easing,
    loop: animationSettings.loop,
  }));
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportOptions['format']>>(new Set(['svg']));
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [exportResults, setExportResults] = useState<ExportResult[]>([]);

  const formatIcons = {
    svg: Image,
    css: Code,
    smil: FileText,
    json: Database,
  };

  const formatDescriptions = {
    svg: 'Animated SVG with CSS animations',
    css: 'CSS animation classes for external use',
    smil: 'SVG with SMIL animations (native)',
    json: 'Animation data in JSON format',
  };

  const handleFormatToggle = useCallback((format: ExportOptions['format']) => {
    const newSelected = new Set(selectedFormats);
    if (newSelected.has(format)) {
      newSelected.delete(format);
    } else {
      newSelected.add(format);
    }
    setSelectedFormats(newSelected);
  }, [selectedFormats]);

  const handleSingleExport = useCallback(async (format: ExportOptions['format']) => {
    if (!sourceSVG || !targetSVG) {
      alert('Please load both source and target SVG files first.');
      return;
    }

    setIsExporting(true);
    try {
      const options = { ...exportOptions, format };
      const result = await exportSystem.exportAnimation(sourceSVG, targetSVG, options);
      exportSystem.downloadResult(result);
      setExportResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [sourceSVG, targetSVG, exportOptions]);

  const handleBatchExport = useCallback(async () => {
    if (!sourceSVG || !targetSVG) {
      alert('Please load both source and target SVG files first.');
      return;
    }

    if (selectedFormats.size === 0) {
      alert('Please select at least one format to export.');
      return;
    }

    setIsExporting(true);
    try {
      const formatOptions = Array.from(selectedFormats).map(format => ({
        ...exportOptions,
        format,
      }));

      const results = await exportSystem.batchExport(sourceSVG, targetSVG, formatOptions);
      
      // Download all results
      results.forEach(result => {
        setTimeout(() => exportSystem.downloadResult(result), 100);
      });

      setExportResults(prev => [...results, ...prev].slice(0, 10)); // Keep last 10 results
      alert(`Successfully exported ${results.length} format(s)!`);
    } catch (error) {
      console.error('Batch export failed:', error);
      alert('Batch export failed. Please check the console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [sourceSVG, targetSVG, selectedFormats, exportOptions]);

  const handleHistoryDownload = useCallback((historyItem: any) => {
    // In a real implementation, you'd re-export or store the content
    alert('Re-export functionality would be implemented here.');
  }, []);

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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Export Options</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolution Scale
              </label>
              <select
                value={exportOptions.resolution}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  resolution: Number(e.target.value) as 1 | 2 | 4
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              >
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={4}>4x (Ultra High DPI)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={exportOptions.duration}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  duration: Number(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                min="0.1"
                max="10"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Easing Function
              </label>
              <select
                value={exportOptions.easing}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  easing: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              >
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In Out</option>
                <option value="bounce">Bounce</option>
                <option value="elastic">Elastic</option>
              </select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filename (optional)
              </label>
              <input
                type="text"
                value={exportOptions.filename || ''}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  filename: e.target.value || undefined
                }))}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnimation}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeAnimation: e.target.checked
                  }))}
                  className="mr-3 w-4 h-4 text-accent bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Animation</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.loop}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    loop: e.target.checked
                  }))}
                  className="mr-3 w-4 h-4 text-accent bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Loop Animation</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.optimize}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    optimize: e.target.checked
                  }))}
                  className="mr-3 w-4 h-4 text-accent bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-accent focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Optimize SVG</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center">
            <Download className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Export Formats</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(formatIcons).map(([format, Icon]) => (
            <div
              key={format}
              className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                selectedFormats.has(format as ExportOptions['format'])
                  ? 'border-accent bg-accent/10 dark:bg-accent/20 shadow-md'
                  : 'border-gray-200 dark:border-gray-600 hover:border-accent/50 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleFormatToggle(format as ExportOptions['format'])}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {selectedFormats.has(format as ExportOptions['format']) ? (
                    <CheckSquare className="w-5 h-5 text-accent" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 uppercase">{format}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDescriptions[format as keyof typeof formatDescriptions]}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSingleExport(format as ExportOptions['format']);
                  }}
                  disabled={isExporting || !sourceSVG || !targetSVG}
                  className="px-3 py-1 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Export Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBatchExport}
            disabled={isExporting || selectedFormats.size === 0 || !sourceSVG || !targetSVG}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export Selected ({selectedFormats.size})
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            <History className="w-4 h-4" />
            Export History
          </button>
        </div>
      </div>

      {/* Recent Exports */}
      {exportResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Exports</h3>
          </div>
          <div className="space-y-2">
            {exportResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-lg flex items-center justify-center">
                    <Download className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{result.filename}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatFileSize(result.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => exportSystem.downloadResult(result)}
                  className="px-4 py-2 text-sm bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors font-medium"
                >
                  Download Again
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export History */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center">
                <History className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Export History</h3>
            </div>
            <button
              onClick={() => {
                exportSystem.clearHistory();
                setShowHistory(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exportSystem.getHistory().map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center">
                    {React.createElement(formatIcons[item.options.format], {
                      className: "w-4 h-4 text-white"
                    })}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.filename}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()} • {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleHistoryDownload(item)}
                  className="px-4 py-2 text-sm bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors font-medium"
                >
                  Re-export
                </button>
              </div>
            ))}
            
            {exportSystem.getHistory().length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No export history available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
