/**
 * @module CoordinateSpace
 * @description 3D coordinate visualization with physics-based particle simulation
 * 
 * Dependencies:
 * - React (^18.2.0)
 * - D3.js (^7.9.0)
 * - Tailwind CSS for styling
 * 
 * External Module Usage:
 * - Imported by: pages/coordinate-page.js
 * 
 * Configuration Options:
 * - Rotation speed: Controls system rotation (-2 to 2)
 * - Gravity: Affects orbital mechanics (0 to 50)
 * - Tail length: Controls particle trail length (0 to 100)
 * - Zoom: Overall system scale (0.1 to 2)
 * - Scale (X,Y,Z): Individual axis scaling (0.1 to 2)
 * - Particle count: Number of orbiting bodies (1 to 20)
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

/**
 * 1. Core Classes
 */

/**
 * 1.1 Body Class
 * @description Represents a physical body in the simulation
 * @internal Used only within this module
 */
class Body {
  constructor(x, y, z, vx, vy, vz, mass, radius, color) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.ax = 0;
    this.ay = 0;
    this.az = 0;
    this.mass = mass;
    this.radius = radius;
    this.color = color;
    this.tail = new Tail(50);
    this.history = []; // Added for tail tracking
  }

  update(dt) {
    this.vx += this.ax * dt;
    this.vy += this.ay * dt;
    this.vz += this.az * dt;
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    
    // Store position history for tail
    this.history.unshift({ x: this.x, y: this.y, z: this.z });
    if (this.history.length > 100) { // Maximum tail length
      this.history.pop();
    }
    
    this.ax = 0;
    this.ay = 0;
    this.az = 0;
  }
}

/**
 * 1.2 Tail Class
 * @description Manages particle trail visualization
 * @internal Used only within this module
 */
class Tail {
  constructor(maxLength) {
    this.points = [];
    this.maxLength = maxLength;
  }

  addPoint(point) {
    this.points = [point].concat(this.points).slice(0, this.maxLength);
  }
}

/**
 * 2. Main Component
 * @description Primary visualization component
 * @exports CoordinateSpace
 */
const CoordinateSpace = () => {
  const d3Container = useRef(null);
  
  /**
   * 2.1 State Management
   */
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    tailLength: 50,
    tailFade: 0.95,
    gravity: 10,
    timeStep: 0.01,
    particleCount: 10
  });

  const [bodies, setBodies] = useState([]);

  /**
   * 2.2 System Initialization
   * @description Creates initial particle system
   */
  useEffect(() => {
    const newBodies = [];
    // Central mass
    newBodies.push(new Body(0, 0, 0, 0, 0, 0, 1000000, 30, '#FF8501'));
    
    // Orbiting bodies
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / config.particleCount;
      const distance = 200 + Math.random() * 100;
      const speed = 200 + Math.random() * 50;
      
      newBodies.push(new Body(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        Math.random() * 50 - 25,
        Math.cos(angle + Math.PI/2) * speed,
        Math.sin(angle + Math.PI/2) * speed,
        Math.random() * 10 - 5,
        1,
        5 + Math.random() * 5,
        d3.interpolateSpectral(i / config.particleCount)
      ));
    }
    setBodies(newBodies);
  }, [config.particleCount]);

  /**
   * 2.3 Main Rendering Logic
   */
  useEffect(() => {
    if (!d3Container.current || bodies.length === 0) return;

    const width = d3Container.current.clientWidth;
    const height = d3Container.current.clientHeight;
    let rotation = 0;

    // Setup SVG
    d3.select(d3Container.current).selectAll('*').remove();
    const svg = d3.select(d3Container.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width/2, -height/2, width, height]);

    const g = svg.append('g');

    /**
     * 2.3.1 3D Projection
     * @description Projects 3D coordinates to 2D space
     */
    const project = (point) => {
      const scale = 1 * config.zoom;
      const x = point.x * config.scaleX;
      const y = point.y * config.scaleY;
      const z = point.z * config.scaleZ;
      
      const angle = (rotation * Math.PI) / 180;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      return [
        scale * (x * cosA - z * sinA),
        scale * (y - (x * sinA + z * cosA) * 0.3)
      ];
    };

    /**
     * 2.3.2 Physics Update
     * @description Updates particle positions based on gravitational forces
     */
    const updateSystem = () => {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = 0; j < bodies.length; j++) {
          if (i === j) continue;
          
          const b1 = bodies[i];
          const b2 = bodies[j];

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dz = b2.z - b1.z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          const force = config.gravity * (b1.mass * b2.mass) / (dist * dist);
          
          const fx = force * dx / dist;
          const fy = force * dy / dist;
          const fz = force * dz / dist;

          b1.ax += fx / b1.mass;
          b1.ay += fy / b1.mass;
          b1.az += fz / b1.mass;
        }
      }

      bodies.forEach(body => body.update(config.timeStep));
    };

    /**
     * 2.3.3 Tail Rendering
     * @description Draws particle trails with gradients
     */
    const drawTails = () => {
      bodies.forEach(body => {
        if (config.tailLength <= 0) return;
        
        const tailPoints = body.history.slice(0, config.tailLength);
        if (tailPoints.length < 2) return;

        const line = d3.line()
          .curve(d3.curveBasis)
          .x(d => project(d)[0])
          .y(d => project(d)[1]);

        // Create unique gradient for each tail
        const gradientId = `tail-gradient-${body.color.replace('#', '')}`;
        const gradient = g.append('defs')
          .append('linearGradient')
          .attr('id', gradientId)
          .attr('gradientUnits', 'userSpaceOnUse');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', body.color)
          .attr('stop-opacity', 0.8);

        gradient.append('stop')
          .attr('offset', '50%')
          .attr('stop-color', body.color)
          .attr('stop-opacity', 0.3);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', body.color)
          .attr('stop-opacity', 0);

        g.append('path')
          .datum(tailPoints)
          .attr('d', line)
          .attr('stroke', `url(#${gradientId})`)
          .attr('stroke-width', 2)
          .attr('fill', 'none');
      });
    };

    /**
     * 2.3.4 Body Rendering
     * @description Draws the actual particles
     */
    const drawBodies = () => {
      bodies.forEach(body => {
        const [x, y] = project(body);
        
        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', body.radius)
          .attr('fill', body.color)
          .attr('filter', 'url(#glow)');
      });
    };

    // Add glow effect
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

    /**
     * 2.3.5 Animation Loop
     */
    let animationFrame;
    const animate = () => {
      if (config.rotationSpeed !== 0) {
        rotation += config.rotationSpeed;
      }
      
      updateSystem();
      
      g.selectAll('*').remove();
      drawTails();
      drawBodies();
      
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [bodies, config]);

  /**
   * 2.4 UI Rendering
   */
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 bg-gray-900" ref={d3Container} />
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Control sliders */}
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
          {/* Additional controls remain the same */}
          {/* ... */}
        </div>
      </div>
    </div>
  );
};

export default CoordinateSpace;




















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
              Gravity
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={config.gravity}
              onChange={(e) => setConfig({
                ...config,
                gravity: parseFloat(e.target.value)
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
              Particle Count
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