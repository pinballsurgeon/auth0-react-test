export function interpolateGeometries(geom1, geom2, t) {
    // Safety check for compatible geometries
    if (!areGeometriesCompatible(geom1, geom2)) {
      return geom1; // Fallback to lower complexity if incompatible
    }
    
    const interpolatedVertices = interpolateVertices(geom1.vertices, geom2.vertices, t);
    const interpolatedEdges = interpolateEdges(geom1.edges, geom2.edges, t);
    const interpolatedFaces = interpolateFaces(geom1.faces, geom2.faces, t);
    
    return new Geometry(
      interpolatedVertices,
      interpolatedEdges,
      interpolatedFaces
    );
  }