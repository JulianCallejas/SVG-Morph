export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  precision: number;
  velocity: number;
}

export interface PhysicsPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PhysicsOptions {
  springConfig: SpringConfig;
  enableGravity: boolean;
  gravityStrength: number;
  enableFriction: boolean;
  frictionCoefficient: number;
  enableCollisions: boolean;
  boundaryBehavior: 'bounce' | 'wrap' | 'stop';
  timeStep: number;
}

export interface AnimationFrame {
  progress: number;
  points: PhysicsPoint[];
  timestamp: number;
}

export class PhysicsSimulator {
  private options: PhysicsOptions;
  private animationFrames: AnimationFrame[] = [];
  private isSimulating = false;

  constructor(options: Partial<PhysicsOptions> = {}) {
    this.options = {
      enableGravity: false,
      gravityStrength: 9.81,
      enableFriction: false,
      frictionCoefficient: 0.1,
      enableCollisions: false,
      boundaryBehavior: 'bounce',
      timeStep: 1 / 60, // 60 FPS
      ...options,
      springConfig: {
        stiffness: 100,
        damping: 10,
        mass: 1,
        precision: 0.01,
        velocity: 0,
        ...(options.springConfig || {}),
      },
    };
  }

  /**
   * Create spring-based animation between two sets of points
   */
  createSpringAnimation(
    sourcePoints: PhysicsPoint[],
    targetPoints: PhysicsPoint[],
    duration: number
  ): AnimationFrame[] {
    this.animationFrames = [];
    this.isSimulating = true;

    const frames: AnimationFrame[] = [];
    const frameCount = Math.ceil(duration / this.options.timeStep);
    
    // Initialize physics points with source positions and zero velocity
    const physicsPoints: PhysicsPoint[] = sourcePoints.map(point => ({
      ...point,
      vx: point.vx || 0,
      vy: point.vy || 0,
    }));

    // Ensure we have matching target points
    const normalizedTargetPoints = this.normalizePointArrays(sourcePoints, targetPoints);

    for (let frame = 0; frame <= frameCount; frame++) {
      const time = frame * this.options.timeStep;
      const progress = Math.min(time / duration, 1);
      
      // Update physics for each point
      const updatedPoints = physicsPoints.map((point, index) => {
        const target = normalizedTargetPoints[index];
        return this.updatePointPhysics(point, target, this.options.timeStep);
      });

      // Copy updated positions back to physics points
      physicsPoints.forEach((point, index) => {
        point.x = updatedPoints[index].x;
        point.y = updatedPoints[index].y;
        point.vx = updatedPoints[index].vx;
        point.vy = updatedPoints[index].vy;
      });

      frames.push({
        progress,
        points: updatedPoints.map(p => ({ ...p })),
        timestamp: time,
      });

      // Check if animation has settled
      if (this.hasSettled(physicsPoints, normalizedTargetPoints)) {
        break;
      }
    }

    this.animationFrames = frames;
    this.isSimulating = false;
    return frames;
  }

  /**
   * Create damped oscillation animation
   */
  createDampedOscillation(
    centerPoints: PhysicsPoint[],
    amplitude: number,
    frequency: number,
    duration: number
  ): AnimationFrame[] {
    const frames: AnimationFrame[] = [];
    const frameCount = Math.ceil(duration / this.options.timeStep);
    
    for (let frame = 0; frame <= frameCount; frame++) {
      const time = frame * this.options.timeStep;
      const progress = time / duration;
      
      // Damped oscillation formula: A * e^(-damping * t) * cos(2π * frequency * t)
      const dampingFactor = Math.exp(-this.options.springConfig.damping * time);
      const oscillation = Math.cos(2 * Math.PI * frequency * time);
      const currentAmplitude = amplitude * dampingFactor * oscillation;
      
      const points = centerPoints.map(centerPoint => ({
        x: centerPoint.x + currentAmplitude * Math.cos(time),
        y: centerPoint.y + currentAmplitude * Math.sin(time),
        vx: 0,
        vy: 0,
      }));

      frames.push({
        progress,
        points,
        timestamp: time,
      });
    }

    return frames;
  }

  /**
   * Create elastic bounce animation
   */
  createElasticBounce(
    sourcePoints: PhysicsPoint[],
    targetPoints: PhysicsPoint[],
    bounceCount: number,
    duration: number
  ): AnimationFrame[] {
    const frames: AnimationFrame[] = [];
    const frameCount = Math.ceil(duration / this.options.timeStep);
    const normalizedTargetPoints = this.normalizePointArrays(sourcePoints, targetPoints);
    
    for (let frame = 0; frame <= frameCount; frame++) {
      const time = frame * this.options.timeStep;
      const progress = time / duration;
      
      // Elastic easing with bounce
      const elasticProgress = this.elasticEaseOut(progress, bounceCount);
      
      const points = sourcePoints.map((sourcePoint, index) => {
        const targetPoint = normalizedTargetPoints[index];
        return {
          x: sourcePoint.x + (targetPoint.x - sourcePoint.x) * elasticProgress,
          y: sourcePoint.y + (targetPoint.y - sourcePoint.y) * elasticProgress,
          vx: 0,
          vy: 0,
        };
      });

      frames.push({
        progress,
        points,
        timestamp: time,
      });
    }

    return frames;
  }

  /**
   * Apply physics simulation to SVG path morphing
   */
  applyPhysicsToMorph(
    sourceSVG: string,
    targetSVG: string,
    animationType: 'spring' | 'damped' | 'elastic',
    duration: number,
    options: Partial<PhysicsOptions> = {}
  ): string[] {
    // Update options
    this.options = { ...this.options, ...options };

    // Extract points from SVG paths
    const sourcePoints = this.extractPointsFromSVG(sourceSVG);
    const targetPoints = this.extractPointsFromSVG(targetSVG);

    let frames: AnimationFrame[] = [];

    switch (animationType) {
      case 'spring':
        frames = this.createSpringAnimation(sourcePoints, targetPoints, duration);
        break;
      case 'damped':
        frames = this.createDampedOscillation(sourcePoints, 10, 2, duration);
        break;
      case 'elastic':
        frames = this.createElasticBounce(sourcePoints, targetPoints, 3, duration);
        break;
    }

    // Convert frames back to SVG strings
    return frames.map(frame => this.generateSVGFromPoints(frame.points, sourceSVG));
  }

  /**
   * Get current animation progress
   */
  getAnimationProgress(): number {
    if (this.animationFrames.length === 0) return 0;
    return this.animationFrames[this.animationFrames.length - 1].progress;
  }

  /**
   * Check if simulation is currently running
   */
  isRunning(): boolean {
    return this.isSimulating;
  }

  private updatePointPhysics(
    point: PhysicsPoint,
    target: PhysicsPoint,
    deltaTime: number
  ): PhysicsPoint {
    const { stiffness, damping, mass } = this.options.springConfig;
    
    // Calculate spring force (Hooke's law)
    const dx = target.x - point.x;
    const dy = target.y - point.y;
    
    const springForceX = stiffness * dx;
    const springForceY = stiffness * dy;
    
    // Calculate damping force
    const dampingForceX = -damping * point.vx;
    const dampingForceY = -damping * point.vy;
    
    // Total force
    let totalForceX = springForceX + dampingForceX;
    let totalForceY = springForceY + dampingForceY;
    
    // Apply gravity if enabled
    if (this.options.enableGravity) {
      totalForceY += mass * this.options.gravityStrength;
    }
    
    // Apply friction if enabled
    if (this.options.enableFriction) {
      const frictionX = -this.options.frictionCoefficient * point.vx;
      const frictionY = -this.options.frictionCoefficient * point.vy;
      totalForceX += frictionX;
      totalForceY += frictionY;
    }
    
    // Calculate acceleration (F = ma)
    const accelerationX = totalForceX / mass;
    const accelerationY = totalForceY / mass;
    
    // Update velocity (v = v0 + at)
    const newVx = point.vx + accelerationX * deltaTime;
    const newVy = point.vy + accelerationY * deltaTime;
    
    // Update position (x = x0 + vt)
    const newX = point.x + newVx * deltaTime;
    const newY = point.y + newVy * deltaTime;
    
    return {
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
    };
  }

  private hasSettled(
    currentPoints: PhysicsPoint[],
    targetPoints: PhysicsPoint[]
  ): boolean {
    const { precision } = this.options.springConfig;
    
    return currentPoints.every((point, index) => {
      const target = targetPoints[index];
      const dx = Math.abs(point.x - target.x);
      const dy = Math.abs(point.y - target.y);
      const velocityMagnitude = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
      
      return dx < precision && dy < precision && velocityMagnitude < precision;
    });
  }

  private normalizePointArrays(
    sourcePoints: PhysicsPoint[],
    targetPoints: PhysicsPoint[]
  ): PhysicsPoint[] {
    const maxLength = Math.max(sourcePoints.length, targetPoints.length);
    const normalized: PhysicsPoint[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      const targetPoint = targetPoints[i] || targetPoints[targetPoints.length - 1];
      
      normalized.push({
        x: targetPoint.x,
        y: targetPoint.y,
        vx: 0,
        vy: 0,
      });
    }
    
    return normalized;
  }

  private elasticEaseOut(t: number, _bounces: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    
    const p = 0.3;
    const s = p / 4;
    
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  }

  private extractPointsFromSVG(svgContent: string): PhysicsPoint[] {
    const points: PhysicsPoint[] = [];
    
    // Simple regex to extract path data
    const pathMatch = svgContent.match(/d="([^"]+)"/);
    if (!pathMatch) return points;
    
    const pathData = pathMatch[1];
    const coordinates = pathData.match(/[-+]?[0-9]*\.?[0-9]+/g);
    
    if (coordinates) {
      for (let i = 0; i < coordinates.length - 1; i += 2) {
        points.push({
          x: parseFloat(coordinates[i]),
          y: parseFloat(coordinates[i + 1]),
          vx: 0,
          vy: 0,
        });
      }
    }
    
    return points;
  }

  private generateSVGFromPoints(points: PhysicsPoint[], templateSVG: string): string {
    if (points.length === 0) return templateSVG;
    
    // Generate path data from points
    let pathData = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Replace the path data in the template SVG
    return templateSVG.replace(/d="[^"]*"/, `d="${pathData}"`);
  }
}

// Predefined spring configurations
export const SpringPresets = {
  gentle: {
    stiffness: 120,
    damping: 14,
    mass: 1,
    precision: 0.01,
    velocity: 0,
  },
  wobbly: {
    stiffness: 180,
    damping: 12,
    mass: 1,
    precision: 0.01,
    velocity: 0,
  },
  stiff: {
    stiffness: 210,
    damping: 20,
    mass: 1,
    precision: 0.01,
    velocity: 0,
  },
  slow: {
    stiffness: 280,
    damping: 60,
    mass: 1,
    precision: 0.01,
    velocity: 0,
  },
  bouncy: {
    stiffness: 400,
    damping: 8,
    mass: 1,
    precision: 0.01,
    velocity: 0,
  },
} as const;

// Export singleton instance
export const physicsSimulator = new PhysicsSimulator();

// Utility functions
export function createPhysicsOptions(overrides: Partial<PhysicsOptions> = {}): PhysicsOptions {
  return {
    springConfig: SpringPresets.gentle,
    enableGravity: false,
    gravityStrength: 9.81,
    enableFriction: false,
    frictionCoefficient: 0.1,
    enableCollisions: false,
    boundaryBehavior: 'bounce',
    timeStep: 1 / 60,
    ...overrides,
  };
}

export function createSpringConfig(preset: keyof typeof SpringPresets, overrides: Partial<SpringConfig> = {}): SpringConfig {
  return {
    ...SpringPresets[preset],
    ...overrides,
  };
}
