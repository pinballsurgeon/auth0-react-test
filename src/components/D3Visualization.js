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

  if (!d3Container.current) {
    console.error('SVG container reference is null');
  } else {
    console.log('SVG container reference is valid');
  }

  useEffect(() => {
    if (!d3Container.current) {
      console.error('SVG container reference is still null');
      return;
    }
  
    // Clear previous SVG content
    const svg = d3.select(d3Container.current);
    svg.selectAll('*').remove();
  
    // Set up responsive SVG attributes
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet');
  
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
      return;
    }
  
    // Calculate bounding box of vertices to determine scale and translation
    const xExtent = d3.extent(vertices, (d) => d[0]);
    const yExtent = d3.extent(vertices, (d) => d[1]);
    const zExtent = d3.extent(vertices, (d) => d[2] || 0); // Optional for 3D projection
  
    // Calculate width, height, and center of bounding box
    const boundingWidth = Math.abs(xExtent[1] - xExtent[0]);
    const boundingHeight = Math.abs(yExtent[1] - yExtent[0]);
    const boundingDepth = Math.abs(zExtent[1] - zExtent[0]);
  
    // Set scale to fit geometry within SVG with some padding
    const scale = Math.min(width / boundingWidth, height / boundingHeight) * 0.8;
  
    // Set projection dynamically based on geometry size
    const projection = d3.geoOrthographic()
      .scale(scale)
      .translate([width / 2, height / 2])
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
  
    // Clean up on component unmount
    return () => {
      timer.stop(); // Stop auto-rotation timer
      svg.on('.zoom', null); // Remove zoom events
      svg.on('.drag', null); // Remove drag events
      svg.selectAll('*').remove(); // Clear SVG content
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
        <div className="control-group">
          <label htmlFor="geometry-type">Geometry Type:</label>
          <select
            id="geometry-type"
            value={geometryType}
            onChange={(e) => setGeometryType(e.target.value)}
          >
            {Object.entries(GEOMETRY_TYPES).map(([key, value]) => (
              <option key={key} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="complexity">Complexity: {complexity}</label>
          <input
            id="complexity"
            type="range"
            min="3"
            max="20"
            value={complexity}
            onChange={(e) => setComplexity(parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="symmetry">Symmetry: {symmetry.toFixed(2)}</label>
          <input
            id="symmetry"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={symmetry}
            onChange={(e) => setSymmetry(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="dimension">Dimension: {dimension}</label>
          <input
            id="dimension"
            type="range"
            min="2"
            max="6"
            value={dimension}
            onChange={(e) => setDimension(parseInt(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="animation-speed">
            Animation Speed: {animationSpeed.toFixed(2)}
          </label>
          <input
            id="animation-speed"
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="morph-factor">
            Morph Factor: {morphFactor.toFixed(2)}
          </label>
          <input
            id="morph-factor"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={morphFactor}
            onChange={(e) => setMorphFactor(parseFloat(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="color-scheme">Color Scheme:</label>
          <select
            id="color-scheme"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
          >
            <option value="schemeCategory10">Category 10</option>
            <option value="schemeAccent">Accent</option>
            <option value="schemeDark2">Dark2</option>
            <option value="schemeSet1">Set1</option>
          </select>
        </div>
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
