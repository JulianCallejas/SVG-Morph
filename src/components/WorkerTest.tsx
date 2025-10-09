import React, { useState } from 'react';
import { workerManager } from '../utils/workerManager';

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
      setTestResult(prev => prev + `✓ SVG parsed successfully. Found ${svgData.paths.length} paths\n`);

      // Test 2: Normalize path
      if (svgData.paths.length > 0) {
        setTestResult(prev => prev + 'Test 2: Normalizing path...\n');
        const normalizedPath = await workerManager.normalizePath(svgData.paths[0].d, 50);
        setTestResult(prev => prev + `✓ Path normalized: ${normalizedPath.substring(0, 50)}...\n`);
      }

      // Test 3: Create interpolated SVG
      setTestResult(prev => prev + 'Test 3: Creating interpolated SVG...\n');
      const interpolatedSVG = await workerManager.createInterpolatedSVG(testSVG, testSVG, 0.5);
      setTestResult(prev => prev + `✓ Interpolated SVG created (${interpolatedSVG.length} chars)\n`);

      setTestResult(prev => prev + '\n🎉 All tests passed! Web Worker is working correctly.\n');
    } catch (error) {
      setTestResult(prev => prev + `❌ Test failed: ${error}\n`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
        Web Worker Test
      </h3>
      
      <div className="space-y-4">
        <button
          onClick={runWorkerTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Run Web Worker Test'}
        </button>

        {testResult && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
              {testResult}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Worker Status:</strong> {workerManager.isWorkerAvailable ? '✅ Available' : '❌ Not Available'}</p>
          <p><strong>Pending Tasks:</strong> {workerManager.pendingTasksCount}</p>
        </div>
      </div>
    </div>
  );
};

export default WorkerTest;
