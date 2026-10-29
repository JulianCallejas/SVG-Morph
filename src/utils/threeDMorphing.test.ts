import { describe, expect, it, vi } from 'vitest';
import { ThreeDMorphingEngine } from './threeDMorphing';

// The engine keeps its scene in a private field; a test hands it a stand-in instead of a WebGL context.
const withScene = (engine: ThreeDMorphingEngine, scene: unknown) => {
  (engine as unknown as { scene: unknown }).scene = scene;
};

describe('exportImage', () => {
  it('draws a frame right before reading the canvas, which the browser clears after showing one', () => {
    const calls: string[] = [];
    const renderer = {
      render: vi.fn(() => calls.push('render')),
      domElement: { toDataURL: vi.fn(() => (calls.push('read'), 'data:image/png;base64,AAAA')) },
    };
    const engine = new ThreeDMorphingEngine();
    withScene(engine, { renderer, scene: { id: 'scene' }, camera: { id: 'camera' } });

    const image = engine.exportImage('png', 1);

    expect(image).toBe('data:image/png;base64,AAAA');
    expect(calls).toEqual(['render', 'read']);
    expect(renderer.render).toHaveBeenCalledWith({ id: 'scene' }, { id: 'camera' });
    expect(renderer.domElement.toDataURL).toHaveBeenCalledWith('image/png', 1);
  });

  it('says so when there is no scene', () => {
    expect(() => new ThreeDMorphingEngine().exportImage()).toThrow(/no 3D scene/i);
  });
});

describe('moving the parts', () => {
  it('uploads the index again after every frame, because a solid rewrites it', () => {
    const index = { needsUpdate: false };
    const mesh = {
      geometry: {
        attributes: { position: { needsUpdate: false }, normal: { array: new Float32Array(3), needsUpdate: false } },
        index,
        computeVertexNormals: vi.fn(),
      },
      position: { set: vi.fn() },
      material: { opacity: 1, transparent: false },
      visible: true,
    };
    const part = { geometry: { fill: vi.fn() }, visibility: () => 1 };
    const group = { userData: { live: [{ part, mesh, positions: new Float32Array(3) }], baseOpacity: 1 } };

    (new ThreeDMorphingEngine() as unknown as { applyProgress: (g: unknown, p: number) => void }).applyProgress(group, 0.7);

    expect(part.geometry.fill).toHaveBeenCalledWith(0.7, expect.any(Float32Array));
    expect(index.needsUpdate).toBe(true);
    expect(mesh.geometry.attributes.position.needsUpdate).toBe(true);
  });
});
