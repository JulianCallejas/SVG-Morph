import React, { useState, useCallback } from 'react';
import { Code, Download, Settings, Zap, Copy, Eye } from 'lucide-react';
import { reactComponentGenerator, ReactComponentOptions } from '../utils/reactComponentGenerator';
import { SVGData } from '../types/svg';
import { useToast } from '../contexts/ToastContext';

interface ReactComponentExportPanelProps {
  sourceSVG: SVGData | null;
  targetSVG: SVGData | null;
}

export const ReactComponentExportPanel: React.FC<ReactComponentExportPanelProps> = ({
  sourceSVG,
  targetSVG
}) => {
  const [options, setOptions] = useState<ReactComponentOptions>({
    componentName: 'SVGMorphAnimation',
    exportType: 'default',
    typescript: true,
    includeProps: true,
    animationType: 'css',
    includeControls: false,
    responsive: true,
    accessibility: true,
    styledComponents: false
  });

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generatedTypes, setGeneratedTypes] = useState<string>('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [usageExample, setUsageExample] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'component' | 'types' | 'usage' | 'preview'>('component');

  const { showSuccess, showError, showWarning } = useToast();

  const handleGenerate = useCallback(() => {
    if (!sourceSVG || !targetSVG) {
      showWarning('Please upload both source and target SVG files');
      return;
    }

    try {
      const result = reactComponentGenerator.generateComponent(sourceSVG, targetSVG, options);
      
      setGeneratedCode(result.component);
      setGeneratedTypes(result.types || '');
      setDependencies(result.dependencies);
      setUsageExample(result.usage);
      
      showSuccess('React component generated successfully!');
    } catch (error) {
      showError(`Failed to generate component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [sourceSVG, targetSVG, options, showSuccess, showError, showWarning]);

  const handleCopyCode = useCallback((code: string, type: string) => {
    navigator.clipboard.writeText(code);
    showSuccess(`${type} copied to clipboard!`);
  }, [showSuccess]);

  const handleDownload = useCallback((code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(`${filename} downloaded!`);
  }, [showSuccess]);

  const getFileExtension = () => options.typescript ? '.tsx' : '.jsx';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Code className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">React Component Generator</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Export as ready-to-use React components</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Component Name
            </label>
            <input
              type="text"
              value={options.componentName}
              onChange={(e) => setOptions(prev => ({ ...prev, componentName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="SVGMorphAnimation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Animation Library
            </label>
            <select
              value={options.animationType}
              onChange={(e) => setOptions(prev => ({ ...prev, animationType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="css">CSS Animations</option>
              <option value="framer-motion">Framer Motion</option>
              <option value="react-spring">React Spring</option>
              <option value="gsap">GSAP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.typescript}
              onChange={(e) => setOptions(prev => ({ ...prev, typescript: e.target.checked }))}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="text-gray-900 dark:text-white">TypeScript</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.includeProps}
              onChange={(e) => setOptions(prev => ({ ...prev, includeProps: e.target.checked }))}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="text-gray-900 dark:text-white">Include Props</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.includeControls}
              onChange={(e) => setOptions(prev => ({ ...prev, includeControls: e.target.checked }))}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="text-gray-900 dark:text-white">Controls</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={options.responsive}
              onChange={(e) => setOptions(prev => ({ ...prev, responsive: e.target.checked }))}
              className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
            />
            <span className="text-gray-900 dark:text-white">Responsive</span>
          </label>
        </div>

        {showAdvanced && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Export Type
                </label>
                <select
                  value={options.exportType}
                  onChange={(e) => setOptions(prev => ({ ...prev, exportType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="default">Default Export</option>
                  <option value="named">Named Export</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.accessibility}
                  onChange={(e) => setOptions(prev => ({ ...prev, accessibility: e.target.checked }))}
                  className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                />
                <span className="text-gray-900 dark:text-white">Accessibility</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.styledComponents}
                  onChange={(e) => setOptions(prev => ({ ...prev, styledComponents: e.target.checked }))}
                  className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-accent focus:ring-2"
                />
                <span className="text-gray-900 dark:text-white">Styled Components</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={!sourceSVG || !targetSVG}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:cursor-not-allowed disabled:transform-none"
          >
            <Zap className="w-5 h-5" />
            <span>Generate Component</span>
          </button>
        </div>
      </div>

      {/* Generated Code Display */}
      {generatedCode && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Code</h3>
            <div className="flex space-x-2">
              {['component', 'types', 'usage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-accent text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-accent'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">
                {activeTab === 'component' && `${options.componentName}${getFileExtension()}`}
                {activeTab === 'types' && `${options.componentName}.types.ts`}
                {activeTab === 'usage' && 'Usage Example'}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const code = activeTab === 'component' ? generatedCode : 
                                activeTab === 'types' ? generatedTypes : usageExample;
                    handleCopyCode(code, activeTab);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const code = activeTab === 'component' ? generatedCode : 
                                activeTab === 'types' ? generatedTypes : usageExample;
                    const filename = activeTab === 'component' ? `${options.componentName}${getFileExtension()}` :
                                   activeTab === 'types' ? `${options.componentName}.types.ts` : 'usage-example.txt';
                    handleDownload(code, filename);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <pre className="text-gray-300 text-sm overflow-x-auto max-h-96">
              <code>
                {activeTab === 'component' && generatedCode}
                {activeTab === 'types' && (generatedTypes || 'No types generated')}
                {activeTab === 'usage' && usageExample}
              </code>
            </pre>
          </div>

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Required Dependencies</h4>
              <div className="bg-gray-900 rounded-lg p-3">
                <code className="text-green-400 text-sm">
                  npm install {dependencies.join(' ')}
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!generatedCode && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Configure options and click "Generate Component"</p>
          <p className="text-sm">Upload both SVG files to get started</p>
        </div>
      )}
    </div>
  );
};
