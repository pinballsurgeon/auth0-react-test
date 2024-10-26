export function generateRegularPolygon(numPoints) {
    const vertices = [];
    const edges = [];
    const faces = [[]];  // Single face for 2D polygon
    
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