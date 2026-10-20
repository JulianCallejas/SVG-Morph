import React, { useState, useCallback } from 'react';
import { Download, FileText, Box, Layers, Globe, X } from 'lucide-react';
import { threeDExporter, ThreeDExportOptions, ExportResult } from '../utils/threeDExport';
import { ThreeDScene } from '../utils/threeDMorphing';
import { useToast } from '../contexts/ToastContext';
import { Button } from './ui/Button';
import { Field, Select, Slider, CheckRow } from './ui/Fields';

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
    <div className="fixed inset-0 bg-canvas/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <h2 className="text-xl font-medium">Export 3D Model</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 px-5 pb-6 sm:px-6 overflow-y-auto">
          <p className="text-sm text-muted mb-6">Choose format and export options</p>

          {/* Format Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Export Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formatInfo).map(([format, info]) => {
                const Icon = info.icon;
                const isSelected = exportOptions.format === format;
                const selectFormat = () => setExportOptions(prev => ({ ...prev, format: format as any }));
                return (
                  <div
                    key={format}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={selectFormat}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        selectFormat();
                      }
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-selected' : 'bg-raised hover:bg-line/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isSelected ? 'text-link' : 'text-muted'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{info.name}</h4>
                          <span className="text-sm text-muted">{info.extension}</span>
                        </div>
                        <p className="text-sm text-muted mt-1">{info.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {info.features.slice(0, 3).map((feature) => (
                            <span key={feature} className="text-sm text-link">
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
              <h3 className="text-lg font-medium mb-4">Quality Settings</h3>
              <div className="space-y-4">
                <Field label="Export Quality">
                  <Select
                    value={exportOptions.quality}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, quality: e.target.value as any }))}
                  >
                    {Object.entries(qualitySettings).map(([quality, settings]) => (
                      <option key={quality} value={quality}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)} - {settings.description}
                      </option>
                    ))}
                  </Select>
                </Field>

                <div>
                  <Field label={`Scale Factor: ${exportOptions.scale}x`}>
                    <Slider
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={exportOptions.scale}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                    />
                  </Field>
                  <div className="flex justify-between text-sm text-muted">
                    <span>0.1x</span>
                    <span>5.0x</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <h3 className="text-lg font-medium mb-4">Advanced Options</h3>
              <div className="space-y-4">
                <div>
                  <CheckRow
                    label="Include Normals"
                    checked={exportOptions.includeNormals}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeNormals: e.target.checked }))}
                  />
                  <p className="text-sm text-muted mt-1">Better lighting and shading</p>
                </div>

                <div>
                  <CheckRow
                    label="Include Materials"
                    checked={exportOptions.includeTextures}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeTextures: e.target.checked }))}
                  />
                  <p className="text-sm text-muted mt-1">Export material properties</p>
                </div>

                <div>
                  <CheckRow
                    label="Center Model"
                    checked={exportOptions.centerModel}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, centerModel: e.target.checked }))}
                  />
                  <p className="text-sm text-muted mt-1">Position at origin (0,0,0)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compatibility Info */}
          <div className="mt-8 p-4 bg-canvas">
            <h4 className="font-medium mb-2">
              {formatInfo[exportOptions.format].name} Compatibility
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {formatInfo[exportOptions.format].compatibility.map((app) => (
                <span key={app} className="text-sm text-link">
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 bg-canvas">
          <div className="text-sm text-muted">
            Export as <strong className="text-content">{formatInfo[exportOptions.format].name}</strong> format
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={!scene || isExporting}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-action border-t-transparent rounded-full animate-spin motion-reduce:animate-none"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export 3D Model</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
