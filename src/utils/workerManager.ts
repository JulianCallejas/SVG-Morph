import { WorkerMessage, WorkerResponse, SVGData } from '../workers/pathProcessor';

export interface WorkerTask {
  id: string;
  type: WorkerMessage['type'];
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export class WorkerManager {
  private worker: Worker | null = null;
  private tasks: Map<string, WorkerTask> = new Map();
  private taskCounter = 0;
  private isInitialized = false;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker from the TypeScript file
      this.worker = new Worker(
        new URL('../workers/pathProcessor.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error);
      this.isInitialized = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { type, id, payload, error, progress } = event.data;
    const task = this.tasks.get(id);

    if (!task) {
      console.warn(`Received message for unknown task: ${id}`);
      return;
    }

    switch (type) {
      case 'SUCCESS':
        task.resolve(payload);
        this.tasks.delete(id);
        break;

      case 'ERROR':
        task.reject(new Error(error || 'Worker task failed'));
        this.tasks.delete(id);
        break;

      case 'PROGRESS':
        if (task.onProgress && typeof progress === 'number') {
          task.onProgress(progress);
        }
        break;
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Web Worker error:', error);
    
    // Reject all pending tasks
    this.tasks.forEach(task => {
      task.reject(new Error('Worker encountered an error'));
    });
    this.tasks.clear();

    // Try to reinitialize the worker
    this.initializeWorker();
  }

  private generateTaskId(): string {
    return `task_${++this.taskCounter}_${Date.now()}`;
  }

  private postMessage<T>(
    type: WorkerMessage['type'],
    payload: any,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized || !this.worker) {
        reject(new Error('Web Worker is not available'));
        return;
      }

      const id = this.generateTaskId();
      const task: WorkerTask = {
        id,
        type,
        resolve,
        reject,
        onProgress
      };

      this.tasks.set(id, task);

      const message: WorkerMessage = {
        type,
        id,
        payload
      };

      this.worker.postMessage(message);
    });
  }

  // Public API methods
  async parseSVG(svgString: string, onProgress?: (progress: number) => void): Promise<SVGData> {
    if (!this.isInitialized) {
      // Fallback to synchronous processing
      const { parseSVG } = await import('./svgMorphing');
      return parseSVG(svgString);
    }

    return this.postMessage<SVGData>('PARSE_SVG', { svgString }, onProgress);
  }

  async normalizePath(
    pathData: string,
    targetPoints: number = 100,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.isInitialized) {
      // Fallback to synchronous processing
      const { normalizePath } = await import('./svgMorphing');
      return normalizePath(pathData, targetPoints);
    }

    return this.postMessage<string>('NORMALIZE_PATH', { pathData, targetPoints }, onProgress);
  }

  async interpolatePaths(
    sourcePath: string,
    targetPath: string,
    progress: number,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.isInitialized) {
      // Fallback to synchronous processing
      const { interpolatePaths } = await import('./svgMorphing');
      return interpolatePaths(sourcePath, targetPath, progress);
    }

    return this.postMessage<string>('INTERPOLATE_PATHS', {
      sourcePath,
      targetPath,
      progress
    }, onProgress);
  }

  async createInterpolatedSVG(
    sourceSVG: string,
    targetSVG: string,
    progress: number,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    if (!this.isInitialized) {
      // Fallback to synchronous processing
      const { createInterpolatedSVG } = await import('./svgMorphing');
      return createInterpolatedSVG(sourceSVG, targetSVG, progress);
    }

    return this.postMessage<string>('CREATE_INTERPOLATED_SVG', {
      sourceSVG,
      targetSVG,
      progress
    }, onProgress);
  }

  // Batch processing for multiple operations
  async batchProcess<T>(
    operations: Array<{
      type: WorkerMessage['type'];
      payload: any;
      onProgress?: (progress: number) => void;
    }>
  ): Promise<T[]> {
    const promises = operations.map(op => 
      this.postMessage<T>(op.type, op.payload, op.onProgress)
    );

    return Promise.all(promises);
  }

  // Cleanup method
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending tasks
    this.tasks.forEach(task => {
      task.reject(new Error('Worker was terminated'));
    });
    this.tasks.clear();
    this.isInitialized = false;
  }

  // Check if worker is available
  get isWorkerAvailable(): boolean {
    return this.isInitialized && this.worker !== null;
  }

  // Get number of pending tasks
  get pendingTasksCount(): number {
    return this.tasks.size;
  }
}

// Singleton instance
export const workerManager = new WorkerManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}
