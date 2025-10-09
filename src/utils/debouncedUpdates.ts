export interface DebounceOptions {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
}

export interface ThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
};

export type ThrottledFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
};

/**
 * Creates a debounced function that delays invoking func until after delay milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  options: DebounceOptions
): DebouncedFunction<T> {
  let timeoutId: number | undefined;
  let maxTimeoutId: number | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let result: ReturnType<T> | undefined;

  const { delay, immediate = false, maxWait } = options;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    lastArgs = undefined;
    lastInvokeTime = time;
    result = func.apply(null, args);
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeoutId = window.setTimeout(timerExpired, delay);
    return immediate ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = window.setTimeout(timerExpired, remainingWait(time));
    return result;
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = undefined;

    if (lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    return result;
  }

  function cancel(): void {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== undefined) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = undefined;
    timeoutId = undefined;
    maxTimeoutId = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    return timeoutId === undefined ? result : trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== undefined;
  }

  function debounced(...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        leadingEdge(lastCallTime);
        return;
      }
      if (maxWait !== undefined) {
        timeoutId = window.setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === undefined) {
      timeoutId = window.setTimeout(timerExpired, delay);
    }
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every delay milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  options: ThrottleOptions
): ThrottledFunction<T> {
  const { delay, leading = true, trailing = true } = options;
  
  return debounce(func, {
    delay,
    immediate: leading,
    maxWait: delay,
  }) as ThrottledFunction<T>;
}

/**
 * Animation frame-based debouncing for smooth UI updates
 */
export function debounceAnimationFrame<T extends (...args: any[]) => any>(
  func: T
): DebouncedFunction<T> {
  let rafId: number | undefined;
  let lastArgs: Parameters<T> | undefined;

  function cancel(): void {
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafId = undefined;
    }
    lastArgs = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    if (lastArgs) {
      const args = lastArgs;
      cancel();
      return func.apply(null, args);
    }
    return undefined;
  }

  function pending(): boolean {
    return rafId !== undefined;
  }

  function debounced(...args: Parameters<T>): void {
    lastArgs = args;
    
    if (rafId === undefined) {
      rafId = requestAnimationFrame(() => {
        const currentArgs = lastArgs;
        cancel();
        if (currentArgs) {
          func.apply(null, currentArgs);
        }
      });
    }
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * Debounced update manager for SVG morphing parameters
 */
export class DebouncedUpdateManager {
  private debouncedFunctions = new Map<string, DebouncedFunction<any>>();
  private updateQueue = new Map<string, any>();
  private batchUpdateTimeout: number | undefined;

  constructor(private defaultDelay = 300) {}

  /**
   * Register a debounced update function
   */
  register<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    options?: Partial<DebounceOptions>
  ): DebouncedFunction<T> {
    const debouncedFunc = debounce(func, {
      delay: this.defaultDelay,
      ...options,
    });

    this.debouncedFunctions.set(key, debouncedFunc);
    return debouncedFunc;
  }

  /**
   * Queue an update to be processed
   */
  queueUpdate(key: string, value: any): void {
    this.updateQueue.set(key, value);
    
    if (this.batchUpdateTimeout === undefined) {
      this.batchUpdateTimeout = window.setTimeout(() => {
        this.processBatchUpdates();
      }, 16); // ~60fps
    }
  }

  /**
   * Get a debounced function by key
   */
  get<T extends (...args: any[]) => any>(key: string): DebouncedFunction<T> | undefined {
    return this.debouncedFunctions.get(key);
  }

  /**
   * Cancel all pending updates
   */
  cancelAll(): void {
    this.debouncedFunctions.forEach(func => func.cancel());
    this.updateQueue.clear();
    
    if (this.batchUpdateTimeout !== undefined) {
      clearTimeout(this.batchUpdateTimeout);
      this.batchUpdateTimeout = undefined;
    }
  }

  /**
   * Flush all pending updates immediately
   */
  flushAll(): void {
    this.debouncedFunctions.forEach(func => func.flush());
    this.processBatchUpdates();
  }

  /**
   * Check if any updates are pending
   */
  hasPendingUpdates(): boolean {
    return Array.from(this.debouncedFunctions.values()).some(func => func.pending()) ||
           this.updateQueue.size > 0;
  }

  /**
   * Get pending update count
   */
  getPendingCount(): number {
    const debouncedPending = Array.from(this.debouncedFunctions.values())
      .filter(func => func.pending()).length;
    return debouncedPending + this.updateQueue.size;
  }

  private processBatchUpdates(): void {
    if (this.updateQueue.size === 0) return;

    const updates = new Map(this.updateQueue);
    this.updateQueue.clear();
    this.batchUpdateTimeout = undefined;

    // Process updates in batches to avoid overwhelming the UI
    updates.forEach((value, key) => {
      const debouncedFunc = this.debouncedFunctions.get(key);
      if (debouncedFunc) {
        debouncedFunc(value);
      }
    });
  }
}

/**
 * SVG-specific debounced update functions
 */
export class SVGUpdateManager extends DebouncedUpdateManager {
  constructor() {
    super(300); // 300ms default delay as specified in Phase 4 requirements
  }

  /**
   * Initialize SVG-specific debounced functions
   */
  initializeSVGUpdates(callbacks: {
    onAnimationSettingsChange?: (settings: any) => void;
    onProgressChange?: (progress: number) => void;
    onNodePairsChange?: (pairs: any[]) => void;
    onSVGContentChange?: (content: string) => void;
    onPhysicsSettingsChange?: (settings: any) => void;
  }): void {
    if (callbacks.onAnimationSettingsChange) {
      this.register('animationSettings', callbacks.onAnimationSettingsChange, {
        delay: 300,
        immediate: false,
      });
    }

    if (callbacks.onProgressChange) {
      this.register('progress', callbacks.onProgressChange, {
        delay: 50, // Faster updates for progress
        immediate: false,
      });
    }

    if (callbacks.onNodePairsChange) {
      this.register('nodePairs', callbacks.onNodePairsChange, {
        delay: 200,
        immediate: false,
      });
    }

    if (callbacks.onSVGContentChange) {
      this.register('svgContent', callbacks.onSVGContentChange, {
        delay: 500, // Slower for heavy operations
        immediate: false,
      });
    }

    if (callbacks.onPhysicsSettingsChange) {
      this.register('physicsSettings', callbacks.onPhysicsSettingsChange, {
        delay: 300,
        immediate: false,
      });
    }
  }

  /**
   * Update animation settings with debouncing
   */
  updateAnimationSettings(settings: any): void {
    this.queueUpdate('animationSettings', settings);
  }

  /**
   * Update progress with debouncing
   */
  updateProgress(progress: number): void {
    this.queueUpdate('progress', progress);
  }

  /**
   * Update node pairs with debouncing
   */
  updateNodePairs(pairs: any[]): void {
    this.queueUpdate('nodePairs', pairs);
  }

  /**
   * Update SVG content with debouncing
   */
  updateSVGContent(content: string): void {
    this.queueUpdate('svgContent', content);
  }

  /**
   * Update physics settings with debouncing
   */
  updatePhysicsSettings(settings: any): void {
    this.queueUpdate('physicsSettings', settings);
  }
}

// Export singleton instance
export const svgUpdateManager = new SVGUpdateManager();

// Utility functions for common debouncing scenarios
export const debouncedAnimationUpdate = debounce(
  (callback: () => void) => callback(),
  { delay: 300 }
);

export const debouncedProgressUpdate = debounce(
  (callback: (progress: number) => void, progress: number) => callback(progress),
  { delay: 50 }
);

export const debouncedSettingsUpdate = debounce(
  (callback: (settings: any) => void, settings: any) => callback(settings),
  { delay: 300 }
);

// Animation frame utilities
export const rafDebounce = debounceAnimationFrame;

export const throttledRender = throttle(
  (callback: () => void) => callback(),
  { delay: 16, leading: true, trailing: true } // ~60fps
);

// Performance monitoring for debounced updates
export class DebouncePerformanceMonitor {
  private metrics = new Map<string, {
    callCount: number;
    executionCount: number;
    totalDelay: number;
    averageDelay: number;
  }>();

  /**
   * Track debounced function performance
   */
  track<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    options: DebounceOptions
  ): DebouncedFunction<T> {
    const startTime = performance.now();
    let callCount = 0;
    let executionCount = 0;
    let totalDelay = 0;

    const trackedFunc = (...args: Parameters<T>): ReturnType<T> => {
      executionCount++;
      const delay = performance.now() - startTime;
      totalDelay += delay;
      
      this.updateMetrics(key, callCount, executionCount, totalDelay);
      
      return func.apply(null, args);
    };

    const debouncedFunc = debounce(trackedFunc, options);
    
    // Wrap the debounced function to track calls
    const wrappedFunc = (...args: Parameters<T>): void => {
      callCount++;
      debouncedFunc(...args);
    };

    wrappedFunc.cancel = debouncedFunc.cancel;
    wrappedFunc.flush = debouncedFunc.flush;
    wrappedFunc.pending = debouncedFunc.pending;

    return wrappedFunc as DebouncedFunction<T>;
  }

  /**
   * Get performance metrics for a tracked function
   */
  getMetrics(key: string) {
    return this.metrics.get(key);
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics() {
    return new Map(this.metrics);
  }

  /**
   * Reset metrics for a specific key
   */
  resetMetrics(key: string): void {
    this.metrics.delete(key);
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.metrics.clear();
  }

  private updateMetrics(
    key: string,
    callCount: number,
    executionCount: number,
    totalDelay: number
  ): void {
    this.metrics.set(key, {
      callCount,
      executionCount,
      totalDelay,
      averageDelay: executionCount > 0 ? totalDelay / executionCount : 0,
    });
  }
}

export const debounceMonitor = new DebouncePerformanceMonitor();
