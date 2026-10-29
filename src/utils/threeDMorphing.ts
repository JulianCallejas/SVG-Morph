import { SVGData } from '../workers/pathProcessor';
import type { ContourPlanEntry } from './contourPairing';
import { planContours } from './contourSvg';
// type only: the module itself (and three.js) is loaded lazily when a scene is created
import type { ScenePart } from './threeDContours';

interface LivePart {
  part: ScenePart;
  mesh: any; // THREE.Mesh
  positions: Float32Array;
}

// Defaults for the 3D scene in the brand palette. three.js needs literal values, so they live here once:
// the material is sun-400 and the scene background is the canvas token (ash-900).
export const DEFAULT_MATERIAL_COLOR = '#ffde3a';
const SCENE_BACKGROUND = 0x141414;

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
  /** Per-contour plan (morph / swap / static). Absent means a suggested plan. */
  contourPlan?: ContourPlanEntry[];
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
  private progress = 0;

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
      color: DEFAULT_MATERIAL_COLOR,
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
      const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

      this.THREE = {
        ...THREE,
        OrbitControls,
        mergeGeometries
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
    scene.background = new THREE.Color(SCENE_BACKGROUND);

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
  updateMorphing(progress: number, _targetSVG?: SVGData): void {
    if (!this.scene || !this.scene.mesh) return;

    // Move every contour to its shape at this progress
    this.progress = progress;
    this.applyProgress(this.scene.mesh, progress);
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

    // Update the material of every contour
    if (options.material) {
      const group = this.scene.mesh;
      for (const { mesh } of group.userData.live as LivePart[]) {
        const material = mesh.material;
        if (options.material.color) material.color.setHex(options.material.color.replace('#', '0x'));
        if (options.material.metalness !== undefined) material.metalness = options.material.metalness;
        if (options.material.roughness !== undefined) material.roughness = options.material.roughness;
      }
      if (options.material.opacity !== undefined) {
        group.userData.baseOpacity = options.material.opacity;
        // opacity also carries each contour's swap/fade visibility, so reapply the current frame
        this.applyProgress(group, this.progress);
      }
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

    // The canvas is cleared once the browser has shown a frame, so draw one right before reading it
    // back: without this the image comes out empty.
    const { renderer, scene, camera } = this.scene;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL(`image/${format}`, quality);
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
    // No cast shadows: the drawing floats on a plain background with nothing to receive them. The
    // shadow camera is only 10 units wide by default and the scene is about 100 (see
    // threeDContours.ts), so with shadows on just the middle of the drawing shaded itself.
    directionalLight.castShadow = false;
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

    // One part per contour (tubes for strokes, solids for fills). The geometry module is loaded
    // here, together with three.js, so it stays out of the main bundle.
    const { buildContourScene } = await import('./threeDContours');
    const plan = options.contourPlan ?? planContours(sourceSVG, targetSVG)?.plan;
    if (!plan) {
      throw new Error('The SVG paths could not be split into contours for the 3D view');
    }
    const contourScene = buildContourScene(sourceSVG, targetSVG, plan, { depth: options.depth });

    const group = new THREE.Group();
    const live: LivePart[] = contourScene.parts.map((part: ScenePart) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(part.geometry.vertexCount * 3);
      part.geometry.fill(0, positions);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(part.geometry.index, 1));
      geometry.computeVertexNormals();
      part.geometry.fixNormals?.(geometry.attributes.normal.array);

      const material = new THREE.MeshStandardMaterial({
        color: options.material.color,
        metalness: options.material.metalness,
        roughness: options.material.roughness,
        opacity: options.material.opacity,
        transparent: options.material.opacity < 1,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // vertices move during the morph, so the initial bounding sphere would cull them wrongly
      mesh.frustumCulled = false;
      group.add(mesh);

      return { part, mesh, positions };
    });

    group.userData.live = live;
    group.userData.baseOpacity = options.material.opacity;
    group.userData.exportMesh = () => this.exportableMesh(live);
    this.applyProgress(group, 0);

    return group;
  }

  // Moves every part to its shape at this progress and shows or hides it (swap and fade).
  private applyProgress(group: any, progress: number): void {
    const baseOpacity: number = group.userData.baseOpacity ?? 1;
    for (const { part, mesh, positions } of group.userData.live as LivePart[]) {
      part.geometry.fill(progress, positions);
      mesh.geometry.attributes.position.needsUpdate = true;
      // a solid re-triangulates its caps for the shape it has reached
      if (mesh.geometry.index) mesh.geometry.index.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      if (part.geometry.fixNormals) {
        part.geometry.fixNormals(mesh.geometry.attributes.normal.array);
        mesh.geometry.attributes.normal.needsUpdate = true;
      }

      // a contour that slides is moved as a whole, not rebuilt
      const offset = part.offset?.(progress);
      mesh.position.set(offset?.x ?? 0, offset?.y ?? 0, 0);

      const visibility = part.visibility(progress);
      mesh.visible = visibility > 0;
      mesh.material.opacity = baseOpacity * visibility;
      mesh.material.transparent = mesh.material.opacity < 1;
    }
  }

  // What the exporter needs: one geometry made of the parts that are visible right now.
  private exportableMesh(live: LivePart[]): { geometry: any; material: any } | null {
    const visible = live.filter(({ mesh }) => mesh.visible);
    if (visible.length === 0) return null;

    // the clones carry the position a sliding contour has right now
    const geometry = this.THREE.mergeGeometries(
      visible.map(({ mesh }) => mesh.geometry.clone().translate(mesh.position.x, mesh.position.y, 0)),
      false,
    );
    return geometry ? { geometry, material: visible[0].mesh.material } : null;
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
