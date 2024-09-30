import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const SHAPES = {
  TETRAHEDRON: 'Tetrahedron',
  CUBE: 'Cube',
  OCTAHEDRON: 'Octahedron',
  DODECAHEDRON: 'Dodecahedron',
  ICOSAHEDRON: 'Icosahedron',
  CUSTOM: 'Custom Polyhedron'
};

const D3Visualization = () => {
  const d3Container = useRef(null);
  const [shape, setShape] = useState(SHAPES.CUBE);
  const [customFaces, setCustomFaces] = useState(6);
  const [speed, setSpeed] = useState(1);
  const [fluctuation, setFluctuation] = useState(0);

  useEffect(() => {
    if (d3Container.current) {
      const svg = d3.select(d3Container.current);
      const width = 800;
      const height = 400;
      const scale = 50;

      svg.selectAll("*").remove();

      const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

      // Generate points and faces based on selected shape
      const { points, faces } = generateShapeData(shape, customFaces, scale);

      let projectionMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];

      function rotateX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return [
          [1, 0, 0],
          [0, c, -s],
          [0, s, c]
        ];
      }

      function rotateY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return [
          [c, 0, s],
          [0, 1, 0],
          [-s, 0, c]
        ];
      }

      function multiply(a, b) {
        return a.map((row, i) =>
          b[0].map((_, j) =>
            row.reduce((acc, _, n) =>
              acc + a[i][n] * b[n][j], 0
            )
          )
        );
      }

      function update() {
        const projectedPoints = points.map(point => {
          // Apply random fluctuation
          const fluctuatedPoint = point.map(coord => 
            coord + (Math.random() - 0.5) * fluctuation * scale * 0.1
          );
          return multiply(projectionMatrix, [[fluctuatedPoint[0]], [fluctuatedPoint[1]], [fluctuatedPoint[2]]])
            .flat()
            .slice(0, 2);
        });

        g.selectAll('path')
          .data(faces)
          .join('path')
          .attr('d', face => `M${face.map(i => projectedPoints[i]).join('L')}Z`)
          .attr('fill', (d, i) => d3.schemeCategory10[i % 10])
          .attr('stroke', '#000');
      }

      let timer = d3.timer((elapsed) => {
        const angle = elapsed * 0.001 * speed;
        projectionMatrix = multiply(rotateY(angle), rotateX(angle * 0.7));
        update();
      });

      return () => timer.stop();
    }
  }, [shape, customFaces, speed, fluctuation]);

  return (
    <div className="d3-visualization-container">
      <div className="controls">
        <div className="select-container">
          <label htmlFor="shape-select">Shape:</label>
          <select
            id="shape-select"
            value={shape}
            onChange={(e) => setShape(e.target.value)}
          >
            {Object.values(SHAPES).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {shape === SHAPES.CUSTOM && (
          <div className="slider-container">
            <label htmlFor="faces-slider">Faces: {customFaces}</label>
            <input
              id="faces-slider"
              type="range"
              min="4"
              max="20"
              value={customFaces}
              onChange={(e) => setCustomFaces(parseInt(e.target.value))}
            />
          </div>
        )}
        <div className="slider-container">
          <label htmlFor="speed-slider">Speed: {speed.toFixed(2)}</label>
          <input
            id="speed-slider"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-container">
          <label htmlFor="fluctuation-slider">Fluctuation: {fluctuation.toFixed(2)}</label>
          <input
            id="fluctuation-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={fluctuation}
            onChange={(e) => setFluctuation(parseFloat(e.target.value))}
          />
        </div>
      </div>
      <svg
        className="d3-container"
        width={800}
        height={400}
        ref={d3Container}
      />
    </div>
  );
};

function generateShapeData(shape, customFaces, scale) {
  switch (shape) {
    case SHAPES.TETRAHEDRON:
      return generateTetrahedron(scale);
    case SHAPES.CUBE:
      return generateCube(scale);
    case SHAPES.OCTAHEDRON:
      return generateOctahedron(scale);
    case SHAPES.DODECAHEDRON:
      return generateDodecahedron(scale);
    case SHAPES.ICOSAHEDRON:
      return generateIcosahedron(scale);
    case SHAPES.CUSTOM:
      return generateCustomPolyhedron(customFaces, scale);
    default:
      return generateCube(scale);
  }
}

// Implement functions to generate points and faces for each shape
function generateTetrahedron(scale) {
  // Implementation for tetrahedron
}

function generateCube(scale) {
  const points = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ].map(p => p.map(c => c * scale));

  const faces = [
    [0, 1, 2, 3], [4, 5, 6, 7], [0, 4, 7, 3],
    [1, 5, 6, 2], [0, 1, 5, 4], [3, 2, 6, 7]
  ];

  return { points, faces };
}

function generateOctahedron(scale) {
  // Implementation for octahedron
}

function generateDodecahedron(scale) {
  // Implementation for dodecahedron
}

function generateIcosahedron(scale) {
  // Implementation for icosahedron
}

function generateCustomPolyhedron(faces, scale) {
  // Implementation for custom polyhedron (similar to previous cone-like shape)
}

export default D3Visualization;