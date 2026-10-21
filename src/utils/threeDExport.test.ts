import { BufferAttribute, BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { ThreeDExporter, type ThreeDExportOptions } from './threeDExport';
import type { ThreeDScene } from './threeDMorphing';

const options = (overrides: Partial<ThreeDExportOptions> = {}): ThreeDExportOptions => ({
  format: 'obj',
  quality: 'high',
  includeTextures: false,
  includeNormals: true,
  scale: 1,
  centerModel: true,
  ...overrides,
});

// a unit triangle far from the origin
const triangle = (offset: number): BufferGeometry => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([offset, offset, 0, offset + 2, offset, 0, offset, offset + 2, 0]), 3),
  );
  return geometry;
};

const sceneWith = (mesh: unknown): ThreeDScene => ({ mesh }) as unknown as ThreeDScene;

const objVertices = (data: string | ArrayBuffer): number[][] =>
  String(data)
    .split('\n')
    .filter((line) => line.startsWith('v '))
    .map((line) => line.split(' ').slice(1).map(Number));

describe('ThreeDExporter', () => {
  it('centers the model on the origin', async () => {
    const exporter = new ThreeDExporter();
    exporter.setScene(sceneWith({ geometry: triangle(100), material: null }));

    const result = await exporter.export3DModel(options());

    const vertices = objVertices(result.data);
    const xs = vertices.map((v) => v[0]);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 5);
  });

  it('leaves the model where it is when centering is off', async () => {
    const exporter = new ThreeDExporter();
    exporter.setScene(sceneWith({ geometry: triangle(100), material: null }));

    const result = await exporter.export3DModel(options({ centerModel: false }));

    expect(Math.min(...objVertices(result.data).map((v) => v[0]))).toBe(100);
  });

  it('exports every format without failing', async () => {
    const exporter = new ThreeDExporter();
    exporter.setScene(sceneWith({ geometry: triangle(5), material: null }));

    for (const format of ['obj', 'stl', 'ply', 'gltf'] as const) {
      await expect(exporter.export3DModel(options({ format }))).resolves.toBeDefined();
    }
  });

  it('exports the merged mesh of a scene made of several contours', async () => {
    const exporter = new ThreeDExporter();
    // a scene with several parts offers one merged mesh of what is visible right now
    exporter.setScene(
      sceneWith({ userData: { exportMesh: () => ({ geometry: triangle(10), material: null }) } }),
    );

    const result = await exporter.export3DModel(options({ centerModel: false }));

    expect(objVertices(result.data)).toHaveLength(3);
  });

  it('says so when nothing is visible to export', async () => {
    const exporter = new ThreeDExporter();
    exporter.setScene(sceneWith({ userData: { exportMesh: () => null } }));

    await expect(exporter.export3DModel(options())).rejects.toThrow(/No mesh geometry/);
  });
});
