import React, { useState, useCallback } from 'react';
import { Code, Download, Settings, Zap, Copy } from 'lucide-react';
import { reactComponentGenerator, ReactComponentOptions } from '../utils/reactComponentGenerator';
import type { SVGData } from '../workers/pathProcessor';
import { useToast } from '../contexts/ToastContext';
import { useMorphStore } from '../store/morphStore';
import { activeContourPlan } from '../utils/contourSvg';
import { Button } from './ui/Button';
import { CheckRow, Field, Select } from './ui/Fields';
import { Panel } from './ui/Panel';

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

  // Same rule as the preview and the other exports: the per-contour plan applies to paths with
  // several subpaths or a plan the user edited, and never while the point-matching mode is selected.
  const { sourceContours, targetContours, contourPlan, contourPlanCustomized, manualModeEnabled } =
    useMorphStore();
  const activePlan = activeContourPlan(
    contourPlan,
    sourceContours,
    targetContours,
    contourPlanCustomized,
    manualModeEnabled,
  );

  const handleGenerate = useCallback(() => {
    if (!sourceSVG || !targetSVG) {
      showWarning('Please upload both source and target SVG files');
      return;
    }

    try {
      const result = reactComponentGenerator.generateComponent(
        sourceSVG,
        targetSVG,
        options,
        activePlan ?? undefined,
      );

      setGeneratedCode(result.component);
      setGeneratedTypes(result.types || '');
      setDependencies(result.dependencies);
      setUsageExample(result.usage);

      showSuccess('React component generated successfully!');
    } catch (error) {
      showError(`Failed to generate component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [sourceSVG, targetSVG, options, activePlan, showSuccess, showError, showWarning]);

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
    <Panel
      title="React Component Generator"
      actions={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings className="h-5 w-5" />
        </Button>
      }
    >
      <div className="space-y-6">
        <p className="flex items-center gap-3 text-sm text-muted">
          <Code className="h-5 w-5 shrink-0 text-link" />
          Export as ready-to-use React components
        </p>

        {activePlan && (
          <p role="status" className="text-sm font-medium">
            Your contour plan is active: the component animates every contour with native SMIL, so the
            animation library and styled-components options do not apply to it.
          </p>
        )}

        {/* Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Component Name">
              <input
                type="text"
                value={options.componentName}
                onChange={(e) => setOptions(prev => ({ ...prev, componentName: e.target.value }))}
                className="h-11 w-full bg-raised px-3 text-content"
                placeholder="SVGMorphAnimation"
              />
            </Field>

            <Field label="Animation Library">
              <Select
                value={options.animationType}
                onChange={(e) => setOptions(prev => ({ ...prev, animationType: e.target.value as any }))}
              >
                <option value="css">CSS Animations</option>
                <option value="framer-motion">Framer Motion</option>
                <option value="react-spring">React Spring</option>
                <option value="gsap">GSAP</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CheckRow
              label="TypeScript"
              checked={options.typescript}
              onChange={(e) => setOptions(prev => ({ ...prev, typescript: e.target.checked }))}
            />
            <CheckRow
              label="Include Props"
              checked={options.includeProps}
              onChange={(e) => setOptions(prev => ({ ...prev, includeProps: e.target.checked }))}
            />
            <CheckRow
              label="Controls"
              checked={options.includeControls}
              onChange={(e) => setOptions(prev => ({ ...prev, includeControls: e.target.checked }))}
            />
            <CheckRow
              label="Responsive"
              checked={options.responsive}
              onChange={(e) => setOptions(prev => ({ ...prev, responsive: e.target.checked }))}
            />
          </div>

          {showAdvanced && (
            <div className="bg-canvas p-4 space-y-4">
              <h3 className="text-lg font-medium">Advanced Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Export Type">
                  <Select
                    value={options.exportType}
                    onChange={(e) => setOptions(prev => ({ ...prev, exportType: e.target.value as any }))}
                  >
                    <option value="default">Default Export</option>
                    <option value="named">Named Export</option>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CheckRow
                  label="Accessibility"
                  checked={options.accessibility}
                  onChange={(e) => setOptions(prev => ({ ...prev, accessibility: e.target.checked }))}
                />
                <CheckRow
                  label="Styled Components"
                  checked={options.styledComponents}
                  onChange={(e) => setOptions(prev => ({ ...prev, styledComponents: e.target.checked }))}
                />
              </div>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={!sourceSVG || !targetSVG}
            >
              <Zap className="h-5 w-5" />
              <span>Generate Component</span>
            </Button>
          </div>
        </div>

        {/* Generated Code Display */}
        {generatedCode && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-medium">Generated Code</h3>
              <div className="flex flex-wrap gap-2">
                {['component', 'types', 'usage'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'primary' : 'ghost'}
                    onClick={() => setActiveTab(tab as any)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-canvas p-4 relative">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="min-w-0 truncate text-sm text-muted">
                  {activeTab === 'component' && `${options.componentName}${getFileExtension()}`}
                  {activeTab === 'types' && `${options.componentName}.types.ts`}
                  {activeTab === 'usage' && 'Usage Example'}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const code = activeTab === 'component' ? generatedCode :
                                  activeTab === 'types' ? generatedTypes : usageExample;
                      handleCopyCode(code, activeTab);
                    }}
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const code = activeTab === 'component' ? generatedCode :
                                  activeTab === 'types' ? generatedTypes : usageExample;
                      const filename = activeTab === 'component' ? `${options.componentName}${getFileExtension()}` :
                                     activeTab === 'types' ? `${options.componentName}.types.ts` : 'usage-example.txt';
                      handleDownload(code, filename);
                    }}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <pre className="text-sm overflow-x-auto max-h-96">
                <code>
                  {activeTab === 'component' && generatedCode}
                  {activeTab === 'types' && (generatedTypes || 'No types generated')}
                  {activeTab === 'usage' && usageExample}
                </code>
              </pre>
            </div>

            {/* Dependencies */}
            {dependencies.length > 0 && (
              <div className="bg-raised p-4">
                <h4 className="font-medium mb-2">Required Dependencies</h4>
                <div className="bg-canvas p-3 overflow-x-auto">
                  <code className="whitespace-nowrap text-sm text-link">
                    npm install {dependencies.join(' ')}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!generatedCode && (
          <div className="text-center py-8 text-muted">
            <Code className="w-12 h-12 mx-auto mb-3" />
            <p>Configure options and click "Generate Component"</p>
            <p className="text-sm">Upload both SVG files to get started</p>
          </div>
        )}
      </div>
    </Panel>
  );
};
