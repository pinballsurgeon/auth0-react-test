// ArchimedeanSolids.js
import { Geometry } from './Geometry';

export function generateArchimedeanSolid(parameters = {}) {
  const { type = 'Truncated Cube' } = parameters;
  
  switch (type) {
    case 'Truncated Cube':
      return generateTruncatedCube();
    case 'Cuboctahedron':
      return generateCuboctahedron();
    case 'Truncated Octahedron':
      return generateTruncatedOctahedron();
    case 'Truncated Tetrahedron':
      return generateTruncatedTetrahedron();
    case 'Icosidodecahedron':
      return generateIcosidodecahedron();
    default:
      console.warn(`Unknown Archimedean Solid type: ${type}, falling back to Truncated Cube`);
      return generateTruncatedCube();
  }
}

function generateTruncatedTetrahedron() {
  // A tetrahedron with corners cut off, resulting in triangular and hexagonal faces
  const t = 1/3; // truncation factor
  const vertices = [
    // Original vertices truncated
    [1-t, 1-t, 1-t], [-1+t, -1+t, 1-t], [-1+t, 1-t, -1+t], [1-t, -1+t, -1+t],
    // Truncation vertices
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ].map(v => v.map(coord => coord * 0.5)); // Scale to match other solids

  const faces = [
    // 4 hexagonal faces (truncated vertices)
    [0, 4, 5, 2, 8, 6],
    [1, 6, 8, 3, 10, 7],
    [2, 5, 7, 3, 9, 8],
    [0, 6, 7, 1, 4, 5],
    // 4 triangular faces (original faces)
    [0, 1, 2],
    [1, 2, 3],
    [0, 2, 3],
    [0, 1, 3]
  ];

  const edges = extractEdgesFromFaces(faces);
  return new Geometry(vertices, edges, faces);
}

function generateCuboctahedron() {
  // Vertices are the midpoints of the edges of a cube
  const vertices = [
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],  // middle points of vertical edges
    [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],  // middle points of horizontal edges
    [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]   // middle points of depth edges
  ].map(v => v.map(coord => coord * 0.5));

  const faces = [
    // 8 triangular faces
    [0, 4, 8], [2, 4, 9], [1, 6, 8], [3, 6, 9],
    [0, 5, 10], [2, 5, 11], [1, 7, 10], [3, 7, 11],
    // 6 square faces
    [0, 1, 8, 10], [2, 3, 9, 11],
    [0, 2, 4, 5], [1, 3, 6, 7],
    [4, 6, 8, 9], [5, 7, 10, 11]
  ];

  const edges = extractEdgesFromFaces(faces);
  return new Geometry(vertices, edges, faces);
}

function generateTruncatedCube() {
  // More precise truncated cube implementation
  const t = 0.3; // truncation factor
  const vertices = [
    // Front face truncated corners
    [-1+t, -1+t, 1], [1-t, -1+t, 1], [1-t, 1-t, 1], [-1+t, 1-t, 1],
    // Back face truncated corners
    [-1+t, -1+t, -1], [1-t, -1+t, -1], [1-t, 1-t, -1], [-1+t, 1-t, -1],
    // Additional vertices from truncation
    [-1, -1+t, 1-t], [1, -1+t, 1-t], [1, 1-t, 1-t], [-1, 1-t, 1-t],
    [-1, -1+t, -1+t], [1, -1+t, -1+t], [1, 1-t, -1+t], [-1, 1-t, -1+t]
  ];

  const faces = [
    // 6 octagonal faces (original cube faces truncated)
    [0, 1, 2, 3, 8, 9, 10, 11],
    [4, 5, 6, 7, 12, 13, 14, 15],
    [0, 1, 5, 4, 8, 9, 13, 12],
    [2, 3, 7, 6, 10, 11, 15, 14],
    [0, 3, 7, 4, 8, 11, 15, 12],
    [1, 2, 6, 5, 9, 10, 14, 13],
    // 8 triangular faces (truncated corners)
    [0, 8, 12], [1, 9, 13], [2, 10, 14], [3, 11, 15],
    [4, 12, 8], [5, 13, 9], [6, 14, 10], [7, 15, 11]
  ];

  const edges = extractEdgesFromFaces(faces);
  return new Geometry(vertices, edges, faces);
}

function generateTruncatedOctahedron() {
  // Implementation similar to truncated cube but with octahedron base
  // ...add implementation...
  throw new Error('Truncated Octahedron not yet implemented');
}

function generateIcosidodecahedron() {
  // Most complex Archimedean solid with 20 triangular and 12 pentagonal faces
  // ...add implementation...
  throw new Error('Icosidodecahedron not yet implemented');
}

// Utility function to extract edges from faces
function extractEdgesFromFaces(faces) {
  const edgeSet = new Set();
  faces.forEach(face => {
    for (let i = 0; i < face.length; i++) {
      const v1 = face[i];
      const v2 = face[(i + 1) % face.length];
      const edge = [Math.min(v1, v2), Math.max(v1, v2)];
      edgeSet.add(edge.join(','));
    }
  });
  return Array.from(edgeSet).map(e => e.split(',').map(Number));
}

export const ARCHIMEDEAN_TYPES = [
  {
    name: 'Truncated Tetrahedron',
    description: 'Tetrahedron with corners cut off',
    faces: '4 triangular, 4 hexagonal',
    vertices: 12
  },
  {
    name: 'Cuboctahedron',
    description: 'Vertices at edge midpoints of cube',
    faces: '8 triangular, 6 square',
    vertices: 12
  },
  {
    name: 'Truncated Cube',
    description: 'Cube with corners cut off',
    faces: '8 triangular, 6 octagonal',
    vertices: 24
  },
  {
    name: 'Truncated Octahedron',
    description: 'Octahedron with corners cut off',
    faces: '6 square, 8 hexagonal',
    vertices: 24
  },
  {
    name: 'Icosidodecahedron',
    description: 'Vertices at edge midpoints of icosahedron',
    faces: '20 triangular, 12 pentagonal',
    vertices: 30
  }
];