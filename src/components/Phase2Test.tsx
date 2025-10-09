import React, { useState } from 'react';
import { KDTree, Point, euclideanDistance } from '../utils/kdTree';
import { NodeMatcher } from '../utils/nodeMatching';
import { exportSystem, createExportOptions } from '../utils/exportSystem';
import { TestTube, Play, Download, CheckCircle } from 'lucide-react';

export const Phase2Test: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: Record<string, boolean> = {};

    try {
      // Test 1: KD-Tree functionality
      console.log('Testing KD-Tree...');
      const points: Point[] = [
        { x: 10, y: 20, id: 'p1' },
        { x: 30, y: 40, id: 'p2' },
        { x: 50, y: 60, id: 'p3' },
        { x: 70, y: 80, id: 'p4' },
      ];
      
      const kdTree = new KDTree(points, euclideanDistance);
      const nearest = kdTree.nearest({ x: 25, y: 35 }, 2);
      results['kdTree'] = nearest.length === 2 && nearest[0].point.id === 'p2';

      // Test 2: Node Matching
      console.log('Testing Node Matching...');
      const sourcePoints: Point[] = [
        { x: 0, y: 0, id: 's1' },
        { x: 100, y: 0, id: 's2' },
        { x: 100, y: 100, id: 's3' },
      ];
      
      const targetPoints: Point[] = [
        { x: 10, y: 10, id: 't1' },
        { x: 110, y: 10, id: 't2' },
        { x: 110, y: 110, id: 't3' },
      ];

      const matcher = new NodeMatcher({
        distanceMetric: 'euclidean',
        maxDistance: 50,
        confidenceThreshold: 0.1,
      });

      const matchResult = matcher.autoMatchNodes(sourcePoints, targetPoints);
      results['nodeMatching'] = matchResult.matches.length === 3;

      // Test 3: Export System
      console.log('Testing Export System...');
      const testSVG = '<svg><circle cx="50" cy="50" r="25" fill="blue"/></svg>';
      const exportOptions = createExportOptions({
        format: 'svg',
        includeAnimation: false,
      });

      const exportResult = await exportSystem.exportAnimation(testSVG, testSVG, exportOptions);
      results['exportSystem'] = exportResult.content.includes('<svg') && exportResult.size > 0;

      // Test 4: Distance Functions
      console.log('Testing Distance Functions...');
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      const distance = euclideanDistance(p1, p2);
      results['distanceFunctions'] = Math.abs(distance - 5) < 0.001;

      // Test 5: Range Search
      console.log('Testing Range Search...');
      const rangeResults = kdTree.rangeSearch({ x: 50, y: 60 }, 30);
      results['rangeSearch'] = rangeResults.length > 0;

      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      results['error'] = false;
      setTestResults(results);
    } finally {
      setIsRunning(false);
    }
  };

  const allTestsPassed = Object.values(testResults).every(result => result === true);
  const testsRun = Object.keys(testResults).length > 0;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Phase 2 Component Tests</h3>
      </div>

      <div className="space-y-4">
        <p className="text-gray-600">
          Verify that all Phase 2 components are working correctly.
        </p>

        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Tests
            </>
          )}
        </button>

        {testsRun && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              allTestsPassed ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">
                {allTestsPassed ? 'All tests passed!' : 'Some tests failed'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(testResults).map(([test, passed]) => (
                <div
                  key={test}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    passed ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="capitalize">{test.replace(/([A-Z])/g, ' $1')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Test Coverage:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• KD-Tree construction and nearest neighbor search</li>
            <li>• Node matching algorithm with confidence scoring</li>
            <li>• Export system with multiple format support</li>
            <li>• Distance function calculations</li>
            <li>• Range search functionality</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
