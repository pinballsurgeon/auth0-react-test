// .components/geometries/Geometry.js

// Essential geometry generation functions for early end-to-end demonstration

export function generateGeometry(type, complexity) {
    switch (type) {
      case 'Platonic Solids':
        return generatePlatonicSolid(complexity);
      // More types can be added here in the future
      default:
        return generatePlatonicSolid(complexity);
    }
  }
  
  export function generatePlatonicSolid(complexity) {
    // Simple implementation for early demo (e.g., Tetrahedron or Cube)
    if (complexity === 4) {
      // Tetrahedron
      return {
        vertices: [
          [1, 1, 1],
          [-1, -1, 1],
          [-1, 1, -1],
          [1, -1, -1],
        ],
        faces: [
          [0, 1, 2],
          [0, 1, 3],
          [0, 2, 3],
          [1, 2, 3],
        ],
        edges: extractEdges([[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]),
      };
    } else {
      // Cube as default
      return {
        vertices: [
          [-1, -1, -1],
          [1, -1, -1],
          [1, 1, -1],
          [-1, 1, -1],
          [-1, -1, 1],
          [1, -1, 1],
          [1, 1, 1],
          [-1, 1, 1],
        ],
        faces: [
          [0, 1, 2, 3],
          [4, 5, 6, 7],
          [0, 1, 5, 4],
          [2, 3, 7, 6],
          [0, 3, 7, 4],
          [1, 2, 6, 5],
        ],
        edges: extractEdges([[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]]),
      };
    }
  }
  
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