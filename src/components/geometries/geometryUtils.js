import { Geometry } from './Geometry';

export function generateRegularPolygon(numPoints) {
  const vertices = [];
  const edges = [];
  const faces = [[]];
  
  // Generate vertices around a circle
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    vertices.push([x, y, 0]);
    edges.push([i, (i + 1) % numPoints]);
    faces[0].push(i);
  }
  
  return new Geometry(vertices, edges, faces);
}

export function interpolateVertices(vertices1, vertices2, t) {
  if (vertices1.length !== vertices2.length) {
    throw new Error('Cannot interpolate between different numbers of vertices');
  }
  
  return vertices1.map((v1, i) => {
    const v2 = vertices2[i];
    return [
      v1[0] + (v2[0] - v1[0]) * t,
      v1[1] + (v2[1] - v1[1]) * t,
      v1[2] + (v2[2] - v1[2]) * t
    ];
  });
}
