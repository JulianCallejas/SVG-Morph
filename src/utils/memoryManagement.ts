export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: number;
}

export interface MemoryManagerOptions {
  maxCacheSize: number; // in bytes
  maxCacheEntries: number;
  cleanupInterval: number; // in milliseconds
  memoryPressureThreshold: number; // percentage of heap limit
  enableAutoCleanup: boolean;
  enablePerformanceMonitoring: boolean;
}

export class MemoryManager {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: number | null = null;
  private options: MemoryManagerOptions;
  private memoryObserver: PerformanceObserver | null = null;
  private weakRefs = new Set<WeakRef<any>>();
  private finalizationRegistry: FinalizationRegistry<string> | null = null;

  constructor(options: Partial<MemoryManagerOptions> = {}) {
    this.options = {
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxCacheEntries: 1000,
      cleanupInterval: 30000, // 30 seconds
      memoryPressureThreshold: 0.8, // 80%
      enableAutoCleanup: true,
      enablePerformanceMonitoring: true,
      ...options,
    };

    this.initializeMemoryManagement();
  }

  /**
   * Initialize memory management systems
   */
  private initializeMemoryManagement(): void {
    if (this.options.enableAutoCleanup) {
      this.startAutoCleanup();
    }

    if (this.options.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }

    // Initialize FinalizationRegistry for automatic cleanup
    if (typeof FinalizationRegistry !== 'undefined') {
      this.finalizationRegistry = new FinalizationRegistry((key: string) => {
        this.cache.delete(key);
      });
    }

    // Listen for memory pressure events
    if ('memory' in performance) {
      this.monitorMemoryPressure();
    }
  }

  /**
   * Cache data with automatic memory management
   */
  cache<T>(key: string, data: T, priority = 1): void {
    const size = this.estimateSize(data);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      size,
      priority,
    };

    // Check if we need to make space
    if (this.shouldEvictEntries(size)) {
      this.evictLeastImportant(size);
    }

    this.cache.set(key, entry);

    // Register for automatic cleanup
    if (this.finalizationRegistry && typeof data === 'object' && data !== null) {
      this.finalizationRegistry.register(data, key);
    }
  }

  /**
   * Retrieve cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  /**
   * Remove specific cache entry
   */
  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.weakRefs.clear();
  }

  /**
   * Create a weak reference to an object
   */
  createWeakRef<T extends object>(obj: T): WeakRef<T> {
    const weakRef = new WeakRef(obj);
    this.weakRefs.add(weakRef);
    return weakRef;
  }

  /**
   * Clean up dereferenced weak references
   */
  cleanupWeakRefs(): number {
    let cleaned = 0;
    const toRemove: WeakRef<any>[] = [];

    this.weakRefs.forEach(weakRef => {
      if (weakRef.deref() === undefined) {
        toRemove.push(weakRef);
        cleaned++;
      }
    });

    toRemove.forEach(weakRef => {
      this.weakRefs.delete(weakRef);
    });

    return cleaned;
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memInfo = (performance as any).memory;
    const stats: MemoryStats = {
      usedJSHeapSize: memInfo?.usedJSHeapSize || 0,
      totalJSHeapSize: memInfo?.totalJSHeapSize || 0,
      jsHeapSizeLimit: memInfo?.jsHeapSizeLimit || 0,
      memoryPressure: 'low',
      recommendations: [],
    };

    // Calculate memory pressure
    if (stats.jsHeapSizeLimit > 0) {
      const pressure = stats.usedJSHeapSize / stats.jsHeapSizeLimit;
      
      if (pressure > 0.9) {
        stats.memoryPressure = 'critical';
        stats.recommendations.push('Critical memory usage - clear cache immediately');
        stats.recommendations.push('Reduce SVG complexity');
        stats.recommendations.push('Limit concurrent animations');
      } else if (pressure > 0.8) {
        stats.memoryPressure = 'high';
        stats.recommendations.push('High memory usage - consider clearing cache');
        stats.recommendations.push('Optimize SVG files');
      } else if (pressure > 0.6) {
        stats.memoryPressure = 'medium';
        stats.recommendations.push('Monitor memory usage');
      }
    }

    // Add cache-specific recommendations
    const cacheSize = this.getCacheSize();
    if (cacheSize > this.options.maxCacheSize * 0.8) {
      stats.recommendations.push('Cache size is large - consider clearing old entries');
    }

    return stats;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    entryCount: number;
    totalSize: number;
    averageSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      entryCount: entries.length,
      totalSize,
      averageSize: entries.length > 0 ? totalSize / entries.length : 0,
      hitRate: totalAccess > entries.length ? totalAccess / entries.length : 1,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
    };
  }

  /**
   * Optimize memory usage
   */
  optimize(): {
    cacheEntriesRemoved: number;
    weakRefsCleared: number;
    memoryFreed: number;
  } {
    const initialSize = this.getCacheSize();
    const initialEntries = this.cache.size;
    
    // Clean up expired and least used entries
    const removed = this.evictExpiredEntries();
    
    // Clean up weak references
    const weakRefsCleared = this.cleanupWeakRefs();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
    
    const finalSize = this.getCacheSize();
    
    return {
      cacheEntriesRemoved: initialEntries - this.cache.size,
      weakRefsCleared,
      memoryFreed: initialSize - finalSize,
    };
  }

  /**
   * Handle memory pressure situations
   */
  handleMemoryPressure(): void {
    const stats = this.getMemoryStats();
    
    switch (stats.memoryPressure) {
      case 'critical':
        // Aggressive cleanup
        this.clearCache();
        this.cleanupWeakRefs();
        this.forceGarbageCollection();
        break;
        
      case 'high':
        // Remove 50% of cache entries
        this.evictPercentage(0.5);
        this.cleanupWeakRefs();
        break;
        
      case 'medium':
        // Remove old and least used entries
        this.evictExpiredEntries();
        this.evictLeastUsed(Math.floor(this.cache.size * 0.2));
        break;
    }
  }

  /**
   * Start automatic cleanup process
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = window.setInterval(() => {
      this.evictExpiredEntries();
      this.cleanupWeakRefs();
      
      // Check memory pressure
      const stats = this.getMemoryStats();
      if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
        this.handleMemoryPressure();
      }
    }, this.options.cleanupInterval);
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.memoryObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'memory') {
            // Handle memory performance entries
            console.debug('Memory performance entry:', entry);
          }
        });
      });

      // Observe memory-related performance entries if supported
      this.memoryObserver.observe({ entryTypes: ['memory'] });
    } catch (error) {
      console.warn('Memory performance monitoring not available:', error);
    }
  }

  /**
   * Monitor memory pressure
   */
  private monitorMemoryPressure(): void {
    const checkMemory = () => {
      const stats = this.getMemoryStats();
      
      if (stats.memoryPressure === 'high' || stats.memoryPressure === 'critical') {
        console.warn('Memory pressure detected:', stats.memoryPressure);
        this.handleMemoryPressure();
      }
    };

    // Check memory every 10 seconds
    setInterval(checkMemory, 10000);
  }

  /**
   * Estimate the size of data in bytes
   */
  private estimateSize(data: any): number {
    if (data === null || data === undefined) return 0;
    
    if (typeof data === 'string') {
      return data.length * 2; // UTF-16 encoding
    }
    
    if (typeof data === 'number') {
      return 8; // 64-bit number
    }
    
    if (typeof data === 'boolean') {
      return 4;
    }
    
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    
    if (data instanceof Blob) {
      return data.size;
    }
    
    // For objects, estimate based on JSON size
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 1000; // Default estimate for complex objects
    }
  }

  /**
   * Get total cache size
   */
  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Check if we should evict entries
   */
  private shouldEvictEntries(newEntrySize: number): boolean {
    const currentSize = this.getCacheSize();
    const currentCount = this.cache.size;
    
    return (
      currentSize + newEntrySize > this.options.maxCacheSize ||
      currentCount >= this.options.maxCacheEntries
    );
  }

  /**
   * Evict least important entries to make space
   */
  private evictLeastImportant(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by importance (priority, access count, recency)
    entries.sort(([, a], [, b]) => {
      const scoreA = a.priority * a.accessCount * (Date.now() - a.lastAccessed);
      const scoreB = b.priority * b.accessCount * (Date.now() - b.lastAccessed);
      return scoreA - scoreB;
    });

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      freedSpace += entry.size;
    }
  }

  /**
   * Evict expired entries
   */
  private evictExpiredEntries(): number {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Evict least used entries
   */
  private evictLeastUsed(count: number): number {
    const entries = Array.from(this.cache.entries());
    
    // Sort by access count and recency
    entries.sort(([, a], [, b]) => {
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount;
      }
      return a.lastAccessed - b.lastAccessed;
    });

    let removed = 0;
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      removed++;
    }

    return removed;
  }

  /**
   * Evict a percentage of cache entries
   */
  private evictPercentage(percentage: number): number {
    const targetCount = Math.floor(this.cache.size * percentage);
    return this.evictLeastUsed(targetCount);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.memoryObserver) {
      this.memoryObserver.disconnect();
      this.memoryObserver = null;
    }

    this.clearCache();
  }
}

/**
 * SVG-specific memory manager
 */
export class SVGMemoryManager extends MemoryManager {
  private svgCache = new Map<string, { svg: string; processed: any; size: number }>();
  private animationFrameCache = new Map<string, any[]>();

  constructor(options: Partial<MemoryManagerOptions> = {}) {
    super({
      maxCacheSize: 200 * 1024 * 1024, // 200MB for SVG data
      maxCacheEntries: 500,
      ...options,
    });
  }

  /**
   * Cache processed SVG data
   */
  cacheSVG(key: string, svg: string, processed: any): void {
    const size = svg.length * 2 + this.estimateSize(processed);
    
    this.svgCache.set(key, { svg, processed, size });
    this.cache(key, { svg, processed }, 2); // Higher priority for SVG data
  }

  /**
   * Get cached SVG data
   */
  getCachedSVG(key: string): { svg: string; processed: any } | null {
    const cached = this.svgCache.get(key);
    if (cached) {
      return { svg: cached.svg, processed: cached.processed };
    }
    return this.get(key);
  }

  /**
   * Cache animation frames
   */
  cacheAnimationFrames(key: string, frames: any[]): void {
    const size = frames.reduce((sum, frame) => sum + this.estimateSize(frame), 0);
    
    // Only cache if size is reasonable
    if (size < 50 * 1024 * 1024) { // 50MB limit for animation frames
      this.animationFrameCache.set(key, frames);
      this.cache(key, frames, 1); // Lower priority for animation frames
    }
  }

  /**
   * Get cached animation frames
   */
  getCachedAnimationFrames(key: string): any[] | null {
    return this.animationFrameCache.get(key) || this.get(key);
  }

  /**
   * Clear SVG-specific caches
   */
  clearSVGCaches(): void {
    this.svgCache.clear();
    this.animationFrameCache.clear();
  }

  /**
   * Get SVG memory usage statistics
   */
  getSVGMemoryStats(): {
    svgCacheSize: number;
    animationCacheSize: number;
    totalSVGMemory: number;
  } {
    const svgSize = Array.from(this.svgCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const animationSize = Array.from(this.animationFrameCache.values())
      .reduce((sum, frames) => sum + frames.reduce((s, f) => s + this.estimateSize(f), 0), 0);

    return {
      svgCacheSize: svgSize,
      animationCacheSize: animationSize,
      totalSVGMemory: svgSize + animationSize,
    };
  }

  private estimateSize(data: any): number {
    // Use parent class method
    return super['estimateSize'](data);
  }
}

// Export singleton instances
export const memoryManager = new MemoryManager();
export const svgMemoryManager = new SVGMemoryManager();

// Utility functions
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isMemoryPressureHigh(): boolean {
  const stats = memoryManager.getMemoryStats();
  return stats.memoryPressure === 'high' || stats.memoryPressure === 'critical';
}

export function optimizeMemoryUsage(): void {
  if (isMemoryPressureHigh()) {
    memoryManager.handleMemoryPressure();
    svgMemoryManager.handleMemoryPressure();
  }
}

// Global memory pressure handler
if (typeof window !== 'undefined') {
  // Listen for memory pressure events (if supported)
  window.addEventListener('memory-pressure', () => {
    console.warn('Memory pressure event detected');
    optimizeMemoryUsage();
  });

  // Periodic memory check
  setInterval(() => {
    if (isMemoryPressureHigh()) {
      console.warn('High memory pressure detected, optimizing...');
      optimizeMemoryUsage();
    }
  }, 60000); // Check every minute
}
