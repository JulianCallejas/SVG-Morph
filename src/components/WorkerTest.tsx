import React, { useState } from 'react';
import { workerManager } from '../utils/workerManager';
import { Button } from './ui/Button';
import { Panel } from './ui/Panel';

export const WorkerTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testSVG = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="40" fill="blue" />
    </svg>
  `;

  const runWorkerTest = async () => {
    setIsLoading(true);
    setTestResult('Testing Web Worker...\n');

    try {
      // Test 1: Parse SVG
      setTestResult(prev => prev + 'Test 1: Parsing SVG...\n');
      const svgData = await workerManager.parseSVG(testSVG, (progress) => {
        setTestResult(prev => prev + `Progress: ${progress}%\n`);
      });
      setTestResult(prev => prev + `OK: SVG parsed successfully. Found ${svgData.paths.length} paths\n`);

      // Test 2: Normalize path
      if (svgData.paths.length > 0) {
        setTestResult(prev => prev + 'Test 2: Normalizing path...\n');
        const normalizedPath = await workerManager.normalizePath(svgData.paths[0].d, 50);
        setTestResult(prev => prev + `OK: Path normalized: ${normalizedPath.substring(0, 50)}...\n`);
      }

      // Test 3: Create interpolated SVG
      setTestResult(prev => prev + 'Test 3: Creating interpolated SVG...\n');
      const interpolatedSVG = await workerManager.createInterpolatedSVG(testSVG, testSVG, 0.5);
      setTestResult(prev => prev + `OK: Interpolated SVG created (${interpolatedSVG.length} chars)\n`);

      setTestResult(prev => prev + '\nAll tests passed! Web Worker is working correctly.\n');
    } catch (error) {
      setTestResult(prev => prev + `Test failed: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Panel title="Web Worker Test">
      <div className="space-y-4">
        <Button variant="primary" onClick={runWorkerTest} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Run Web Worker Test'}
        </Button>

        {testResult && (
          <div className="bg-canvas p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {testResult}
            </pre>
          </div>
        )}

        <div className="text-sm text-muted">
          <p><strong className="text-content">Worker Status:</strong> {workerManager.isWorkerAvailable ? 'Available' : 'Not available'}</p>
          <p><strong className="text-content">Pending Tasks:</strong> {workerManager.pendingTasksCount}</p>
        </div>
      </div>
    </Panel>
  );
};

export default WorkerTest;
