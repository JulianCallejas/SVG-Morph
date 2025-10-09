import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, HardDrive, Zap, Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  memoryLimit: number;
  renderTime: number;
  cpuUsage: number;
  timestamp: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible = true,
  position = 'top-right',
  compact = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    renderTime: 0,
    cpuUsage: 0,
    timestamp: Date.now()
  });
  
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [isMinimized, setIsMinimized] = useState(compact);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderTimes = useRef<number[]>([]);
  const animationFrame = useRef<number>();

  useEffect(() => {
    if (!isVisible) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const updateMetrics = () => {
      const now = performance.now();
      frameCount++;

      // Calculate FPS every second
      if (now - lastFrameTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
        frameCount = 0;
        lastFrameTime = now;

        // Get memory usage
        const memory = (performance as any).memory;
        const memoryUsage = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0;
        const memoryLimit = memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : 0;

        // Calculate average render time
        const avgRenderTime = renderTimes.current.length > 0 
          ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length 
          : 0;
        renderTimes.current = [];

        // Estimate CPU usage based on frame consistency
        const cpuUsage = Math.max(0, Math.min(100, (60 - fps) * 2));

        const newMetrics: PerformanceMetrics = {
          fps,
          memoryUsage,
          memoryLimit,
          renderTime: Math.round(avgRenderTime * 100) / 100,
          cpuUsage: Math.round(cpuUsage),
          timestamp: now
        };

        setMetrics(newMetrics);
        
        // Keep history for trends (last 30 seconds)
        setHistory(prev => {
          const updated = [...prev, newMetrics];
          return updated.slice(-30);
        });
      }

      // Track render time for this frame
      const renderStart = performance.now();
      requestAnimationFrame(() => {
        const renderEnd = performance.now();
        renderTimes.current.push(renderEnd - renderStart);
      });

      animationFrame.current = requestAnimationFrame(updateMetrics);
    };

    updateMetrics();

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getTrend = (current: number, history: number[]) => {
    if (history.length < 2) return null;
    const previous = history[history.length - 2];
    const trend = current - previous;
    return trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';
  };

  const fpsHistory = history.map(h => h.fps);
  const memoryHistory = history.map(h => h.memoryUsage);
  const fpsTrend = getTrend(metrics.fps, fpsHistory);
  const memoryTrend = getTrend(metrics.memoryUsage, memoryHistory);

  if (isMinimized) {
    return (
      <div className={`fixed ${getPositionClasses()} z-50`}>
        <div className="bg-black bg-opacity-80 text-white rounded-lg p-2 backdrop-blur-sm">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center space-x-2 hover:bg-white hover:bg-opacity-10 rounded p-1 transition-colors"
          >
            <Activity className="w-4 h-4" />
            <span className="text-sm font-mono">
              {metrics.fps}fps | {metrics.memoryUsage}MB
            </span>
            <Eye className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className="bg-black bg-opacity-90 text-white rounded-lg p-4 backdrop-blur-sm min-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Performance</h3>
          </div>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          {/* FPS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm">FPS</span>
              {fpsTrend && (
                fpsTrend === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : fpsTrend === 'down' ? (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                ) : null
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className={`font-mono text-lg ${getStatusColor(metrics.fps, { good: 50, warning: 30 })}`}>
                {metrics.fps}
              </span>
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    metrics.fps >= 50 ? 'bg-green-500' : 
                    metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.fps / 60) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-sm">Memory</span>
              {memoryTrend && (
                memoryTrend === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-red-400" />
                ) : memoryTrend === 'down' ? (
                  <TrendingDown className="w-3 h-3 text-green-400" />
                ) : null
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm text-gray-300">
                {metrics.memoryUsage}MB
              </span>
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    (metrics.memoryUsage / metrics.memoryLimit) < 0.7 ? 'bg-green-500' : 
                    (metrics.memoryUsage / metrics.memoryLimit) < 0.9 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (metrics.memoryUsage / metrics.memoryLimit) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* CPU Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-green-400" />
              <span className="text-sm">CPU</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`font-mono text-sm ${getStatusColor(100 - metrics.cpuUsage, { good: 70, warning: 50 })}`}>
                {metrics.cpuUsage}%
              </span>
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    metrics.cpuUsage < 30 ? 'bg-green-500' : 
                    metrics.cpuUsage < 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.cpuUsage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Render Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm">Render</span>
            </div>
            <span className="font-mono text-sm text-gray-300">
              {metrics.renderTime}ms
            </span>
          </div>
        </div>

        {/* Mini Chart */}
        {history.length > 1 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">FPS History</span>
              <span className="text-xs text-gray-400">30s</span>
            </div>
            <div className="h-8 flex items-end space-x-1">
              {fpsHistory.slice(-20).map((fps, index) => (
                <div
                  key={index}
                  className={`w-1 transition-all duration-300 ${
                    fps >= 50 ? 'bg-green-500' : 
                    fps >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${Math.max(2, (fps / 60) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Performance Tips */}
        {(metrics.fps < 30 || metrics.cpuUsage > 70) && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-yellow-400 mb-1">⚠️ Performance Tips:</div>
            <ul className="text-xs text-gray-300 space-y-1">
              {metrics.fps < 30 && (
                <li>• Reduce animation complexity</li>
              )}
              {metrics.cpuUsage > 70 && (
                <li>• Close other browser tabs</li>
              )}
              {metrics.memoryUsage / metrics.memoryLimit > 0.8 && (
                <li>• Clear browser cache</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('svg-morph-performance-monitor') === 'true';
  });

  const toggleMonitor = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    localStorage.setItem('svg-morph-performance-monitor', newState.toString());
  };

  const enableMonitor = () => {
    setIsEnabled(true);
    localStorage.setItem('svg-morph-performance-monitor', 'true');
  };

  const disableMonitor = () => {
    setIsEnabled(false);
    localStorage.setItem('svg-morph-performance-monitor', 'false');
  };

  return {
    isEnabled,
    toggleMonitor,
    enableMonitor,
    disableMonitor
  };
};
