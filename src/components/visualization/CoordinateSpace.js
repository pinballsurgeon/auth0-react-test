import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

class Point {
  constructor(x, y, z, radius, color) {
    this.baseX = x;
    this.baseY = y;
    this.baseZ = z;
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
    this.color = color;
    this.history = [];
  }

  updatePosition(scaleX, scaleY, scaleZ) {
    this.x = this.baseX * scaleX;
    this.y = this.baseY * scaleY;
    this.z = this.baseZ * scaleZ;
    this.history.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.history.length > 100) {
      this.history.pop();
    }
  }
}

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [searchInput, setSearchInput] = useState('');
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

  const handleVisualize = (e) => {
    e.preventDefault();
    setConfig(prev => ({
      ...prev,
      particleCount: searchInput.length || 1
    }));
  };

  useEffect(() => {
    const newPoints = [];
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

  // D3 visualization code
  useEffect(() => {
    if (!d3Container.current || points.length === 0) return;

    // Get the container's dimensions
    const containerRect = d3Container.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    let rotation = 0;


    // Clear previous SVG
    d3.select(d3Container.current).selectAll('*').remove();

    // Create new SVG with exact dimensions
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [-width / 4, -height / 4, width, height])
      .style('display', 'block');

    const defs = svg.append('defs');
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

    const project = (point) => {
      const scale = 1 * config.zoom;
      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return [
        scale * (point.x * cosA - point.z * sinA),
        scale * (point.y - (point.x * sinA + point.z * cosA) * 0.3)
      ];
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
      points.forEach(point => {
        point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
      });
      g.selectAll('*').remove();
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

  useEffect(() => {
    // Force a container resize check on mount
    const resizeObserver = new ResizeObserver(() => {
      if (d3Container.current) {
        const width = d3Container.current.clientWidth;
        const height = d3Container.current.clientHeight;
        d3.select(d3Container.current)
          .select('svg')
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', [-width / 2, -height / 2, width, height]);
      }
    });

    if (d3Container.current) {
      resizeObserver.observe(d3Container.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-4 border-b border-gray-700 shrink-0">
        <form onSubmit={handleVisualize} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter text to visualize..."
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Visualize
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-gray-900 relative" ref={d3Container} />
      
      <div className="bg-gray-800 border-t border-gray-700 p-4 shrink-0">
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
        </div>
      </div>
    </div>
  );
};

export default CoordinateSpace;