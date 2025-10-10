import { ThreeDScene } from './threeDMorphing';

export interface ThreeDExportOptions {
  format: 'obj' | 'stl' | 'ply' | 'gltf';
  quality: 'low' | 'medium' | 'high';
  includeTextures: boolean;
  includeNormals: boolean;
  scale: number;
  centerModel: boolean;
}

export interface ExportResult {
  filename: string;
  data: string | ArrayBuffer;
  mimeType: string;
  size: number;
}

export class ThreeDExporter {
  private scene: ThreeDScene | null = null;

  setScene(scene: ThreeDScene): void {
    this.scene = scene;
  }

  /**
   * Export 3D model in specified format
   */
  async export3DModel(options: ThreeDExportOptions): Promise<ExportResult> {
    if (!this.scene) {
      throw new Error('No 3D scene available for export');
    }

    const mesh = this.scene.mesh;
    if (!mesh || !mesh.geometry) {
      throw new Error('No mesh geometry available for export');
    }

    // Prepare geometry for export
    const geometry = this.prepareGeometry(mesh.geometry, options);

    switch (options.format) {
      case 'obj':
        return this.exportOBJ(geometry, mesh, options);
      case 'stl':
        return this.exportSTL(geometry, options);
      case 'ply':
        return this.exportPLY(geometry, mesh, options);
      case 'gltf':
        return this.exportGLTF(geometry, mesh, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Prepare geometry for export (scaling, centering, etc.)
   */
  private prepareGeometry(geometry: any, options: ThreeDExportOptions): any {
    const preparedGeometry = geometry.clone();

    // Apply scaling
    if (options.scale !== 1) {
      preparedGeometry.scale(options.scale, options.scale, options.scale);
    }

    // Center the model
    if (options.centerModel) {
      preparedGeometry.computeBoundingBox();
      const center = preparedGeometry.boundingBox.getCenter(new (geometry.constructor.Vector3 || Object)());
      preparedGeometry.translate(-center.x, -center.y, -center.z);
    }

    // Compute normals if needed
    if (options.includeNormals && !preparedGeometry.attributes.normal) {
      preparedGeometry.computeVertexNormals();
    }

    return preparedGeometry;
  }

  /**
   * Export as OBJ format (Wavefront OBJ)
   * Compatible with: Paint 3D, Blender, 3ds Max, Maya, etc.
   */
  private exportOBJ(geometry: any, mesh: any, options: ThreeDExportOptions): ExportResult {
    const vertices = geometry.attributes.position.array;
    const normals = options.includeNormals ? geometry.attributes.normal?.array : null;
    const uvs = geometry.attributes.uv?.array;
    const indices = geometry.index ? geometry.index.array : null;

    let objContent = '# SVG-Morph 3D Export\n';
    objContent += '# Format: Wavefront OBJ\n';
    objContent += `# Exported: ${new Date().toISOString()}\n\n`;

    // Material file reference
    if (options.includeTextures && mesh.material) {
      objContent += 'mtllib morph.mtl\n';
      objContent += 'usemtl material0\n\n';
    }

    // Write vertices
    for (let i = 0; i < vertices.length; i += 3) {
      objContent += `v ${vertices[i].toFixed(6)} ${vertices[i + 1].toFixed(6)} ${vertices[i + 2].toFixed(6)}\n`;
    }

    // Write texture coordinates
    if (uvs) {
      objContent += '\n';
      for (let i = 0; i < uvs.length; i += 2) {
        objContent += `vt ${uvs[i].toFixed(6)} ${uvs[i + 1].toFixed(6)}\n`;
      }
    }

    // Write normals
    if (normals) {
      objContent += '\n';
      for (let i = 0; i < normals.length; i += 3) {
        objContent += `vn ${normals[i].toFixed(6)} ${normals[i + 1].toFixed(6)} ${normals[i + 2].toFixed(6)}\n`;
      }
    }

    // Write faces
    objContent += '\n';
    if (indices) {
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i] + 1;
        const v2 = indices[i + 1] + 1;
        const v3 = indices[i + 2] + 1;
        
        if (uvs && normals) {
          objContent += `f ${v1}/${v1}/${v1} ${v2}/${v2}/${v2} ${v3}/${v3}/${v3}\n`;
        } else if (normals) {
          objContent += `f ${v1}//${v1} ${v2}//${v2} ${v3}//${v3}\n`;
        } else if (uvs) {
          objContent += `f ${v1}/${v1} ${v2}/${v2} ${v3}/${v3}\n`;
        } else {
          objContent += `f ${v1} ${v2} ${v3}\n`;
        }
      }
    } else {
      // No indices, assume triangles
      for (let i = 0; i < vertices.length / 3; i += 3) {
        const v1 = i + 1;
        const v2 = i + 2;
        const v3 = i + 3;
        objContent += `f ${v1} ${v2} ${v3}\n`;
      }
    }

    return {
      filename: 'morph-3d.obj',
      data: objContent,
      mimeType: 'text/plain',
      size: objContent.length
    };
  }

  /**
   * Export as STL format (Stereolithography)
   * Compatible with: Paint 3D, 3D printing software, CAD programs
   */
  private exportSTL(geometry: any, options: ThreeDExportOptions): ExportResult {
    const vertices = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    const indices = geometry.index ? geometry.index.array : null;

    // STL Binary format
    const triangleCount = indices ? indices.length / 3 : vertices.length / 9;
    const bufferSize = 80 + 4 + (triangleCount * 50); // Header + count + triangles
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Write STL header (80 bytes)
    const header = 'SVG-Morph 3D Export';
    for (let i = 0; i < Math.min(header.length, 80); i++) {
      view.setUint8(i, header.charCodeAt(i));
    }

    // Write triangle count
    view.setUint32(80, triangleCount, true);

    let offset = 84;

    if (indices) {
      // With indices
      for (let i = 0; i < indices.length; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;

        // Calculate normal if not provided
        let nx = 0, ny = 0, nz = 1;
        if (normals) {
          nx = normals[indices[i] * 3];
          ny = normals[indices[i] * 3 + 1];
          nz = normals[indices[i] * 3 + 2];
        }

        // Write normal
        view.setFloat32(offset, nx, true); offset += 4;
        view.setFloat32(offset, ny, true); offset += 4;
        view.setFloat32(offset, nz, true); offset += 4;

        // Write vertices
        view.setFloat32(offset, vertices[i1], true); offset += 4;
        view.setFloat32(offset, vertices[i1 + 1], true); offset += 4;
        view.setFloat32(offset, vertices[i1 + 2], true); offset += 4;

        view.setFloat32(offset, vertices[i2], true); offset += 4;
        view.setFloat32(offset, vertices[i2 + 1], true); offset += 4;
        view.setFloat32(offset, vertices[i2 + 2], true); offset += 4;

        view.setFloat32(offset, vertices[i3], true); offset += 4;
        view.setFloat32(offset, vertices[i3 + 1], true); offset += 4;
        view.setFloat32(offset, vertices[i3 + 2], true); offset += 4;

        // Attribute byte count (unused)
        view.setUint16(offset, 0, true); offset += 2;
      }
    } else {
      // Without indices
      for (let i = 0; i < vertices.length; i += 9) {
        // Calculate normal
        let nx = 0, ny = 0, nz = 1;
        if (normals) {
          nx = normals[i];
          ny = normals[i + 1];
          nz = normals[i + 2];
        }

        // Write normal
        view.setFloat32(offset, nx, true); offset += 4;
        view.setFloat32(offset, ny, true); offset += 4;
        view.setFloat32(offset, nz, true); offset += 4;

        // Write triangle vertices
        for (let j = 0; j < 9; j++) {
          view.setFloat32(offset, vertices[i + j], true);
          offset += 4;
        }

        // Attribute byte count
        view.setUint16(offset, 0, true); offset += 2;
      }
    }

    return {
      filename: 'morph-3d.stl',
      data: buffer,
      mimeType: 'application/octet-stream',
      size: buffer.byteLength
    };
  }

  /**
   * Export as PLY format (Polygon File Format)
   * Compatible with: Research software, MeshLab, CloudCompare
   */
  private exportPLY(geometry: any, mesh: any, options: ThreeDExportOptions): ExportResult {
    const vertices = geometry.attributes.position.array;
    const normals = options.includeNormals ? geometry.attributes.normal?.array : null;
    const indices = geometry.index ? geometry.index.array : null;

    const vertexCount = vertices.length / 3;
    const faceCount = indices ? indices.length / 3 : vertexCount / 3;

    let plyContent = 'ply\n';
    plyContent += 'format ascii 1.0\n';
    plyContent += `comment SVG-Morph 3D Export - ${new Date().toISOString()}\n`;
    plyContent += `element vertex ${vertexCount}\n`;
    plyContent += 'property float x\n';
    plyContent += 'property float y\n';
    plyContent += 'property float z\n';

    if (normals) {
      plyContent += 'property float nx\n';
      plyContent += 'property float ny\n';
      plyContent += 'property float nz\n';
    }

    // Add color if material has color
    if (mesh.material && mesh.material.color) {
      plyContent += 'property uchar red\n';
      plyContent += 'property uchar green\n';
      plyContent += 'property uchar blue\n';
    }

    plyContent += `element face ${faceCount}\n`;
    plyContent += 'property list uchar int vertex_indices\n';
    plyContent += 'end_header\n';

    // Write vertices
    for (let i = 0; i < vertices.length; i += 3) {
      plyContent += `${vertices[i].toFixed(6)} ${vertices[i + 1].toFixed(6)} ${vertices[i + 2].toFixed(6)}`;
      
      if (normals) {
        plyContent += ` ${normals[i].toFixed(6)} ${normals[i + 1].toFixed(6)} ${normals[i + 2].toFixed(6)}`;
      }

      if (mesh.material && mesh.material.color) {
        const color = mesh.material.color;
        const r = Math.floor(((color >> 16) & 255));
        const g = Math.floor(((color >> 8) & 255));
        const b = Math.floor((color & 255));
        plyContent += ` ${r} ${g} ${b}`;
      }

      plyContent += '\n';
    }

    // Write faces
    if (indices) {
      for (let i = 0; i < indices.length; i += 3) {
        plyContent += `3 ${indices[i]} ${indices[i + 1]} ${indices[i + 2]}\n`;
      }
    } else {
      for (let i = 0; i < vertexCount; i += 3) {
        plyContent += `3 ${i} ${i + 1} ${i + 2}\n`;
      }
    }

    return {
      filename: 'morph-3d.ply',
      data: plyContent,
      mimeType: 'text/plain',
      size: plyContent.length
    };
  }

  /**
   * Export as GLTF format (GL Transmission Format)
   * Compatible with: Web applications, Three.js, modern 3D software
   */
  private exportGLTF(geometry: any, mesh: any, options: ThreeDExportOptions): ExportResult {
    const vertices = geometry.attributes.position.array;
    const normals = geometry.attributes.normal?.array;
    const uvs = geometry.attributes.uv?.array;
    const indices = geometry.index ? geometry.index.array : null;

    // Create GLTF structure
    const gltf = {
      asset: {
        version: '2.0',
        generator: 'SVG-Morph 3D Exporter'
      },
      scene: 0,
      scenes: [
        {
          nodes: [0]
        }
      ],
      nodes: [
        {
          mesh: 0
        }
      ],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0
              },
              material: 0
            }
          ]
        }
      ],
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorFactor: [1.0, 1.0, 1.0, 1.0],
            metallicFactor: mesh.material?.metalness || 0.0,
            roughnessFactor: mesh.material?.roughness || 1.0
          }
        }
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126, // FLOAT
          count: vertices.length / 3,
          type: 'VEC3',
          max: [0, 0, 0],
          min: [0, 0, 0]
        }
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: vertices.length * 4
        }
      ],
      buffers: [
        {
          byteLength: vertices.length * 4
        }
      ]
    };

    // Calculate bounds
    for (let i = 0; i < vertices.length; i += 3) {
      gltf.accessors[0].max[0] = Math.max(gltf.accessors[0].max[0], vertices[i]);
      gltf.accessors[0].max[1] = Math.max(gltf.accessors[0].max[1], vertices[i + 1]);
      gltf.accessors[0].max[2] = Math.max(gltf.accessors[0].max[2], vertices[i + 2]);
      gltf.accessors[0].min[0] = Math.min(gltf.accessors[0].min[0], vertices[i]);
      gltf.accessors[0].min[1] = Math.min(gltf.accessors[0].min[1], vertices[i + 1]);
      gltf.accessors[0].min[2] = Math.min(gltf.accessors[0].min[2], vertices[i + 2]);
    }

    // Add normals if available
    if (normals) {
      gltf.meshes[0].primitives[0].attributes.NORMAL = 1;
      gltf.accessors.push({
        bufferView: 1,
        componentType: 5126,
        count: normals.length / 3,
        type: 'VEC3'
      });
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: vertices.length * 4,
        byteLength: normals.length * 4
      });
      gltf.buffers[0].byteLength += normals.length * 4;
    }

    // Add indices if available
    if (indices) {
      gltf.meshes[0].primitives[0].indices = gltf.accessors.length;
      gltf.accessors.push({
        bufferView: gltf.bufferViews.length,
        componentType: 5123, // UNSIGNED_SHORT
        count: indices.length,
        type: 'SCALAR'
      });
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: gltf.buffers[0].byteLength,
        byteLength: indices.length * 2
      });
      gltf.buffers[0].byteLength += indices.length * 2;
    }

    // Create binary buffer
    const buffer = new ArrayBuffer(gltf.buffers[0].byteLength);
    const view = new DataView(buffer);
    let offset = 0;

    // Write vertices
    for (let i = 0; i < vertices.length; i++) {
      view.setFloat32(offset, vertices[i], true);
      offset += 4;
    }

    // Write normals
    if (normals) {
      for (let i = 0; i < normals.length; i++) {
        view.setFloat32(offset, normals[i], true);
        offset += 4;
      }
    }

    // Write indices
    if (indices) {
      for (let i = 0; i < indices.length; i++) {
        view.setUint16(offset, indices[i], true);
        offset += 2;
      }
    }

    // Encode buffer as base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    gltf.buffers[0] = {
      byteLength: buffer.byteLength,
      uri: `data:application/octet-stream;base64,${base64}`
    };

    return {
      filename: 'morph-3d.gltf',
      data: JSON.stringify(gltf, null, 2),
      mimeType: 'application/json',
      size: JSON.stringify(gltf).length
    };
  }
}

// Export singleton instance
export const threeDExporter = new ThreeDExporter();
