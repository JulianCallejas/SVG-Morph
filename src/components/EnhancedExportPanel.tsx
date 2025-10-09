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
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Export Options</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Scale
              </label>
              <select
                value={exportOptions.resolution}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  resolution: Number(e.target.value) as 1 | 2 | 4
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1x (Standard)</option>
                <option value={2}>2x (High DPI)</option>
                <option value={4}>4x (Ultra High DPI)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={exportOptions.duration}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  duration: Number(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0.1"
                max="10"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Easing Function
              </label>
              <select
                value={exportOptions.easing}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  easing: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnimation}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    includeAnimation: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Include Animation</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.loop}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    loop: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Loop Animation</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportOptions.optimize}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    optimize: e.target.checked
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Optimize SVG</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Export Formats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(formatIcons).map(([format, Icon]) => (
            <div
              key={format}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedFormats.has(format as ExportOptions['format'])
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleFormatToggle(format as ExportOptions['format'])}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {selectedFormats.has(format as ExportOptions['format']) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900 uppercase">{format}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDescriptions[format as keyof typeof formatDescriptions]}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSingleExport(format as ExportOptions['format']);
                  }}
                  disabled={isExporting || !sourceSVG || !targetSVG}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <History className="w-4 h-4" />
            Export History
          </button>
        </div>
      </div>

      {/* Recent Exports */}
      {exportResults.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Recent Exports</h3>
          <div className="space-y-2">
            {exportResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{result.filename}</p>
                    <p className="text-sm text-gray-600">{formatFileSize(result.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => exportSystem.downloadResult(result)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
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
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Export History</h3>
            <button
              onClick={() => {
                exportSystem.clearHistory();
                setShowHistory(false);
              }}
              className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {exportSystem.getHistory().map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {React.createElement(formatIcons[item.options.format], {
                      className: "w-4 h-4 text-gray-600"
                    })}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.filename}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(item.timestamp).toLocaleString()} • {formatFileSize(item.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleHistoryDownload(item)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Re-export
                </button>
              </div>
            ))}
            
            {exportSystem.getHistory().length === 0 && (
              <p className="text-center text-gray-500 py-8">No export history available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
