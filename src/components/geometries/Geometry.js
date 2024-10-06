// Geometry.js

export class Geometry {
  constructor(vertices, edges, faces) {
    this.vertices = vertices;
    this.edges = edges;
    this.faces = faces;
  }
}

// Essential geometry generation functions for early end-to-end demonstration

import { generatePlatonicSolid } from './PlatonicSolids';
import { generateArchimedeanSolid } from './ArchimedeanSolids';

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
function extractEdges(faces) {
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