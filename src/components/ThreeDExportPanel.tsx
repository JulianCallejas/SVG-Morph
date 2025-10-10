import React, { useState, useCallback } from 'react';
import { Download, FileText, Box, Layers, Globe, X } from 'lucide-react';
import { threeDExporter, ThreeDExportOptions, ExportResult } from '../utils/threeDExport';
import { ThreeDScene } from '../utils/threeDMorphing';
import { useToast } from '../contexts/ToastContext';

interface ThreeDExportPanelProps {
  scene: ThreeDScene | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ThreeDExportPanel: React.FC<ThreeDExportPanelProps> = ({
  scene,
  isOpen,
  onClose
}) => {
  const [exportOptions, setExportOptions] = useState<ThreeDExportOptions>({
    format: 'obj',
    quality: 'medium',
    includeTextures: true,
    includeNormals: true,
    scale: 1.0,
    centerModel: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccess, showError, showWarning } = useToast();

  const formatInfo = {
    obj: {
      name: 'Wavefront OBJ',
      description: 'Universal format compatible with Paint 3D, Blender, 3ds Max, Maya',
      icon: FileText,
      extension: '.obj',
      compatibility: ['Paint 3D', 'Blender', '3ds Max', 'Maya', 'SketchUp'],
      features: ['Geometry', 'Materials', 'Textures', 'Groups']
    },
    stl: {
      name: 'Stereolithography',
      description: 'Perfect for 3D printing and CAD applications',
      icon: Box,
      extension: '.stl',
      compatibility: ['Paint 3D', '3D Printing Software', 'CAD Programs', 'Fusion 360'],
      features: ['Geometry', '3D Printing Ready', 'Solid Models']
    },
    ply: {
      name: 'Polygon File Format',
      description: 'Research-grade format with vertex colors and properties',
      icon: Layers,
      extension: '.ply',
      compatibility: ['MeshLab', 'CloudCompare', 'Research Software', 'Blender'],
      features: ['Geometry', 'Vertex Colors', 'Properties', 'Research Tools']
    },
    gltf: {
      name: 'GL Transmission Format',
      description: 'Modern web standard for 3D content and Three.js projects',
      icon: Globe,
      extension: '.gltf',
      compatibility: ['Three.js', 'Web Browsers', 'Unity', 'Unreal Engine'],
      features: ['Geometry', 'Materials', 'Animations', 'Web Optimized']
    }
  };

  const qualitySettings = {
    low: { description: 'Faster export, smaller files', multiplier: 0.5 },
    medium: { description: 'Balanced quality and file size', multiplier: 1.0 },
    high: { description: 'Best quality, larger files', multiplier: 2.0 }
  };

  const handleExport = useCallback(async () => {
    if (!scene) {
      showWarning('No 3D scene available for export');
      return;
    }

    setIsExporting(true);
    try {
      threeDExporter.setScene(scene);
      const result: ExportResult = await threeDExporter.export3DModel(exportOptions);

      // Create download link
      let blob: Blob;
      if (typeof result.data === 'string') {
        blob = new Blob([result.data], { type: result.mimeType });
      } else {
        blob = new Blob([result.data], { type: result.mimeType });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();

      // Cleanup
      URL.revokeObjectURL(url);

      showSuccess(`3D model exported as ${exportOptions.format.toUpperCase()}! File size: ${(result.size / 1024).toFixed(1)}KB`);
    } catch (error) {
      showError(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  }, [scene, exportOptions, showSuccess, showError, showWarning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Export 3D Model</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Choose format and export options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* Format Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formatInfo).map(([format, info]) => {
                const Icon = info.icon;
                const isSelected = exportOptions.format === format;
                return (
                  <div
                    key={format}
                    onClick={() => setExportOptions(prev => ({ ...prev, format: format as any }))}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'border-accent bg-accent/5 shadow-lg'
                        : 'border-gray-200 dark:border-gray-600 hover:border-accent/50 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected 
                          ? 'bg-gradient-to-br from-accent to-accent/80' 
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{info.name}</h4>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            {info.extension}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{info.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {info.features.slice(0, 3).map((feature) => (
                            <span
                              key={feature}
                              className="text-xs bg-accent/10 text-accent px-2 py-1 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quality Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Quality
                  </label>
                  <select
                    value={exportOptions.quality}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    {Object.entries(qualitySettings).map(([quality, settings]) => (
                      <option key={quality} value={quality}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)} - {settings.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Scale Factor: {exportOptions.scale}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={exportOptions.scale}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 focus:ring-2 focus:ring-accent"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.1x</span>
                    <span>5.0x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Advanced Options</h3>
              <div className="space-y-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeNormals}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeNormals: e.target.checked }))}
                    className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">Include Normals</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Better lighting and shading</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTextures}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeTextures: e.target.checked }))}
                    className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">Include Materials</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Export material properties</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={exportOptions.centerModel}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, centerModel: e.target.checked }))}
                    className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">Center Model</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Position at origin (0,0,0)</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Compatibility Info */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {formatInfo[exportOptions.format].name} Compatibility
            </h4>
            <div className="flex flex-wrap gap-2">
              {formatInfo[exportOptions.format].compatibility.map((app) => (
                <span
                  key={app}
                  className="text-sm bg-accent/10 text-accent px-3 py-1 rounded-lg"
                >
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Export as <strong>{formatInfo[exportOptions.format].name}</strong> format
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!scene || isExporting}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export 3D Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
