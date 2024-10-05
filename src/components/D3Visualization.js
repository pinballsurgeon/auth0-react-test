// D3Visualization.js

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

const GEOMETRY_TYPES = {
  PLATONIC: 'Platonic Solids',
  ARCHIMEDEAN: 'Archimedean Solids',
  PRISMS: 'Prisms and Antiprisms',
  STELLATIONS: 'Stellations',
  HYPERBOLIC: 'Hyperbolic Geometries',
  FRACTALS: 'Fractal Geometries',
  HIGHER_DIMENSIONAL: 'Higher Dimensional Projections',
};

const D3Visualization = () => {
  const d3Container = useRef(null);

  // State variables for geometry parameters
  const [geometryType, setGeometryType] = useState(GEOMETRY_TYPES.PLATONIC);
  const [complexity, setComplexity] = useState(4); // Tetrahedron
  const [symmetry, setSymmetry] = useState(1); // Full symmetry
  const [dimension, setDimension] = useState(3); // 3D
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [morphFactor, setMorphFactor] = useState(0); // For morphing between geometries
  const [colorScheme, setColorScheme] = useState('schemeCategory10');

  // Dimensions for the SVG
  const width = 800;
  const height = 600;

  useEffect(() => {
    if (!d3Container.current) {
      console.error('SVG container reference is still null');
      return; // Exit if container reference is not ready
    }
  
    // Clear previous SVG content
    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove();
  
    // Set up responsive SVG attributes
    const containerWidth = d3Container.current.clientWidth;
    const containerHeight = d3Container.current.clientHeight;
  
    svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
  
    // Create group for geometry and center it
    const g = svg.append('g');
  
    // Generate geometry based on parameters
    const { vertices, edges, faces } = generateGeometry(
      geometryType,
      complexity,
      symmetry,
      dimension,
      morphFactor
    );
  
    if (!vertices || vertices.length === 0) {
      console.error('No vertices generated, unable to render geometry');
      return; // Exit early if no geometry is generated
    }
  
    // Calculate bounding box of vertices to determine scale and translation
    const xExtent = d3.extent(vertices, (d) => d[0]);
    const yExtent = d3.extent(vertices, (d) => d[1]);
    const boundingWidth = Math.abs(xExtent[1] - xExtent[0]);
    const boundingHeight = Math.abs(yExtent[1] - yExtent[0]);
  
    // Set scale to fit geometry within SVG with padding
    const scale = Math.min(
      (containerWidth / boundingWidth) * 0.8,
      (containerHeight / boundingHeight) * 0.8
    );
  
    // Set projection dynamically based on geometry size
    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);
  
    const path = d3.geoPath().projection(projection);
  
    // Color scale
    const color = d3[colorScheme] || d3.schemeCategory10;
  
    // Render faces
    g.selectAll('.face')
      .data(faces)
      .enter()
      .append('path')
      .attr('class', 'face')
      .attr('d', (d) =>
        path({
          type: 'Polygon',
          coordinates: [d.map((i) => vertices[i])],
        })
      )
      .attr('fill', (d, i) => color[i % color.length])
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.8);
  
    // Render edges
    g.selectAll('.edge')
      .data(edges)
      .enter()
      .append('path')
      .attr('class', 'edge')
      .attr('d', (d) =>
        path({
          type: 'LineString',
          coordinates: d.map((i) => vertices[i]),
        })
      )
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-width', 1);
  
    // Rotation state
    let rotateX = 0;
    let rotateY = 0;
  
    // Manual rotation via drag behavior
    svg.call(
      d3
        .drag()
        .on('start', (event) => {
          event.sourceEvent.stopPropagation(); // Prevent drag from triggering zoom
        })
        .on('drag', (event) => {
          rotateY += event.dx * 0.3;
          rotateX -= event.dy * 0.3;
          projection.rotate([rotateY, rotateX]);
          g.selectAll('path').attr('d', (d) =>
            d.type === 'Polygon'
              ? path({
                  type: 'Polygon',
                  coordinates: [d.map((i) => vertices[i])],
                })
              : path({
                  type: 'LineString',
                  coordinates: d.map((i) => vertices[i]),
                })
          );
        })
    );
  
    // Auto-rotation loop (optional, remove if only manual rotation is desired)
    const timer = d3.timer((elapsed) => {
      if (animationSpeed > 0) {
        rotateY = (rotateY + animationSpeed * 0.02) % 360;
        projection.rotate([rotateY, rotateX]);
        g.selectAll('path').attr('d', (d) =>
          d.type === 'Polygon'
            ? path({
                type: 'Polygon',
                coordinates: [d.map((i) => vertices[i])],
              })
            : path({
                type: 'LineString',
                coordinates: d.map((i) => vertices[i]),
              })
        );
      }
    });
  
    // Zoom behavior
    svg.call(
      d3
        .zoom()
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => {
          g.attr(
            'transform',
            `translate(${event.transform.x}, ${event.transform.y}) scale(${event.transform.k})`
          );
        })
    );
  
    // Resize handling
    window.addEventListener('resize', () => {
      const newWidth = d3Container.current.clientWidth;
      const newHeight = d3Container.current.clientHeight;
      svg.attr('viewBox', `0 0 ${newWidth} ${newHeight}`);
      projection.translate([newWidth / 2, newHeight / 2]);
    });
  
    // Clean up on component unmount
    return () => {
      timer.stop(); // Stop auto-rotation timer
      svg.on('.zoom', null); // Remove zoom events
      svg.on('.drag', null); // Remove drag events
      svg.selectAll('*').remove(); // Clear SVG content
      window.removeEventListener('resize', () => {}); // Clean up resize event listener
    };
  }, [
    geometryType,
    complexity,
    symmetry,
    dimension,
    animationSpeed,
    morphFactor,
    colorScheme,
  ]);
  
  return (
    <motion.div
      className="d3-visualization-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="controls">
        {/* Control elements for different parameters */}
        {/* ... */}
      </div>

      <svg
          className="d3-container"
          width={800}
          height={600}
          ref={d3Container}
          style={{ border: '1px solid black' }}
      ></svg>
    </motion.div>
  );
};

// Helper functions to generate geometries
function generateGeometry(type, complexity, symmetry, dimension, morphFactor) {
  let geometry;

  switch (type) {
    case GEOMETRY_TYPES.PLATONIC:
      geometry = generatePlatonicSolid(complexity);
      break;
    case GEOMETRY_TYPES.ARCHIMEDEAN:
      geometry = generateArchimedeanSolid(complexity, symmetry);
      break;
    case GEOMETRY_TYPES.PRISMS:
      geometry = generatePrism(complexity, symmetry);
      break;
    case GEOMETRY_TYPES.STELLATIONS:
      geometry = generateStellation(complexity, symmetry);
      break;
    case GEOMETRY_TYPES.HYPERBOLIC:
      geometry = generateHyperbolicTiling(complexity, symmetry);
      break;
    case GEOMETRY_TYPES.FRACTALS:
      geometry = generateFractal(complexity, dimension);
      break;
    case GEOMETRY_TYPES.HIGHER_DIMENSIONAL:
      geometry = generateHigherDimensionalProjection(complexity, dimension);
      break;
    default:
      geometry = generatePlatonicSolid(complexity);
      break;
  }

  // Apply morphing between geometries if morphFactor > 0
  if (morphFactor > 0) {
    const nextGeometry = generateNextGeometry(type, complexity + 1);
    geometry.vertices = interpolateVertices(
      geometry.vertices,
      nextGeometry.vertices,
      morphFactor
    );
  }

  // checks
  console.log('Generated Geometry:', geometry);
  if (!geometry.vertices || geometry.vertices.length === 0) {
    console.error('No vertices generated');
  }

  return geometry;
}

function generatePlatonicSolid(complexity) {
  // For simplicity, we use predefined data for Platonic solids
  // Complexity corresponds to the number of faces (4 for tetrahedron, 6 for cube, etc.)
  const platonicSolids = {
    4: {
      // Tetrahedron
      vertices: [
        [0, 0, Math.sqrt(2 / 3)],
        [-0.5, -Math.sqrt(3) / 6, -Math.sqrt(2 / 3) / 3],
        [0.5, -Math.sqrt(3) / 6, -Math.sqrt(2 / 3) / 3],
        [0, Math.sqrt(3) / 3, -Math.sqrt(2 / 3) / 3],
      ],
      faces: [
        [0, 1, 2],
        [0, 3, 1],
        [0, 2, 3],
        [1, 3, 2],
      ],
    },
    6: {
      // Cube
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
        [1, 5, 6, 2],
        [5, 4, 7, 6],
        [4, 0, 3, 7],
        [3, 2, 6, 7],
        [0, 4, 5, 1],
      ],
    },
    // Add other Platonic solids as needed
  };

  const solid = platonicSolids[complexity];

  if (solid) {
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
  // Placeholder function for Archimedean solids
  return generatePlatonicSolid(6);
}

function generatePrism(complexity, symmetry) {
  // Placeholder function for prisms and antiprisms
  return generatePlatonicSolid(6);
}

function generateStellation(complexity, symmetry) {
  // Placeholder function for stellations
  return generatePlatonicSolid(6);
}

function generateHyperbolicTiling(complexity, symmetry) {
  // Placeholder function for hyperbolic geometries
  return generatePlatonicSolid(6);
}

function generateFractal(complexity, dimension) {
  // Placeholder function for fractals
  return generatePlatonicSolid(6);
}

function generateHigherDimensionalProjection(complexity, dimension) {
  // Placeholder function for higher-dimensional projections
  return generatePlatonicSolid(6);
}

function generateNextGeometry(type, complexity) {
  // Generate the next geometry for morphing
  return generateGeometry(type, complexity, 1, 3, 0);
}

function interpolateVertices(vertices1, vertices2, t) {
  // Interpolate between two sets of vertices
  return vertices1.map((v, i) =>
    v.map((coord, j) => coord * (1 - t) + vertices2[i][j] * t)
  );
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

export default D3Visualization;