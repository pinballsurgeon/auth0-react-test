import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1
  });

  // Sample 3D points for initial visualization
  const samplePoints = [
    [1, 1, 1], [-1, -1, -1], [1, -1, 1], [-1, 1, -1],
    [0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, -0.5, 0.5],
    [0, 0, 1], [1, 0, 0], [0, 1, 0]
  ];

  useEffect(() => {
    if (!d3Container.current) return;

    const width = d3Container.current.clientWidth;
    const height = d3Container.current.clientHeight;
    let rotation = 0;

    // Clear previous content
    d3.select(d3Container.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width/2, -height/2, width, height]);

    // Create group for 3D scene
    const g = svg.append('g');

    // Function to project 3D points to 2D
    const project = (point) => {
      const scale = 100 * config.zoom;
      const x = point[0] * config.scaleX;
      const y = point[1] * config.scaleY;
      const z = point[2] * config.scaleZ;
      
      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return [
        scale * (x * cosA - z * sinA),
        scale * (y - (x * sinA + z * cosA) * 0.3)
      ];
    };

    // Draw axes
    const drawAxes = () => {
      const axesPoints = [
        [[0, 0, 0], [1, 0, 0]], // x-axis
        [[0, 0, 0], [0, 1, 0]], // y-axis
        [[0, 0, 0], [0, 0, 1]]  // z-axis
      ];

      axesPoints.forEach(([start, end], i) => {
        const [x1, y1] = project(start);
        const [x2, y2] = project(end.map(v => v * 1.5));
        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', ['#ff0000', '#00ff00', '#0000ff'][i])
          .attr('stroke-width', 1);
      });
    };

    // Draw points
    const drawPoints = () => {
      const points = g.selectAll('circle')
        .data(samplePoints)
        .join('circle')
        .attr('r', 5)
        .attr('fill', '#69b3a2')
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

      points.attr('transform', d => {
        const [x, y] = project(d);
        return `translate(${x},${y})`;
      });
    };

    // Animation loop
    const animate = () => {
      rotation += config.rotationSpeed;
      drawAxes();
      drawPoints();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      // Cleanup
      d3.select(d3Container.current).selectAll('*').remove();
    };
  }, [config]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1" ref={d3Container} />
      <div className="p-4 bg-white border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rotation Speed
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.rotationSpeed}
              onChange={(e) => setConfig({
                ...config,
                rotationSpeed: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Zoom
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.zoom}
              onChange={(e) => setConfig({
                ...config,
                zoom: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinateSpace;