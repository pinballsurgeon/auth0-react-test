import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const D3Visualization = () => {
  const d3Container = useRef(null);
  const [sides, setSides] = useState(6);
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

      // Generate points for a regular polyhedron
      const points = generatePolyhedronPoints(sides, scale);

      // Generate faces
      const faces = generateFaces(sides);

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
  }, [sides, speed, fluctuation]);

  return (
    <div className="d3-visualization-container">
      <div className="controls">
        <div className="slider-container">
          <label htmlFor="sides-slider">Sides: {sides}</label>
          <input
            id="sides-slider"
            type="range"
            min="4"
            max="20"
            value={sides}
            onChange={(e) => setSides(parseInt(e.target.value))}
          />
        </div>
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

function generatePolyhedronPoints(sides, scale) {
  const points = [];
  const angleStep = Math.PI * 2 / sides;
  for (let i = 0; i < sides; i++) {
    const angle1 = i * angleStep;
    const angle2 = (i + 1) * angleStep;
    points.push([Math.cos(angle1) * scale, Math.sin(angle1) * scale, scale]);
    points.push([Math.cos(angle2) * scale, Math.sin(angle2) * scale, scale]);
    points.push([0, 0, -scale]);
  }
  return points;
}

function generateFaces(sides) {
  const faces = [];
  for (let i = 0; i < sides; i++) {
    faces.push([i * 3, i * 3 + 1, i * 3 + 2]);
  }
  // Add the base
  faces.push(Array.from({length: sides}, (_, i) => i * 3 + 1));
  return faces;
}

export default D3Visualization;