import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';

// Point class definition
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
    particleCount: 10,
  });

  const [points, setPoints] = useState([]);

  // Header Component
  const Header = () => (
    <form onSubmit={handleVisualize} className="max-w-2xl mx-auto">
      <div className="flex flex-col md:flex-row gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter text to visualize..."
          className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="md:mt-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Visualize
        </button>
      </div>
    </form>
  );

  // Control Slider Component
  const ControlSlider = ({ label, value, onChange, min, max, step }) => (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">
          {label}
        </label>
        <span className="text-xs text-gray-400">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );

  // Controls Component
  const Controls = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <ControlSlider
        label="Rotation Speed"
        value={config.rotationSpeed}
        onChange={(value) => setConfig(prev => ({ ...prev, rotationSpeed: value }))}
        min={-2}
        max={2}
        step={0.1}
      />
      <ControlSlider
        label="Zoom"
        value={config.zoom}
        onChange={(value) => setConfig(prev => ({ ...prev, zoom: value }))}
        min={0.1}
        max={2}
        step={0.1}
      />
      <ControlSlider
        label="Scale X"
        value={config.scaleX}
        onChange={(value) => setConfig(prev => ({ ...prev, scaleX: value }))}
        min={0.1}
        max={2}
        step={0.1}
      />
      <ControlSlider
        label="Scale Y"
        value={config.scaleY}
        onChange={(value) => setConfig(prev => ({ ...prev, scaleY: value }))}
        min={0.1}
        max={2}
        step={0.1}
      />
      <ControlSlider
        label="Scale Z"
        value={config.scaleZ}
        onChange={(value) => setConfig(prev => ({ ...prev, scaleZ: value }))}
        min={0.1}
        max={2}
        step={0.1}
      />
    </div>
  );

  const handleVisualize = (e) => {
    e.preventDefault();
    setConfig((prev) => ({
      ...prev,
      particleCount: Math.max(searchInput.length, 1),
    }));
  };

  // Initialize points based on particle count
  useEffect(() => {
    const newPoints = [];
    for (let i = 0; i < config.particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / config.particleCount);
      const theta = Math.sqrt(config.particleCount * Math.PI) * phi;

      const x = 200 * Math.cos(theta) * Math.sin(phi);
      const y = 200 * Math.sin(theta) * Math.sin(phi);
      const z = 200 * Math.cos(phi);

      newPoints.push(
        new Point(
          x,
          y,
          z,
          5 + Math.random() * 5,
          d3.interpolateSpectral(i / config.particleCount)
        )
      );
    }
    setPoints(newPoints);
  }, [config.particleCount]);

  // D3 visualization code
  useEffect(() => {
    if (!d3Container.current || points.length === 0) return;

    const containerRect = d3Container.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Clear previous SVG
    d3.select(d3Container.current).selectAll('*').remove();

    // Create new SVG with exact dimensions
    const svg = d3
      .select(d3Container.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    // Define filters and gradients
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');

    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    // Projection function
    const project = (point, rotation, scale) => {
      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return [
        scale * (point.x * cosA - point.z * sinA),
        scale * (point.y - (point.x * sinA + point.z * cosA) * 0.3),
      ];
    };

    let rotation = 0;

    // Draw points
    const drawPoints = (rotation, scale) => {
      // Use data join for better performance
      const circles = g.selectAll('circle').data(points, (d) => d);

      // Enter
      circles
        .enter()
        .append('circle')
        .attr('r', (d) => d.radius)
        .attr('fill', (d) => d.color)
        .attr('filter', 'url(#glow)')
        .merge(circles) // Update existing circles
        .attr('cx', (d) => project(d, rotation, scale)[0])
        .attr('cy', (d) => project(d, rotation, scale)[1]);

      // Exit
      circles.exit().remove();
    };

    let animationFrame;

    const animate = () => {
      if (config.rotationSpeed !== 0) {
        rotation += config.rotationSpeed;
      }

      points.forEach((point) => {
        point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
      });

      // Clear previous frame
      g.selectAll('*').remove();

      // Draw updated points
      drawPoints(rotation, config.zoom);

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [points, config]);

  // Handle responsive resizing
  useEffect(() => {
    if (!d3Container.current) return;

    const updateSVGDimensions = () => {
      const svgElement = d3Container.current.querySelector('svg');
      if (!svgElement) return;

      const containerRect = d3Container.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;

      d3.select(svgElement)
        .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`);
    };

    // Debounce function to limit resize calls
    const debounce = (func, wait) => {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(), wait);
      };
    };

    const debouncedResize = debounce(updateSVGDimensions, 200);

    const resizeObserver = new ResizeObserver(debouncedResize);
    resizeObserver.observe(d3Container.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <VisualizationLayout
      header={<Header />}
      controls={<Controls />}
    >
      <div 
        ref={d3Container}
        className="w-full h-full bg-gray-900"
        style={{ minHeight: 0 }} // Prevents flex content from overflowing
      />
    </VisualizationLayout>
  );
};

export default CoordinateSpace;