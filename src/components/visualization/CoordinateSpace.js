import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

/**
 * @description Simple point class for 3D coordinate representation
 */
class Point {
  constructor(x, y, z, radius, color) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
    this.color = color;
    this.history = [];

    // Add velocity components (random initial velocities)
    this.vx = (Math.random() - 0.5) * 2; // Velocity in X
    this.vy = (Math.random() - 0.5) * 2; // Velocity in Y
    this.vz = (Math.random() - 0.5) * 2; // Velocity in Z
  }

  updatePosition() {
    // Update position based on velocity
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;

    // Keep points within boundaries (bounce effect)
    const boundary = 200;
    if (this.x > boundary || this.x < -boundary) this.vx *= -1;
    if (this.y > boundary || this.y < -boundary) this.vy *= -1;
    if (this.z > boundary || this.z < -boundary) this.vz *= -1;

    // Record position for tail
    this.history.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.history.length > 100) {
      this.history.pop();
    }
  }
}

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    tailLength: 50,
    particleCount: 10
  });

  const [points, setPoints] = useState([]);

  // Initialize fixed points
  useEffect(() => {
    const newPoints = [];

    // Create points in a grid pattern
    for (let i = 0; i < config.particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / config.particleCount);
      const theta = Math.sqrt(config.particleCount * Math.PI) * phi;

      const x = 200 * Math.cos(theta) * Math.sin(phi);
      const y = 200 * Math.sin(theta) * Math.sin(phi);
      const z = 200 * Math.cos(phi);

      newPoints.push(new Point(
        x, y, z,
        5 + Math.random() * 5,
        d3.interpolateSpectral(i / config.particleCount)
      ));
    }
    setPoints(newPoints);
  }, [config.particleCount]);

  useEffect(() => {
    if (!d3Container.current || points.length === 0) return;

    const width = d3Container.current.clientWidth;
    const height = d3Container.current.clientHeight;
    let rotation = 0;

    d3.select(d3Container.current).selectAll('*').remove();
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height]);

    const defs = svg.append('defs');

    // Add glow effect
    const filter = defs.append('filter')
      .attr('id', 'glow');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Define gradients for tails
    const uniqueColors = [...new Set(points.map(p => p.color))];

    uniqueColors.forEach(color => {
      const gradientId = `tail-gradient-${color.replace('#', '')}`;
      const gradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('gradientUnits', 'userSpaceOnUse');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.8);

      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0.3);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', color)
        .attr('stop-opacity', 0);
    });

    const g = svg.append('g');

    // Project 3D to 2D
    const project = (point) => {
      const scale = config.zoom;
      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Apply scaling
      const x = point.x * config.scaleX;
      const y = point.y * config.scaleY;
      const z = point.z * config.scaleZ;

      return [
        scale * (x * cosA - z * sinA),
        scale * (y - (x * sinA + z * cosA) * 0.3)
      ];
    };

    const drawTails = () => {
      points.forEach(point => {
        if (config.tailLength <= 0) return;

        const tailPoints = point.history.slice(0, config.tailLength);
        if (tailPoints.length < 2) return;

        const line = d3.line()
          .curve(d3.curveBasis)
          .x(d => project(d)[0])
          .y(d => project(d)[1]);

        const gradientId = `tail-gradient-${point.color.replace('#', '')}`;

        g.append('path')
          .datum(tailPoints)
          .attr('d', line)
          .attr('stroke', `url(#${gradientId})`)
          .attr('stroke-width', 2)
          .attr('fill', 'none');
      });
    };

    const drawPoints = () => {
      points.forEach(point => {
        const [x, y] = project(point);

        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', point.radius)
          .attr('fill', point.color)
          .attr('filter', 'url(#glow)');
      });
    };

    let animationFrame;
    const animate = () => {
      if (config.rotationSpeed !== 0) {
        rotation += config.rotationSpeed;
      }

      // Update point positions
      points.forEach((point, index) => {
        point.updatePosition();

        // Log point position and history length
        if (index === 0) { // Log for the first point as an example
          console.log(`Point ${index} position:`, point.x, point.y, point.z);
          console.log(`Point ${index} history length:`, point.history.length);
        }
      });

      g.selectAll('*').remove();
      drawTails();
      drawPoints();

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [points, config]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 bg-gray-900" ref={d3Container} />
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
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
            <label className="block text-sm font-medium text-gray-300">
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
            <label className="block text-sm font-medium text-gray-300">
              Scale X
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.scaleX}
              onChange={(e) => setConfig({
                ...config,
                scaleX: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Scale Y
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.scaleY}
              onChange={(e) => setConfig({
                ...config,
                scaleY: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Scale Z
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.scaleZ}
              onChange={(e) => setConfig({
                ...config,
                scaleZ: parseFloat(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Tail Length
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={config.tailLength}
              onChange={(e) => setConfig({
                ...config,
                tailLength: parseInt(e.target.value)
              })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Point Count
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={config.particleCount}
              onChange={(e) => setConfig({
                ...config,
                particleCount: parseInt(e.target.value)
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
