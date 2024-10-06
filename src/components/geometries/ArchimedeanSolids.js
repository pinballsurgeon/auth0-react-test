// /components/geometries/ArchimedeanSolids.js

import Geometry from './Geometry';

export function generateArchimedeanSolid(type) {
  switch (type) {
    case 'Truncated Cube':
      return generateTruncatedCube();
    default:
      throw new Error(`Unknown Archimedean Solid type: ${type}`);
  }
}

function generateTruncatedCube() {
  // Simple representation for demonstration purposes
  return new Geometry(
    [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // Lower face
      [-1.5, -1.5, 1.5], [1.5, -1.5, 1.5], [1.5, 1.5, 1.5], [-1.5, 1.5, 1.5] // Upper face truncated
    ],
    [
      [0, 1], [1, 2], [2, 3], [3, 0], // Lower edges
      [4, 5], [5, 6], [6, 7], [7, 4], // Upper edges
      [0, 4], [1, 5], [2, 6], [3, 7]  // Side edges
    ],
    [
      [0, 1, 2, 3], [4, 5, 6, 7], // Faces
      [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]
    ]
  );
}
