import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

// Define the Point class
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

  const handleVisualize = (e) => {
    e.preventDefault();
    setConfig((prev) => ({
      ...prev,
      particleCount: Math.max(searchInput.length, 1), // Ensure at least 1
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

    // Get the container's dimensions
    const containerRect = d3Container.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    let rotation = 0;

    // Clear previous SVG
    d3.select(d3Container.current).selectAll('*').remove();

    // Create new SVG with exact dimensions
    const svg = d3
      .select(d3Container.current)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet') // Maintain aspect ratio
      .style('display', 'block');

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

    const uniqueColors = [...new Set(points.map((p) => p.color))];
    // uniqueColors.forEach((color) => {
    //   const gradientId = `tail-gradient-${color.replace('#', '')}`;
    //   const gradient = defs
    //     .append('linearGradient')
    //     .attr('id', gradientId)
    //     .attr('gradientUnits', 'userSpaceOnUse');

    //   gradient
    //     .append('stop')
    //     .attr('offset', '0%')
    //     .attr('stop-color', color)
    //     .attr('stop-opacity', 0.8);

    //   gradient
    //     .append('stop')
    //     .attr('offset', '50%')
    //     .attr('stop-color', color)
    //     .attr('stop-opacity', 0.3);

    //   gradient
    //     .append('stop')
    //     .attr('offset', '100%')
    //     .attr('stop-color', color)
    //     .attr('stop-opacity', 0);
    // });

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
    const svgElement = d3Container.current
      ? d3Container.current.querySelector('svg')
      : null;
    if (!svgElement) return;

    const updateSVGDimensions = () => {
      const containerRect = d3Container.current.getBoundingClientRect();
      const width = containerRect.width;
      const height = containerRect.height;

      d3.select(svgElement).attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`);
    };

    // Initial dimension setup
    updateSVGDimensions();

    // Debounce function to limit resize calls
    const debounce = (func, wait) => {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(), wait);
      };
    };

    const debouncedResize = debounce(updateSVGDimensions, 200);

    // Setup ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    if (d3Container.current) {
      resizeObserver.observe(d3Container.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [d3Container]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 shrink-0">
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
              className="mt-2 md:mt-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Visualize
            </button>
          </div>
        </form>
      </div>

      {/* D3 Visualization Container */}
      <div className="flex-1 bg-gray-900 relative" ref={d3Container}>
        {/* SVG will be appended here by D3 */}
      </div>

      {/* Footer Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Rotation Speed Control */}
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
              onChange={(e) =>
                setConfig({
                  ...config,
                  rotationSpeed: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          {/* Zoom Control */}
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
              onChange={(e) =>
                setConfig({
                  ...config,
                  zoom: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          {/* Scale X Control */}
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
              onChange={(e) =>
                setConfig({
                  ...config,
                  scaleX: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          {/* Scale Y Control */}
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
              onChange={(e) =>
                setConfig({
                  ...config,
                  scaleY: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          {/* Scale Z Control */}
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
              onChange={(e) =>
                setConfig({
                  ...config,
                  scaleZ: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinateSpace;
