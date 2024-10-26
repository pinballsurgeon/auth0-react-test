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
    // Ensure vertices are properly formatted and normalized
    return vertices.map(v => {
      if (v.length !== 3) throw new Error('Vertices must be 3D points');
      return v.map(coord => Number(coord));
    });
  }
  
  validateEdges(edges) {
    // Validate edge indices and ensure they reference valid vertices
    return edges.filter(edge => {
      return edge.length === 2 &&
             edge[0] >= 0 && edge[0] < this.vertices.length &&
             edge[1] >= 0 && edge[1] < this.vertices.length;
    });
  }
  
  validateFaces(faces) {
    // Validate face indices and ensure proper winding order
    return faces.map(face => {
      if (face.length < 3) throw new Error('Faces must have at least 3 vertices');
      return this.ensureProperWinding(face);
    });
  }
  
  // Lazy-loaded computed properties
  get boundingBox() {
    if (!this._boundingBox) {
      this._boundingBox = this.computeBoundingBox();
    }
    return this._boundingBox;
  }
  
  get vertexNormals() {
    if (!this._vertexNormals) {
      this._vertexNormals = this.computeVertexNormals();
    }
    return this._vertexNormals;
  }
  
  // Method to support smooth transitions between complexities
  interpolateToward(otherGeometry, t) {
    return interpolateGeometries(this, otherGeometry, t);
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