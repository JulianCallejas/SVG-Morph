import { SVGData } from '../types/svg';
import { workerManager } from './workerManager';

export interface MorphingStage {
  id: string;
  svgData: SVGData;
  duration: number;
  easing: string;
  delay: number;
  name: string;
}

export interface MultiStageSequence {
  id: string;
  name: string;
  stages: MorphingStage[];
  totalDuration: number;
  loop: boolean;
  autoReverse: boolean;
}

export interface StageTransition {
  fromStage: number;
  toStage: number;
  progress: number;
  interpolatedSVG: SVGData;
}

export class MultiStageMorphingEngine {
  private sequences: Map<string, MultiStageSequence> = new Map();
  private activeSequence: string | null = null;
  private currentProgress: number = 0;
  private animationId: number | null = null;
  private onProgressCallback?: (transition: StageTransition) => void;
  private onStageChangeCallback?: (stageIndex: number) => void;

  /**
   * Create a new multi-stage morphing sequence
   */
  createSequence(
    name: string,
    svgDataArray: SVGData[],
    durations?: number[],
    easings?: string[],
    delays?: number[]
  ): string;
  createSequence(
    name: string,
    stages: MorphingStage[]
  ): string;
  createSequence(
    name: string,
    svgDataArrayOrStages: SVGData[] | MorphingStage[],
    durations: number[] = [],
    easings: string[] = [],
    delays: number[] = []
  ): string {
    const sequenceId = `sequence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let stages: MorphingStage[];
    
    // Check if we received MorphingStage[] or SVGData[]
    if (svgDataArrayOrStages.length > 0 && 'svgData' in svgDataArrayOrStages[0]) {
      // It's MorphingStage[]
      stages = svgDataArrayOrStages as MorphingStage[];
    } else {
      // It's SVGData[]
      const svgDataArray = svgDataArrayOrStages as SVGData[];
      stages = svgDataArray.map((svgData, index) => ({
        id: `stage_${index}`,
        svgData,
        duration: durations[index] || 1000,
        easing: easings[index] || 'ease-in-out',
        delay: delays[index] || 0,
        name: `Stage ${index + 1}`
      }));
    }

    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration + stage.delay, 0);

    const sequence: MultiStageSequence = {
      id: sequenceId,
      name,
      stages,
      totalDuration,
      loop: false,
      autoReverse: false
    };

    this.sequences.set(sequenceId, sequence);
    return sequenceId;
  }

  /**
   * Get all available sequences
   */
  getSequences(): MultiStageSequence[] {
    return Array.from(this.sequences.values());
  }

  /**
   * Get a specific sequence by ID
   */
  getSequence(sequenceId: string): MultiStageSequence | undefined {
    return this.sequences.get(sequenceId);
  }

  /**
   * Update sequence properties
   */
  updateSequence(sequenceId: string, updates: Partial<MultiStageSequence>): boolean {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return false;

    Object.assign(sequence, updates);
    
    // Recalculate total duration if stages were updated
    if (updates.stages) {
      sequence.totalDuration = sequence.stages.reduce(
        (sum, stage) => sum + stage.duration + stage.delay, 
        0
      );
    }

    this.sequences.set(sequenceId, sequence);
    return true;
  }

  /**
   * Delete a sequence
   */
  deleteSequence(sequenceId: string): boolean {
    if (this.activeSequence === sequenceId) {
      this.stop();
    }
    return this.sequences.delete(sequenceId);
  }

  /**
   * Calculate which stage we're in and the progress within that stage
   */
  private calculateStageProgress(sequence: MultiStageSequence, globalProgress: number): {
    fromStageIndex: number;
    toStageIndex: number;
    stageProgress: number;
    isTransitioning: boolean;
  } {
    const totalTime = globalProgress * sequence.totalDuration;
    let accumulatedTime = 0;

    for (let i = 0; i < sequence.stages.length - 1; i++) {
      const currentStage = sequence.stages[i];
      const stageEndTime = accumulatedTime + currentStage.duration + currentStage.delay;

      if (totalTime <= stageEndTime) {
        const stageStartTime = accumulatedTime + currentStage.delay;
        
        if (totalTime < stageStartTime) {
          // We're in the delay period, show current stage
          return {
            fromStageIndex: i,
            toStageIndex: i,
            stageProgress: 0,
            isTransitioning: false
          };
        }

        // We're transitioning from current to next stage
        const transitionProgress = (totalTime - stageStartTime) / currentStage.duration;
        return {
          fromStageIndex: i,
          toStageIndex: i + 1,
          stageProgress: Math.min(1, Math.max(0, transitionProgress)),
          isTransitioning: true
        };
      }

      accumulatedTime = stageEndTime;
    }

    // We're at the end, show the last stage
    return {
      fromStageIndex: sequence.stages.length - 1,
      toStageIndex: sequence.stages.length - 1,
      stageProgress: 1,
      isTransitioning: false
    };
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'bounce':
        if (progress < 1 / 2.75) {
          return 7.5625 * progress * progress;
        } else if (progress < 2 / 2.75) {
          return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
        } else if (progress < 2.5 / 2.75) {
          return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
        } else {
          return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
        }
      case 'elastic': {
        const c4 = (2 * Math.PI) / 3;
        return progress === 0 ? 0 : progress === 1 ? 1 :
          -Math.pow(2, 10 * progress - 10) * Math.sin((progress * 10 - 10.75) * c4);
      }
      default:
        return progress;
    }
  }

  /**
   * Interpolate between two SVG stages
   */
  private async interpolateStages(
    fromSVG: SVGData,
    toSVG: SVGData,
    progress: number,
    easing: string
  ): Promise<SVGData> {
    const easedProgress = this.applyEasing(progress, easing);

    try {
      // Validate that both SVGs have paths arrays
      if (!fromSVG.paths || !Array.isArray(fromSVG.paths) || !toSVG.paths || !Array.isArray(toSVG.paths)) {
        console.warn('Invalid SVG data: missing or invalid paths array');
        return fromSVG;
      }

      // Use the existing worker manager for path interpolation
      const interpolatedPaths = await Promise.all(
        fromSVG.paths.map(async (fromPath, index) => {
          const toPath = toSVG.paths[index];
          if (!toPath) return fromPath;

          const interpolatedD = await workerManager.interpolatePaths(
            fromPath.d,
            toPath.d,
            easedProgress
          );

          return {
            ...fromPath,
            d: interpolatedD,
            fill: this.interpolateColor(fromPath.fill, toPath.fill, easedProgress),
            stroke: this.interpolateColor(fromPath.stroke, toPath.stroke, easedProgress),
            strokeWidth: this.interpolateNumber(
              parseFloat(fromPath.strokeWidth || '1'),
              parseFloat(toPath.strokeWidth || '1'),
              easedProgress
            ).toString(),
            opacity: this.interpolateNumber(
              parseFloat(fromPath.opacity || '1'),
              parseFloat(toPath.opacity || '1'),
              easedProgress
            ).toString()
          };
        })
      );

      return {
        ...fromSVG,
        paths: interpolatedPaths,
        viewBox: this.interpolateViewBox(fromSVG.viewBox, toSVG.viewBox, easedProgress)
      };
    } catch (error) {
      console.error('Error interpolating stages:', error);
      return fromSVG;
    }
  }

  /**
   * Interpolate between two colors
   */
  private interpolateColor(from: string | undefined, to: string | undefined, progress: number): string | undefined {
    if (!from || !to) return from || to;
    
    // Simple RGB interpolation (can be enhanced with proper color space handling)
    const fromRgb = this.hexToRgb(from);
    const toRgb = this.hexToRgb(to);
    
    if (!fromRgb || !toRgb) return from;

    const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
    const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
    const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Interpolate between two numbers
   */
  private interpolateNumber(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  /**
   * Interpolate between two viewBox values
   */
  private interpolateViewBox(from: string, to: string, progress: number): string {
    const fromValues = from.split(' ').map(Number);
    const toValues = to.split(' ').map(Number);

    if (fromValues.length !== 4 || toValues.length !== 4) return from;

    const interpolated = fromValues.map((fromVal, index) =>
      this.interpolateNumber(fromVal, toValues[index], progress)
    );

    return interpolated.join(' ');
  }

  /**
   * Play a sequence
   */
  async play(
    sequenceId: string,
    onProgress?: (transition: StageTransition) => void,
    onStageChange?: (stageIndex: number) => void
  ): Promise<void> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence || sequence.stages.length < 2) {
      throw new Error('Invalid sequence or insufficient stages');
    }

    this.activeSequence = sequenceId;
    this.onProgressCallback = onProgress;
    this.onStageChangeCallback = onStageChange;
    this.currentProgress = 0;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let lastStageIndex = -1;

      const animate = async () => {
        if (this.activeSequence !== sequenceId) {
          resolve();
          return;
        }

        const elapsed = Date.now() - startTime;
        this.currentProgress = Math.min(1, elapsed / sequence.totalDuration);

        const stageInfo = this.calculateStageProgress(sequence, this.currentProgress);
        
        // Notify stage change
        if (stageInfo.fromStageIndex !== lastStageIndex && this.onStageChangeCallback) {
          this.onStageChangeCallback(stageInfo.fromStageIndex);
          lastStageIndex = stageInfo.fromStageIndex;
        }

        if (stageInfo.isTransitioning) {
          const fromStage = sequence.stages[stageInfo.fromStageIndex];
          const toStage = sequence.stages[stageInfo.toStageIndex];

          try {
            const interpolatedSVG = await this.interpolateStages(
              fromStage.svgData,
              toStage.svgData,
              stageInfo.stageProgress,
              fromStage.easing
            );

            const transition: StageTransition = {
              fromStage: stageInfo.fromStageIndex,
              toStage: stageInfo.toStageIndex,
              progress: stageInfo.stageProgress,
              interpolatedSVG
            };

            if (this.onProgressCallback) {
              this.onProgressCallback(transition);
            }
          } catch (error) {
            console.error('Error during stage interpolation:', error);
          }
        }

        if (this.currentProgress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          // Animation complete
          if (sequence.loop) {
            // Restart the animation
            this.play(sequenceId, onProgress, onStageChange);
          } else if (sequence.autoReverse) {
            // Reverse the sequence
            this.reverse(sequenceId, onProgress, onStageChange);
          } else {
            this.activeSequence = null;
            resolve();
          }
        }
      };

      this.animationId = requestAnimationFrame(animate);
    });
  }

  /**
   * Play sequence in reverse
   */
  async reverse(
    sequenceId: string,
    onProgress?: (transition: StageTransition) => void,
    onStageChange?: (stageIndex: number) => void
  ): Promise<void> {
    const sequence = this.sequences.get(sequenceId);
    if (!sequence) return;

    // Create a reversed copy of the sequence
    const reversedSequence: MultiStageSequence = {
      ...sequence,
      id: `${sequence.id}_reversed`,
      stages: [...sequence.stages].reverse()
    };

    // Temporarily store the reversed sequence
    this.sequences.set(reversedSequence.id, reversedSequence);

    try {
      await this.play(reversedSequence.id, onProgress, onStageChange);
    } finally {
      // Clean up the temporary reversed sequence
      this.sequences.delete(reversedSequence.id);
    }
  }

  /**
   * Pause the current animation
   */
  pause(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Stop the current animation
   */
  stop(): void {
    this.pause();
    this.activeSequence = null;
    this.currentProgress = 0;
  }

  /**
   * Seek to a specific progress in the current sequence
   */
  async seekTo(progress: number): Promise<void> {
    if (!this.activeSequence) return;

    const sequence = this.sequences.get(this.activeSequence);
    if (!sequence) return;

    this.currentProgress = Math.min(1, Math.max(0, progress));
    const stageInfo = this.calculateStageProgress(sequence, this.currentProgress);

    if (stageInfo.isTransitioning && this.onProgressCallback) {
      const fromStage = sequence.stages[stageInfo.fromStageIndex];
      const toStage = sequence.stages[stageInfo.toStageIndex];

      try {
        const interpolatedSVG = await this.interpolateStages(
          fromStage.svgData,
          toStage.svgData,
          stageInfo.stageProgress,
          fromStage.easing
        );

        const transition: StageTransition = {
          fromStage: stageInfo.fromStageIndex,
          toStage: stageInfo.toStageIndex,
          progress: stageInfo.stageProgress,
          interpolatedSVG
        };

        this.onProgressCallback(transition);
      } catch (error) {
        console.error('Error during seek interpolation:', error);
      }
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): {
    isPlaying: boolean;
    activeSequence: string | null;
    progress: number;
    currentStage: number;
  } {
    const sequence = this.activeSequence ? this.sequences.get(this.activeSequence) : null;
    let currentStage = 0;

    if (sequence) {
      const stageInfo = this.calculateStageProgress(sequence, this.currentProgress);
      currentStage = stageInfo.fromStageIndex;
    }

    return {
      isPlaying: this.animationId !== null,
      activeSequence: this.activeSequence,
      progress: this.currentProgress,
      currentStage
    };
  }

  /**
   * Export sequence as animation data
   */
  exportSequence(sequenceId: string): MultiStageSequence | null {
    return this.sequences.get(sequenceId) || null;
  }

  /**
   * Import sequence from animation data
   */
  importSequence(sequenceData: MultiStageSequence): string {
    const newId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const importedSequence = {
      ...sequenceData,
      id: newId
    };

    this.sequences.set(newId, importedSequence);
    return newId;
  }
}

// Export singleton instance
export const multiStageMorphing = new MultiStageMorphingEngine();
