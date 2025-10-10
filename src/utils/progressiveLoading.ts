import { lazy, ComponentType, LazyExoticComponent } from 'react';

export interface LoadingPriority {
  critical: 0;
  high: 1;
  medium: 2;
  low: 3;
  idle: 4;
}

export interface ComponentConfig {
  component: () => Promise<{ default: ComponentType<any> }>;
  priority: keyof LoadingPriority;
  preload?: boolean;
  dependencies?: string[];
  fallback?: ComponentType<any>;
  retryCount?: number;
  timeout?: number;
}

export interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error?: Error;
  progress: number;
}

export interface ProgressiveLoadingOptions {
  enablePreloading: boolean;
  maxConcurrentLoads: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutDuration: number;
  enablePrefetch: boolean;
  observeViewport: boolean;
}

export class ProgressiveLoader {
  private components = new Map<string, ComponentConfig>();
  private loadedComponents = new Map<string, LazyExoticComponent<ComponentType<any>>>();
  private loadingStates = new Map<string, LoadingState>();
  private loadQueue: string[] = [];
  private currentLoads = new Set<string>();
  private intersectionObserver: IntersectionObserver | null = null;
  private options: ProgressiveLoadingOptions;

  constructor(options: Partial<ProgressiveLoadingOptions> = {}) {
    this.options = {
      enablePreloading: true,
      maxConcurrentLoads: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      timeoutDuration: 10000,
      enablePrefetch: true,
      observeViewport: true,
      ...options,
    };

    this.initializeIntersectionObserver();
    this.initializeIdleLoading();
  }

  /**
   * Register a component for progressive loading
   */
  register(
    name: string,
    config: ComponentConfig
  ): LazyExoticComponent<ComponentType<any>> {
    this.components.set(name, config);
    
    const lazyComponent = lazy(async () => {
      return this.loadComponent(name);
    });

    this.loadedComponents.set(name, lazyComponent);
    
    // Initialize loading state
    this.loadingStates.set(name, {
      isLoading: false,
      isLoaded: false,
      hasError: false,
      progress: 0,
    });

    // Add to preload queue if enabled
    if (config.preload && this.options.enablePreloading) {
      this.scheduleLoad(name);
    }

    return lazyComponent;
  }

  /**
   * Get a registered component
   */
  get(name: string): LazyExoticComponent<ComponentType<any>> | null {
    return this.loadedComponents.get(name) || null;
  }

  /**
   * Preload a component
   */
  async preload(name: string): Promise<void> {
    const config = this.components.get(name);
    if (!config) {
      throw new Error(`Component ${name} not registered`);
    }

    if (this.isLoaded(name)) {
      return;
    }

    await this.loadComponent(name);
  }

  /**
   * Preload multiple components
   */
  async preloadMultiple(names: string[]): Promise<void> {
    const promises = names.map(name => this.preload(name).catch(console.error));
    await Promise.all(promises);
  }

  /**
   * Check if a component is loaded
   */
  isLoaded(name: string): boolean {
    return this.loadingStates.get(name)?.isLoaded || false;
  }

  /**
   * Check if a component is loading
   */
  isLoading(name: string): boolean {
    return this.loadingStates.get(name)?.isLoading || false;
  }

  /**
   * Get loading state for a component
   */
  getLoadingState(name: string): LoadingState | null {
    return this.loadingStates.get(name) || null;
  }

  /**
   * Get all loading states
   */
  getAllLoadingStates(): Map<string, LoadingState> {
    return new Map(this.loadingStates);
  }

  /**
   * Schedule component loading based on priority
   */
  private scheduleLoad(name: string): void {
    const config = this.components.get(name);
    if (!config || this.isLoaded(name) || this.isLoading(name)) {
      return;
    }

    // Insert into queue based on priority
    const priority = this.getPriorityValue(config.priority);
    let insertIndex = this.loadQueue.length;

    for (let i = 0; i < this.loadQueue.length; i++) {
      const queuedConfig = this.components.get(this.loadQueue[i]);
      if (queuedConfig && this.getPriorityValue(queuedConfig.priority) > priority) {
        insertIndex = i;
        break;
      }
    }

    this.loadQueue.splice(insertIndex, 0, name);
    this.processLoadQueue();
  }

  /**
   * Process the loading queue
   */
  private async processLoadQueue(): Promise<void> {
    while (
      this.loadQueue.length > 0 &&
      this.currentLoads.size < this.options.maxConcurrentLoads
    ) {
      const name = this.loadQueue.shift();
      if (!name || this.isLoaded(name) || this.isLoading(name)) {
        continue;
      }

      this.currentLoads.add(name);
      
      try {
        await this.loadComponent(name);
      } catch (error) {
        console.error(`Failed to load component ${name}:`, error);
      } finally {
        this.currentLoads.delete(name);
      }
    }
  }

  /**
   * Load a component with retry logic
   */
  private async loadComponent(name: string): Promise<{ default: ComponentType<any> }> {
    const config = this.components.get(name);
    if (!config) {
      throw new Error(`Component ${name} not registered`);
    }

    const state = this.loadingStates.get(name)!;
    
    if (state.isLoaded) {
      // Return cached component
      return config.component();
    }

    state.isLoading = true;
    state.hasError = false;
    state.progress = 0;

    let lastError: Error | null = null;
    const maxRetries = config.retryCount ?? this.options.retryAttempts;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check dependencies
        if (config.dependencies) {
          await this.loadDependencies(config.dependencies);
        }

        // Load component with timeout
        state.progress = 25;
        const componentPromise = config.component();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Component ${name} load timeout`));
          }, config.timeout ?? this.options.timeoutDuration);
        });

        state.progress = 50;
        const component = await Promise.race([componentPromise, timeoutPromise]);
        
        state.progress = 100;
        state.isLoaded = true;
        state.isLoading = false;
        
        return component;
      } catch (error) {
        lastError = error as Error;
        state.progress = 0;
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.options.retryDelay * (attempt + 1))
          );
        }
      }
    }

    // All retries failed
    state.isLoading = false;
    state.hasError = true;
    state.error = lastError || new Error(`Failed to load component ${name}`);
    
    throw state.error;
  }

  /**
   * Load component dependencies
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    const loadPromises = dependencies.map(async (dep) => {
      if (!this.isLoaded(dep)) {
        await this.preload(dep);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: keyof LoadingPriority): number {
    const priorities: LoadingPriority = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      idle: 4,
    };
    return priorities[priority];
  }

  /**
   * Initialize intersection observer for viewport-based loading
   */
  private initializeIntersectionObserver(): void {
    if (!this.options.observeViewport || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const componentName = entry.target.getAttribute('data-component');
            if (componentName && !this.isLoaded(componentName)) {
              this.scheduleLoad(componentName);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );
  }

  /**
   * Initialize idle loading for low-priority components
   */
  private initializeIdleLoading(): void {
    if (typeof requestIdleCallback === 'undefined') {
      return;
    }

    const loadIdleComponents = () => {
      const idleComponents = Array.from(this.components.entries())
        .filter(([name, config]) => 
          config.priority === 'idle' && 
          !this.isLoaded(name) && 
          !this.isLoading(name)
        )
        .map(([name]) => name);

      if (idleComponents.length > 0) {
        requestIdleCallback(() => {
          idleComponents.forEach(name => this.scheduleLoad(name));
        });
      }
    };

    // Start idle loading after initial load
    setTimeout(loadIdleComponents, 2000);
  }

  /**
   * Observe element for viewport-based loading
   */
  observeElement(element: Element, componentName: string): void {
    if (this.intersectionObserver) {
      element.setAttribute('data-component', componentName);
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop observing element
   */
  unobserveElement(element: Element): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Prefetch resources for future use
   */
  prefetch(urls: string[]): void {
    if (!this.options.enablePrefetch) return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    totalComponents: number;
    loadedComponents: number;
    loadingComponents: number;
    failedComponents: number;
    queuedComponents: number;
  } {
    const states = Array.from(this.loadingStates.values());
    
    return {
      totalComponents: this.components.size,
      loadedComponents: states.filter(s => s.isLoaded).length,
      loadingComponents: states.filter(s => s.isLoading).length,
      failedComponents: states.filter(s => s.hasError).length,
      queuedComponents: this.loadQueue.length,
    };
  }

  /**
   * Clear all caches and reset state
   */
  reset(): void {
    this.components.clear();
    this.loadedComponents.clear();
    this.loadingStates.clear();
    this.loadQueue.length = 0;
    this.currentLoads.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    this.reset();
  }
}

/**
 * SVG-specific progressive loader
 */
export class SVGProgressiveLoader extends ProgressiveLoader {
  private svgCache = new Map<string, string>();
  private processingQueue = new Set<string>();

  /**
   * Register SVG component with preprocessing
   */
  registerSVGComponent(
    name: string,
    svgLoader: () => Promise<string>,
    config: Omit<ComponentConfig, 'component'>
  ): LazyExoticComponent<ComponentType<any>> {
    const componentConfig: ComponentConfig = {
      ...config,
      component: async () => {
        const svgContent = await this.loadAndProcessSVG(name, svgLoader);
        
        // Return a React component that renders the SVG
        return {
          default: ({ className, ...props }: any) => {
            return React.createElement('div', {
              className,
              dangerouslySetInnerHTML: { __html: svgContent },
              ...props,
            });
          },
        };
      },
    };

    return this.register(name, componentConfig);
  }

  /**
   * Load and process SVG with caching
   */
  private async loadAndProcessSVG(
    name: string,
    loader: () => Promise<string>
  ): Promise<string> {
    // Check cache first
    if (this.svgCache.has(name)) {
      return this.svgCache.get(name)!;
    }

    // Prevent duplicate processing
    if (this.processingQueue.has(name)) {
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.svgCache.has(name)) {
            resolve(this.svgCache.get(name)!);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.processingQueue.add(name);

    try {
      const svgContent = await loader();
      const processedSVG = this.optimizeSVG(svgContent);
      
      this.svgCache.set(name, processedSVG);
      return processedSVG;
    } finally {
      this.processingQueue.delete(name);
    }
  }

  /**
   * Basic SVG optimization
   */
  private optimizeSVG(svgContent: string): string {
    return svgContent
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Preload SVG content
   */
  async preloadSVG(name: string): Promise<string> {
    if (this.svgCache.has(name)) {
      return this.svgCache.get(name)!;
    }

    await this.preload(name);
    return this.svgCache.get(name) || '';
  }

  /**
   * Get SVG cache statistics
   */
  getSVGStats(): {
    cachedSVGs: number;
    processingQueue: number;
    totalCacheSize: number;
  } {
    const totalSize = Array.from(this.svgCache.values())
      .reduce((sum, svg) => sum + svg.length, 0);

    return {
      cachedSVGs: this.svgCache.size,
      processingQueue: this.processingQueue.size,
      totalCacheSize: totalSize,
    };
  }
}

// Export singleton instances
export const progressiveLoader = new ProgressiveLoader();
export const svgProgressiveLoader = new SVGProgressiveLoader();

// Utility functions
export function createComponentConfig(
  component: () => Promise<{ default: ComponentType<any> }>,
  priority: keyof LoadingPriority = 'medium',
  options: Partial<Omit<ComponentConfig, 'component' | 'priority'>> = {}
): ComponentConfig {
  return {
    component,
    priority,
    preload: false,
    retryCount: 3,
    timeout: 10000,
    ...options,
  };
}

export function withProgressiveLoading<P extends object>(
  componentName: string,
  _fallback?: ComponentType<any>
) {
  return function (WrappedComponent: ComponentType<P>) {
    const loader = progressiveLoader.get(componentName);
    
    if (!loader) {
      console.warn(`Component ${componentName} not registered for progressive loading`);
      return WrappedComponent;
    }

    return loader;
  };
}

// React hook for progressive loading
export function useProgressiveLoading(componentName: string) {
  const [loadingState, setLoadingState] = React.useState<LoadingState>(() => 
    progressiveLoader.getLoadingState(componentName) || {
      isLoading: false,
      isLoaded: false,
      hasError: false,
      progress: 0,
    }
  );

  React.useEffect(() => {
    const checkState = () => {
      const state = progressiveLoader.getLoadingState(componentName);
      if (state) {
        setLoadingState(state);
      }
    };

    const interval = setInterval(checkState, 100);
    return () => clearInterval(interval);
  }, [componentName]);

  const preload = React.useCallback(() => {
    return progressiveLoader.preload(componentName);
  }, [componentName]);

  return {
    ...loadingState,
    preload,
  };
}

// Global React import (would be imported from 'react' in actual usage)
declare const React: any;
