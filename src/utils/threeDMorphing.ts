import { SVGData } from '../types/svg';

export interface ThreeDMorphingOptions {
  depth: number;
  perspective: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  lighting: {
    ambient: number;
    directional: number;
    position: { x: number; y: number; z: number };
  };
  material: {
    color: string;
    metalness: number;
    roughness: number;
    opacity: number;
  };
  animation: {
    autoRotate: boolean;
    rotationSpeed: number;
    morphSpeed: number;
  };
}

export interface ThreeDScene {
  scene: any; // THREE.Scene
  camera: any; // THREE.Camera
  renderer: any; // THREE.WebGLRenderer
  mesh: any; // THREE.Mesh
  controls: any; // OrbitControls
}

export class ThreeDMorphingEngine {
  private THREE: any = null;
  private scene: ThreeDScene | null = null;
  private animationId: number | null = null;
  private isInitialized = false;

  private defaultOptions: ThreeDMorphingOptions = {
    depth: 20,
    perspective: 1000,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    lighting: {
      ambient: 0.4,
      directional: 0.8,
      position: { x: 10, y: 10, z: 10 }
    },
    material: {
      color: '#5cbe2c',
      metalness: 0.3,
      roughness: 0.4,
      opacity: 1.0
    },
    animation: {
      autoRotate: true,
      rotationSpeed: 0.01,
      morphSpeed: 0.02
    }
  };

  /**
   * Initialize Three.js (lazy loading)
   */
  async initializeThreeJS(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import of Three.js to reduce bundle size
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      
      this.THREE = {
        ...THREE,
        OrbitControls
      };
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load Three.js:', error);
      throw new Error('Three.js is required for 3D morphing preview');
    }
  }

  /**
   * Create 3D scene with SVG morphing
   */
  async create3DScene(
    container: HTMLElement,
    sourceSVG: SVGData,
    targetSVG: SVGData,
    options: Partial<ThreeDMorphingOptions> = {}
  ): Promise<ThreeDScene> {
    await this.initializeThreeJS();
    
    const opts = { ...this.defaultOptions, ...options };
    const { THREE } = this;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, opts.perspective / 10);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(renderer.domElement);

    // Create lighting
    this.setupLighting(scene, opts);

    // Create 3D mesh from SVG
    const mesh = await this.createSVGMesh(sourceSVG, targetSVG, opts);
    scene.add(mesh);

    // Create controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = opts.animation.autoRotate;
    controls.autoRotateSpeed = opts.animation.rotationSpeed * 100;

    const sceneData: ThreeDScene = {
      scene,
      camera,
      renderer,
      mesh,
      controls
    };

    this.scene = sceneData;
    this.startAnimation();

    return sceneData;
  }

  /**
   * Update 3D scene with new morphing progress
   */
  updateMorphing(progress: number, targetSVG?: SVGData): void {
    if (!this.scene || !this.scene.mesh) return;

    // Update mesh geometry based on morphing progress
    this.updateMeshGeometry(this.scene.mesh, progress, targetSVG);
  }

  /**
   * Update 3D scene options
   */
  updateOptions(options: Partial<ThreeDMorphingOptions>): void {
    if (!this.scene) return;

    const opts = { ...this.defaultOptions, ...options };

    // Update camera
    if (options.perspective) {
      this.scene.camera.position.z = opts.perspective / 10;
    }

    // Update material
    if (options.material && this.scene.mesh.material) {
      const material = this.scene.mesh.material;
      if (options.material.color) material.color.setHex(options.material.color.replace('#', '0x'));
      if (options.material.metalness !== undefined) material.metalness = options.material.metalness;
      if (options.material.roughness !== undefined) material.roughness = options.material.roughness;
      if (options.material.opacity !== undefined) material.opacity = options.material.opacity;
    }

    // Update controls
    if (options.animation && this.scene.controls) {
      this.scene.controls.autoRotate = opts.animation.autoRotate;
      this.scene.controls.autoRotateSpeed = opts.animation.rotationSpeed * 100;
    }

    // Update lighting
    if (options.lighting) {
      this.updateLighting(opts);
    }
  }

  /**
   * Resize 3D scene
   */
  resize(width: number, height: number): void {
    if (!this.scene) return;

    this.scene.camera.aspect = width / height;
    this.scene.camera.updateProjectionMatrix();
    this.scene.renderer.setSize(width, height);
  }

  /**
   * Dispose of 3D scene resources
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.scene) {
      // Dispose of geometries and materials
      this.scene.scene.traverse((object: any) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material: any) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      // Remove renderer from DOM
      if (this.scene.renderer.domElement.parentNode) {
        this.scene.renderer.domElement.parentNode.removeChild(this.scene.renderer.domElement);
      }

      this.scene.renderer.dispose();
      this.scene = null;
    }
  }

  /**
   * Export 3D scene as image
   */
  exportImage(format: 'png' | 'jpg' = 'png', quality: number = 1.0): string {
    if (!this.scene) throw new Error('No 3D scene available');

    return this.scene.renderer.domElement.toDataURL(`image/${format}`, quality);
  }

  /**
   * Private helper methods
   */
  private setupLighting(scene: any, options: ThreeDMorphingOptions): void {
    const { THREE } = this;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, options.lighting.ambient);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, options.lighting.directional);
    directionalLight.position.set(
      options.lighting.position.x,
      options.lighting.position.y,
      options.lighting.position.z
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point light for additional illumination
    const pointLight = new THREE.PointLight(0xffffff, 0.3, 100);
    pointLight.position.set(-10, -10, 10);
    scene.add(pointLight);
  }

  private updateLighting(options: ThreeDMorphingOptions): void {
    if (!this.scene) return;

    const lights = this.scene.scene.children.filter((child: any) => 
      child.type === 'AmbientLight' || child.type === 'DirectionalLight'
    );

    lights.forEach((light: any) => {
      if (light.type === 'AmbientLight') {
        light.intensity = options.lighting.ambient;
      } else if (light.type === 'DirectionalLight') {
        light.intensity = options.lighting.directional;
        light.position.set(
          options.lighting.position.x,
          options.lighting.position.y,
          options.lighting.position.z
        );
      }
    });
  }

  private async createSVGMesh(
    sourceSVG: SVGData,
    targetSVG: SVGData,
    options: ThreeDMorphingOptions
  ): Promise<any> {
    const { THREE } = this;

    // Convert SVG paths to 3D geometry
    const geometry = await this.svgToGeometry(sourceSVG, options);

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: options.material.color,
      metalness: options.material.metalness,
      roughness: options.material.roughness,
      opacity: options.material.opacity,
      transparent: options.material.opacity < 1,
      side: THREE.DoubleSide
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Store target geometry for morphing
    mesh.userData.targetGeometry = await this.svgToGeometry(targetSVG, options);
    mesh.userData.sourceGeometry = geometry.clone();

    return mesh;
  }

  private async svgToGeometry(svgData: SVGData, options: ThreeDMorphingOptions): Promise<any> {
    const { THREE } = this;

    // Create shape from SVG path
    const shape = this.pathToShape(svgData.paths[0]?.d || '');
    
    // Extrude the shape to create 3D geometry
    const extrudeSettings = {
      depth: options.depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 1,
      bevelThickness: 1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }

  private pathToShape(pathD: string): any {
    const { THREE } = this;
    const shape = new THREE.Shape();

    // Parse SVG path commands and convert to Three.js shape
    const commands = this.parseSVGPath(pathD);
    
    commands.forEach((command, index) => {
      switch (command.type) {
        case 'M':
          shape.moveTo(command.x, -command.y); // Flip Y for Three.js coordinate system
          break;
        case 'L':
          shape.lineTo(command.x, -command.y);
          break;
        case 'C':
          shape.bezierCurveTo(
            command.x1, -command.y1,
            command.x2, -command.y2,
            command.x, -command.y
          );
          break;
        case 'Q':
          shape.quadraticCurveTo(
            command.x1, -command.y1,
            command.x, -command.y
          );
          break;
        case 'Z':
          shape.closePath();
          break;
      }
    });

    return shape;
  }

  private parseSVGPath(pathD: string): any[] {
    const commands: any[] = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])[^MmLlHhVvCcSsQqTtAaZz]*/g;
    let match;

    while ((match = regex.exec(pathD)) !== null) {
      const command = match[0];
      const type = command[0].toUpperCase();
      const params = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

      switch (type) {
        case 'M':
        case 'L':
          commands.push({ type, x: params[0] || 0, y: params[1] || 0 });
          break;
        case 'C':
          commands.push({
            type,
            x1: params[0] || 0, y1: params[1] || 0,
            x2: params[2] || 0, y2: params[3] || 0,
            x: params[4] || 0, y: params[5] || 0
          });
          break;
        case 'Q':
          commands.push({
            type,
            x1: params[0] || 0, y1: params[1] || 0,
            x: params[2] || 0, y: params[3] || 0
          });
          break;
        case 'Z':
          commands.push({ type });
          break;
      }
    }

    return commands;
  }

  private updateMeshGeometry(mesh: any, progress: number, targetSVG?: SVGData): void {
    if (!mesh.userData.sourceGeometry || !mesh.userData.targetGeometry) return;

    const sourcePositions = mesh.userData.sourceGeometry.attributes.position.array;
    const targetPositions = mesh.userData.targetGeometry.attributes.position.array;
    const currentPositions = mesh.geometry.attributes.position.array;

    // Interpolate between source and target positions
    for (let i = 0; i < sourcePositions.length; i++) {
      currentPositions[i] = sourcePositions[i] + (targetPositions[i] - sourcePositions[i]) * progress;
    }

    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  private startAnimation(): void {
    if (!this.scene) return;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Update controls
      this.scene!.controls.update();

      // Render scene
      this.scene!.renderer.render(this.scene!.scene, this.scene!.camera);
    };

    animate();
  }
}

// Export singleton instance
export const threeDMorphing = new ThreeDMorphingEngine();
