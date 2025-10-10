import React, { useState, useEffect } from 'react';
import { edgeCaseHandler, EdgeCaseOptions, PathAnalysis } from '../utils/edgeCaseHandler';
import { multiPathProcessor } from '../utils/multiPathSupport';

interface EdgeCaseDemoProps {
  className?: string;
}

const DEMO_SVGS = {
  openArrow: `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,25 L70,25 M65,20 L70,25 L65,30" stroke="#5cbe2c" stroke-width="2" fill="none"/>
  </svg>`,
  
  closedArrow: `<svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
    <path d="M10,25 L60,25 L60,20 L80,25 L60,30 L60,25 Z" fill="#5cbe2c"/>
  </svg>`,
  
  starsInSky: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M20,20 L22,25 L27,25 L23,28 L25,33 L20,30 L15,33 L17,28 L13,25 L18,25 Z" fill="#d6b77c"/>
    <path d="M60,30 L62,35 L67,35 L63,38 L65,43 L60,40 L55,43 L57,38 L53,35 L58,35 Z" fill="#d6b77c"/>
    <path d="M120,15 L122,20 L127,20 L123,23 L125,28 L120,25 L115,28 L117,23 L113,20 L118,20 Z" fill="#d6b77c"/>
    <path d="M160,35 L162,40 L167,40 L163,43 L165,48 L160,45 L155,48 L157,43 L153,40 L158,40 Z" fill="#d6b77c"/>
  </svg>`,
  
  galaxySpiral: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M100,50 Q80,30 60,50 Q80,70 100,50 Q120,30 140,50 Q120,70 100,50" stroke="#5cbe2c" stroke-width="2" fill="none"/>
    <path d="M40,25 L42,30 L47,30 L43,33 L45,38 L40,35 L35,38 L37,33 L33,30 L38,30 Z" fill="#d6b77c"/>
    <path d="M170,60 L172,65 L177,65 L173,68 L175,73 L170,70 L165,73 L167,68 L163,65 L168,65 Z" fill="#d6b77c"/>
    <path d="M90,20 L92,25 L97,25 L93,28 L95,33 L90,30 L85,33 L87,28 L83,25 L88,25 Z" fill="#d6b77c"/>
  </svg>`,
  
  simpleCircle: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="30" fill="#5cbe2c"/>
  </svg>`,
  
  complexShape: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M50,10 Q70,30 50,50 Q30,30 50,10 M50,50 Q70,70 50,90 Q30,70 50,50" fill="#262a23"/>
  </svg>`
};

export const EdgeCaseDemo: React.FC<EdgeCaseDemoProps> = ({ className = '' }) => {
  const [selectedSource, setSelectedSource] = useState<keyof typeof DEMO_SVGS>('openArrow');
  const [selectedTarget, setSelectedTarget] = useState<keyof typeof DEMO_SVGS>('closedArrow');
  const [options, setOptions] = useState<EdgeCaseOptions>({
    openPathStrategy: 'maintain',
    extensionLength: 10,
    disconnectedStrategy: 'hybrid',
    maxDistance: 100,
    minSimilarity: 0.3,
    detectPathType: true,
    groupSimilarElements: true,
    preservePathDirection: true,
  });
  const [analysis, setAnalysis] = useState<{
    source: PathAnalysis[];
    target: PathAnalysis[];
  } | null>(null);
  const [morphingResult, setMorphingResult] = useState<string>('');

  useEffect(() => {
    analyzeSelectedSVGs();
  }, [selectedSource, selectedTarget, options]);

  const analyzeSelectedSVGs = async () => {
    try {
      // Parse source and target SVGs
      const sourceMultiPath = multiPathProcessor.parseSVG(DEMO_SVGS[selectedSource]);
      const targetMultiPath = multiPathProcessor.parseSVG(DEMO_SVGS[selectedTarget]);

      // Analyze all paths
      const sourceAnalyses: PathAnalysis[] = [];
      const targetAnalyses: PathAnalysis[] = [];

      // Analyze individual paths
      sourceMultiPath.individualPaths.forEach(path => {
        sourceAnalyses.push(edgeCaseHandler.analyzePath(path));
      });

      // Analyze group paths
      sourceMultiPath.groups.forEach(group => {
        group.paths.forEach(path => {
          sourceAnalyses.push(edgeCaseHandler.analyzePath(path));
        });
      });

      // Same for target
      targetMultiPath.individualPaths.forEach(path => {
        targetAnalyses.push(edgeCaseHandler.analyzePath(path));
      });

      targetMultiPath.groups.forEach(group => {
        group.paths.forEach(path => {
          targetAnalyses.push(edgeCaseHandler.analyzePath(path));
        });
      });

      setAnalysis({
        source: sourceAnalyses,
        target: targetAnalyses,
      });

      // Create a morph at 50% progress
      const morphed = multiPathProcessor.morphMultiPathSVGs(sourceMultiPath, targetMultiPath, 0.5);
      const morphedSVG = multiPathProcessor.generateSVG(morphed);
      setMorphingResult(morphedSVG);

    } catch (error) {
      console.error('Error analyzing SVGs:', error);
    }
  };

  const updateOption = <K extends keyof EdgeCaseOptions>(
    key: K,
    value: EdgeCaseOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const renderPathAnalysis = (analyses: PathAnalysis[], title: string) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
      {analyses.map((analysis, index) => (
        <div key={index} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Type:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                analysis.pathType === 'line' ? 'bg-blue-100 text-blue-800' :
                analysis.pathType === 'curve' ? 'bg-green-100 text-green-800' :
                analysis.pathType === 'shape' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {analysis.pathType}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Closed:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                analysis.isClosed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {analysis.isClosed ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Connected:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                analysis.isConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {analysis.isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Complexity:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{analysis.complexity}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="font-medium text-gray-700 dark:text-gray-300">Bounding Box:</span>
            <span className="ml-2 text-gray-900 dark:text-white text-xs">
              {Math.round(analysis.boundingBox.width)}×{Math.round(analysis.boundingBox.height)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#262a23] to-[#5cbe2c] rounded-xl p-6 text-white">
        <h3 className="text-xl font-bold mb-2">Edge Case Handler Demo</h3>
        <p className="text-gray-200">
          Test how the system handles open paths (arrows) and disconnected elements (stars)
        </p>
      </div>

      {/* SVG Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Source SVG</h4>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as keyof typeof DEMO_SVGS)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
          >
            <option value="openArrow">Open Arrow (Line)</option>
            <option value="starsInSky">Stars in Sky (Disconnected)</option>
            <option value="galaxySpiral">Galaxy with Stars (Mixed)</option>
            <option value="simpleCircle">Simple Circle (Closed)</option>
            <option value="complexShape">Complex Shape</option>
          </select>
          <div 
            className="w-full h-32 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: DEMO_SVGS[selectedSource] }}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Target SVG</h4>
          <select
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value as keyof typeof DEMO_SVGS)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
          >
            <option value="closedArrow">Closed Arrow (Shape)</option>
            <option value="starsInSky">Stars in Sky (Disconnected)</option>
            <option value="galaxySpiral">Galaxy with Stars (Mixed)</option>
            <option value="simpleCircle">Simple Circle (Closed)</option>
            <option value="complexShape">Complex Shape</option>
          </select>
          <div 
            className="w-full h-32 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: DEMO_SVGS[selectedTarget] }}
          />
        </div>
      </div>

      {/* Options */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Edge Case Options</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Open Path Strategy
            </label>
            <select
              value={options.openPathStrategy}
              onChange={(e) => updateOption('openPathStrategy', e.target.value as any)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="maintain">Maintain Original</option>
              <option value="extend">Extend Path</option>
              <option value="close">Close Path</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Disconnected Strategy
            </label>
            <select
              value={options.disconnectedStrategy}
              onChange={(e) => updateOption('disconnectedStrategy', e.target.value as any)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="spatial">Spatial Matching</option>
              <option value="semantic">Semantic Matching</option>
              <option value="hybrid">Hybrid Approach</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Similarity: {options.minSimilarity}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={options.minSimilarity}
              onChange={(e) => updateOption('minSimilarity', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="groupSimilar"
              checked={options.groupSimilarElements}
              onChange={(e) => updateOption('groupSimilarElements', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-[#5cbe2c] focus:ring-[#5cbe2c]"
            />
            <label htmlFor="groupSimilar" className="text-sm text-gray-700 dark:text-gray-300">
              Group Similar Elements
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="detectType"
              checked={options.detectPathType}
              onChange={(e) => updateOption('detectPathType', e.target.checked)}
              className="mr-2 rounded border-gray-300 text-[#5cbe2c] focus:ring-[#5cbe2c]"
            />
            <label htmlFor="detectType" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-detect Path Types
            </label>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderPathAnalysis(analysis.source, 'Source Analysis')}
          {renderPathAnalysis(analysis.target, 'Target Analysis')}
        </div>
      )}

      {/* Morphing Result */}
      {morphingResult && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Morphing Result (50% Progress)
          </h4>
          <div 
            className="w-full h-48 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: morphingResult }}
          />
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
              View Generated SVG Code
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs overflow-x-auto">
              {morphingResult}
            </pre>
          </details>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Tips for Edge Cases</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Open Paths:</strong> Work well for line-based animations (arrows, paths)</li>
          <li>• <strong>Disconnected Elements:</strong> Use similarity matching for best results</li>
          <li>• <strong>Mixed Content:</strong> The system automatically handles groups and individual paths</li>
          <li>• <strong>Complex Shapes:</strong> May benefit from path simplification before morphing</li>
        </ul>
      </div>
    </div>
  );
};
