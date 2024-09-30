// geometryFactory.js

export function generateGeometry(type, complexity, symmetry, dimension, morphFactor) {
    let geometry;
  
    switch (type) {
      case 'Platonic Solids':
        geometry = generatePlatonicSolid(complexity);
        break;
      case 'Archimedean Solids':
        geometry = generateArchimedeanSolid(complexity, symmetry);
        break;
      case 'Prisms and Antiprisms':
        geometry = generatePrism(complexity, symmetry);
        break;
      case 'Stellations':
        geometry = generateStellation(complexity, symmetry);
        break;
      case 'Hyperbolic Geometries':
        geometry = generateHyperbolicTiling(complexity, symmetry);
        break;
      case 'Fractal Geometries':
        geometry = generateFractal(complexity, dimension);
        break;
      case 'Higher Dimensional Projections':
        geometry = generateHigherDimensionalProjection(complexity, dimension);
        break;
      default:
        geometry = generatePlatonicSolid(complexity);
        break;
    }
  
    if (morphFactor > 0) {
      const nextGeometry = generateNextGeometry(type, complexity + 1);
      geometry.vertices = interpolateVertices(
        geometry.vertices,
        nextGeometry.vertices,
        morphFactor
      );
    }
  
    return geometry;
  }
  
  function generatePlatonicSolid(complexity) {
    const platonicSolids = {
      4: {
        vertices: [
          [1, 1, 1],
          [-1, -1, 1],
          [-1, 1, -1],
          [1, -1, -1],
        ],
        faces: [
          [0, 1, 2],
          [0, 3, 1],
          [0, 2, 3],
          [1, 3, 2],
        ],
      },
      6: {
        vertices: [
          [-1, -1, -1],
          [-1, -1, 1],
          [-1, 1, -1],
          [-1, 1, 1],
          [1, -1, -1],
          [1, -1, 1],
          [1, 1, -1],
          [1, 1, 1],
        ],
        faces: [
          [0, 1, 3, 2],
          [4, 6, 7, 5],
          [0, 4, 5, 1],
          [2, 3, 7, 6],
          [0, 2, 6, 4],
          [1, 5, 7, 3],
        ],
      },
      8: {
        vertices: [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ],
        faces: [
          [0, 2, 4],
          [2, 1, 4],
          [1, 3, 4],
          [3, 0, 4],
          [0, 5, 2],
          [2, 5, 1],
          [1, 5, 3],
          [3, 5, 0],
        ],
      },
      12: {
        // Dodecahedron
        vertices: [],
        faces: [],
      },
      20: {
        // Icosahedron
        vertices: [],
        faces: [],
      },
    };
  
    const solid = platonicSolids[complexity];
  
    if (solid && solid.vertices.length > 0) {
      return {
        vertices: solid.vertices,
        edges: extractEdges(solid.faces),
        faces: solid.faces,
      };
    } else {
      // Default to cube if complexity not matched
      return generatePlatonicSolid(6);
    }
  }
  
  function generateArchimedeanSolid(complexity, symmetry) {
    // Placeholder for actual implementation
    return generatePlatonicSolid(6);
  }
  
  function generatePrism(sides, symmetry) {
    const angleIncrement = (2 * Math.PI) / sides;
    const vertices = [];
  
    for (let i = 0; i < sides; i++) {
      const angle = i * angleIncrement;
      vertices.push([Math.cos(angle), Math.sin(angle), -1]);
      vertices.push([Math.cos(angle), Math.sin(angle), 1]);
    }
  
    const faces = [];
  
    // Side faces
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      faces.push([i * 2, next * 2, next * 2 + 1, i * 2 + 1]);
    }
  
    // Top and bottom faces
    const topFace = [];
    const bottomFace = [];
    for (let i = 0; i < sides; i++) {
      topFace.push(i * 2 + 1);
      bottomFace.push(i * 2);
    }
    faces.push(topFace);
    faces.push(bottomFace.reverse());
  
    return {
      vertices: vertices,
      edges: extractEdges(faces),
      faces: faces,
    };
  }
  
  function generateStellation(complexity, symmetry) {
    // Placeholder for actual implementation
    return generatePlatonicSolid(4);
  }
  
  function generateHyperbolicTiling(complexity, symmetry) {
    // Placeholder for actual implementation
    return generatePlatonicSolid(6);
  }
  
  function generateFractal(iterations, dimension) {
    // Placeholder for actual implementation
    return generatePlatonicSolid(6);
  }
  
  function generateHigherDimensionalProjection(complexity, dimension) {
    // Placeholder for actual implementation
    return generatePlatonicSolid(6);
  }
  
  function generateNextGeometry(type, complexity) {
    return generateGeometry(type, complexity, 1, 3, 0);
  }
  
  function interpolateVertices(vertices1, vertices2, t) {
    return vertices1.map((v, i) =>
      v.map((coord, j) => coord * (1 - t) + (vertices2[i] ? vertices2[i][j] : 0) * t)
    );
  }
  
  function extractEdges(faces) {
    const edgesSet = new Set();
    faces.forEach((face) => {
      for (let i = 0; i < face.length; i++) {
        const edge = [face[i], face[(i + 1) % face.length]].sort((a, b) => a - b);
        edgesSet.add(edge.toString());
      }
    });
    return Array.from(edgesSet).map((e) => e.split(',').map(Number));
  }
  