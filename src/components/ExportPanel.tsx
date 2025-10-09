import React, { useState } from 'react';
import { Download, FileText, Code } from 'lucide-react';
import type { AnimationSettings } from '../store/morphStore';

interface ExportPanelProps {
  canExport: boolean;
  animationSettings: AnimationSettings;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  canExport,
  animationSettings,
}) => {
  const [exportFormat, setExportFormat] = useState<'smil' | 'css'>('smil');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const animatedSVG = generateAnimatedSVG(exportFormat, animationSettings);
      const blob = new Blob([animatedSVG], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `morphed-animation-${exportFormat}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-4">
        <Download className="h-5 w-5 text-secondary mr-2" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Export
        </h2>
      </div>

      <div className="space-y-4">
        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setExportFormat('smil')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                exportFormat === 'smil'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/5'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">SMIL</span>
            </button>
            <button
              onClick={() => setExportFormat('css')}
              className={`flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ${
                exportFormat === 'css'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/5'
              }`}
            >
              <Code className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">CSS</span>
            </button>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
            canExport && !isExporting
              ? 'bg-accent hover:bg-accent/90 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>Export Animation</span>
            </>
          )}
        </button>

        {!canExport && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Upload both SVG files to enable export
          </p>
        )}
      </div>
    </div>
  );
};

function generateAnimatedSVG(format: 'smil' | 'css', settings: AnimationSettings): string {
  const duration = settings.duration * 1000;
  
  if (format === 'smil') {
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <path d="M100,100 L400,100 L400,400 L100,400 Z">
    <animate attributeName="d" 
             values="M100,100 L400,100 L400,400 L100,400 Z;M250,50 L450,250 L250,450 L50,250 Z;M100,100 L400,100 L400,400 L100,400 Z"
             dur="${duration}ms" 
             repeatCount="${settings.loop ? 'indefinite' : '1'}" />
    ${settings.colorInterpolation ? `<animate attributeName="fill" 
             values="#5cbe2c;#d6b77c;#5cbe2c"
             dur="${duration}ms"
             repeatCount="${settings.loop ? 'indefinite' : '1'}" />` : ''}
  </path>
</svg>`;
  } else {
    return `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <style>
    .morph-path {
      animation: morph ${duration}ms ${settings.easing} ${settings.loop ? 'infinite' : 'forwards'};
    }
    @keyframes morph {
      0% { d: path("M100,100 L400,100 L400,400 L100,400 Z"); }
      50% { d: path("M250,50 L450,250 L250,450 L50,250 Z"); }
      100% { d: path("M100,100 L400,100 L400,400 L100,400 Z"); }
    }
  </style>
  <path class="morph-path" fill="#5cbe2c" />
</svg>`;
  }
}