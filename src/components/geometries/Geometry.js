// Geometry.js

import { generatePlatonicSolid } from './PlatonicSolids';
import { generateArchimedeanSolid } from './ArchimedeanSolids';

export class Geometry {
  constructor(vertices, edges, faces) {
    this.vertices = this.validateVertices(vertices);
    this.edges = this.validateEdges(edges);
    this.faces = this.validateFaces(faces);
    
    // Cache computed properties
    this._boundingBox = null;
    this._vertexNormals = null;
  }
  
  validateVertices(vertices) {
    return vertices.map(v => {
      if (!Array.isArray(v) || v.length !== 3) {
        throw new Error('Vertices must be 3D points');
      }
      return v.map(coord => Number(coord));
    });
  }
  
  validateEdges(edges) {
    return edges.filter(edge => {
      if (!Array.isArray(edge) || edge.length !== 2) {
        return false;
      }
      const [a, b] = edge;
      return a >= 0 && a < this.vertices.length && 
             b >= 0 && b < this.vertices.length;
    });
  }
  
  validateFaces(faces) {
    return faces.map(face => {
      if (!Array.isArray(face) || face.length < 3) {
        throw new Error('Faces must have at least 3 vertices');
      }
      return face.map(idx => {
        if (idx < 0 || idx >= this.vertices.length) {
          throw new Error('Face references invalid vertex');
        }
        return idx;
      });
    });
  }
  
  computeBoundingBox() {
    if (this.vertices.length === 0) {
      return { min: [0, 0, 0], max: [0, 0, 0] };
    }
    
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    this.vertices.forEach(vertex => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], vertex[i]);
        max[i] = Math.max(max[i], vertex[i]);
      }
    });
    
    return { min, max };
  }
  
  get boundingBox() {
    if (!this._boundingBox) {
      this._boundingBox = this.computeBoundingBox();
    }
    return this._boundingBox;
  }
}


export function generateGeometry(type, complexity) {
  switch (type) {
    case 'Platonic Solids':
      return generatePlatonicSolid(complexity);
    case 'Archimedean Solids':
      return generateArchimedeanSolid(type);
    // More types can be added here in the future
    default:
      throw new Error(`Unknown geometry type: ${type}`);
  }
}

// Utility function to extract edges from faces
export function extractEdges(faces) {
  const edges = new Set();
  faces.forEach((face) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      edges.add([Math.min(a, b), Math.max(a, b)].toString());
    }
  });
  return Array.from(edges).map((e) => e.split(',').map(Number));
}

// Future iterations will add more types and improve modularity