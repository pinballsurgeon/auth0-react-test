import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const D3Visualization = () => {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current) {
      const svg = d3.select(d3Container.current);
      const width = 800;
      const height = 400;
      const scale = 50;

      // Clear any existing visualization
      svg.selectAll("*").remove();

      // Set up the 3D scene
      const g = svg.append('g')
        .attr('transform', `translate(${width/2},${height/2})`);

      // Create a cube
      const points = [
        [1, 1, 1],  [-1, 1, 1],  [-1, -1, 1],  [1, -1, 1],
        [1, 1, -1], [-1, 1, -1], [-1, -1, -1], [1, -1, -1]
      ].map(point => point.map(x => x * scale));

      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 4, 7, 3],
        [1, 5, 6, 2],
        [0, 1, 5, 4],
        [3, 2, 6, 7]
      ];

      // Set up rotation
      let timer = d3.timer((elapsed) => {
        const angle = elapsed * 0.001;
        projectionMatrix = rotateY(angle) @ rotateX(angle * 0.7);
        update();
      });

      // Projection matrix
      let projectionMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];

      // Rotation matrices
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

      // Matrix multiplication
      function multiply(a, b) {
        return a.map((row, i) =>
          b[0].map((_, j) =>
            row.reduce((acc, _, n) =>
              acc + a[i][n] * b[n][j], 0
            )
          )
        );
      }

      // Update function
      function update() {
        const projectedPoints = points.map(point =>
          multiply(projectionMatrix, [[point[0]], [point[1]], [point[2]]])
            .flat()
            .slice(0, 2)
        );

        g.selectAll('path')
          .data(faces)
          .join('path')
          .attr('d', face => `M${face.map(i => projectedPoints[i]).join('L')}Z`)
          .attr('fill', (d, i) => d3.schemeCategory10[i])
          .attr('stroke', '#000');
      }

      return () => timer.stop();
    }
  }, []);

  return (
    <div className="d3-visualization">
      <svg
        className="d3-container"
        width={800}
        height={400}
        ref={d3Container}
      />
    </div>
  );
};

export default D3Visualization;