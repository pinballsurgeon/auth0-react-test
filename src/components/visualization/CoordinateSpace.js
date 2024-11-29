import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    tailLength: 0,
    tailCurve: 0.5  // New parameter to control tail curvature
  });

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

    d3.select(d3Container.current).selectAll('*').remove();

    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width/2, -height/2, width, height]);

    const g = svg.append('g');

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

    const createCometTail = (startX, startY, rotation) => {
      const tailLength = 30 * config.tailLength;
      const segments = 20; // Number of segments in the tail curve
      const points = [];
      
      // Calculate the direction of rotation for proper tail curve
      const rotationSign = config.rotationSpeed >= 0 ? 1 : -1;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = rotation + (rotationSign * t * Math.PI * 0.5 * config.tailCurve);
        
        // Create a spiral effect by gradually increasing radius
        const radius = tailLength * t;
        const x = startX - (Math.cos(angle) * radius);
        const y = startY - (Math.sin(angle) * radius);
        
        points.push([x, y]);
      }
      
      // Create a smooth curve through the points
      return d3.line().curve(d3.curveBasis)(points);
    };

    const drawTails = () => {
      if (config.tailLength > 0) {
        samplePoints.forEach((point, index) => {
          const [x, y] = project(point);
          
          // Create unique gradient for each tail
          const gradientId = `comet-gradient-${index}`;
          const gradient = g.append('defs')
            .append('linearGradient')
            .attr('id', gradientId)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', x)
            .attr('y1', y)
            .attr('x2', x - 30 * config.tailLength)
            .attr('y2', y);

          gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#69b3a2')
            .attr('stop-opacity', 0.8);

          gradient.append('stop')
            .attr('offset', '50%')
            .attr('stop-color', '#69b3a2')
            .attr('stop-opacity', 0.3);

          gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#69b3a2')
            .attr('stop-opacity', 0);

          // Create the curved tail path
          const tailPath = createCometTail(x, y, (rotation * Math.PI) / 180);
          
          g.append('path')
            .attr('d', tailPath)
            .attr('stroke', `url(#${gradientId})`)
            .attr('stroke-width', 3)
            .attr('fill', 'none');
        });
      }
    };

    const drawAxes = () => {
      const axesPoints = [
        [[0, 0, 0], [1, 0, 0]],
        [[0, 0, 0], [0, 1, 0]],
        [[0, 0, 0], [0, 0, 1]]
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

    const drawPoints = () => {
      drawTails();
      
      const points = g.selectAll('circle.point')
        .data(samplePoints)
        .join('circle')
        .attr('class', 'point')
        .attr('r', 5)
        .attr('fill', '#69b3a2')
        .attr('stroke', '#000')
        .attr('stroke-width', 1);

      points.attr('transform', d => {
        const [x, y] = project(d);
        return `translate(${x},${y})`;
      });
    };

    let animationFrame;
    const animate = () => {
      if (config.rotationSpeed !== 0) {
        rotation += config.rotationSpeed;
        g.selectAll('*').remove();
        drawAxes();
        drawPoints();
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
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
              min="-2"
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
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tail Length
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.tailLength}
              onChange={(e) => setConfig({
                ...config,
                tailLength: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tail Curve
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.tailCurve}
              onChange={(e) => setConfig({
                ...config,
                tailCurve: parseFloat(e.target.value)
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