// src/components/visualization/CoordinateSpace.js

import React, { useRef, useState } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const [searchInput, setSearchInput] = useState('');
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

  // TODO: Replace this placeholder with real workflow data from WorkflowEngine.
  // When available, workflowData will include enriched domain item data (ratedAttributes)
  // with PCA fields and image URLs.
  const workflowData = null; // e.g., obtained via context or props

  // Use the new hook which conditionally returns PCA-based points if workflowData exists.
  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // Setup visualization: create defs and filters for visual effects.
  const setupVisualization = (svg) => {
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');

    filter
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    return svg.append('g');
  };

  // Draw points using D3.
  // This function now uses a fallback for properties (radius, color) if not defined.
  // In a future iteration, you can update this to render cubes with image pattern fills.
  const drawPoints = (g, points, rotation) => {
    // Use index as key (consider using a unique member identifier in the future)
    const circles = g.selectAll('circle').data(points, (d, i) => i);

    circles
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius || 5) // Default radius if not provided
      .attr('fill', (d) => {
        // Use image fill if available; otherwise, use a default color.
        // TODO: Replace with proper SVG pattern fill using d.imageUrl.
        return d.imageUrl ? '#fff' : d.color || d3.interpolateSpectral(Math.random());
      })
      .attr('filter', 'url(#glow)')
      .merge(circles)
      .attr('cx', (d) => project(d, rotation, config.zoom)[0])
      .attr('cy', (d) => project(d, rotation, config.zoom)[1]);

    circles.exit().remove();
  };

  // Animation: updates visualization continuously.
  useAnimation((rotation) => {
    if (!d3Container.current) return;

    // For points generated from the dummy generator, update their positions if method exists.
    points.forEach((point) => {
      if (typeof point.updatePosition === 'function') {
        point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
      }
      // For PCA-based points (plain objects), assume x,y,z are already computed.
      // Optionally, you could apply additional transformations here if needed.
    });

    // Initialize SVG if not already present.
    const svg = d3.select(d3Container.current).select('svg');
    if (svg.empty()) {
      d3.select(d3Container.current)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `-250 -250 500 500`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    }

    // Ensure the main group element is present.
    const g = svg.select('g');
    if (g.empty()) {
      setupVisualization(svg);
    }

    // Clear existing elements and redraw points.
    g.selectAll('*').remove();
    drawPoints(g, points, rotation * config.rotationSpeed);
  }, [points, config]);

  // Handle the visualize form submission.
  const handleVisualize = (e) => {
    e.preventDefault();
    setConfig((prev) => ({
      ...prev,
      particleCount: Math.max(searchInput.length, 1),
    }));
  };

  return (
    <VisualizationLayout
      header={
        <Header 
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          handleVisualize={handleVisualize}
        />
      }
      controls={
        <Controls 
          config={config}
          setConfig={setConfig}
        />
      }
    >
      <div 
        ref={d3Container}
        className="w-full h-full bg-gray-900 overflow-hidden"
        style={{ 
          margin: 'auto',
          width: '50%',
          height: '50%',
          minHeight: 0,
          maxHeight: '70%',
          aspectRatio: '1/1'
        }}
      />
    </VisualizationLayout>
  );
};

export default CoordinateSpace;



// // src/components/visualization/CoordinateSpace.js

// import React, { useRef, useState } from 'react';
// import * as d3 from 'd3';
// import VisualizationLayout from '../layout/VisualizationLayout';
// import { Controls, Header } from './VisualizationComponents';
// import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';

// const CoordinateSpace = () => {
//   const d3Container = useRef(null);
//   const [searchInput, setSearchInput] = useState('');
//   const [config, setConfig] = useState({
//     rotationSpeed: 0.5,
//     scaleX: 1,
//     scaleY: 1,
//     scaleZ: 1,
//     zoom: 1,
//     particleCount: 50,
//   });

//   const points = usePoints(config.particleCount);
//   const project = useProjection();

//   const setupVisualization = (svg) => {
//     const defs = svg.append('defs');
//     const filter = defs.append('filter').attr('id', 'glow');

//     filter
//       .append('feGaussianBlur')
//       .attr('stdDeviation', '2')
//       .attr('result', 'coloredBlur');

//     const feMerge = filter.append('feMerge');
//     feMerge.append('feMergeNode').attr('in', 'coloredBlur');
//     feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

//     return svg.append('g');
//   };

//   const drawPoints = (g, points, rotation) => {
//     const circles = g.selectAll('circle').data(points, (d, i) => i);

//     circles
//       .enter()
//       .append('circle')
//       .attr('r', (d) => d.radius)
//       .attr('fill', (d) => d.color)
//       .attr('filter', 'url(#glow)')
//       .merge(circles)
//       .attr('cx', (d) => project(d, rotation, config.zoom)[0])
//       .attr('cy', (d) => project(d, rotation, config.zoom)[1]);

//     circles.exit().remove();
//   };

//   useAnimation((rotation) => {
//     if (!d3Container.current) return;

//     // Update point positions
//     points.forEach((point) => {
//       point.updatePosition(config.scaleX, config.scaleY, config.scaleZ);
//     });

//     // Clear and setup visualization if needed
//     const svg = d3.select(d3Container.current).select('svg');
//     if (svg.empty()) {
//       d3.select(d3Container.current)
//         .append('svg')
//         .attr('width', '100%')
//         .attr('height', '100%')
//         .attr('viewBox', `-250 -250 500 500`)
//         .attr('preserveAspectRatio', 'xMidYMid meet');
//     }

//     const g = svg.select('g');
//     if (g.empty()) {
//       setupVisualization(svg);
//     }

//     // Draw points
//     g.selectAll('*').remove();
//     drawPoints(g, points, rotation * config.rotationSpeed);
//   }, [points, config]);

//   const handleVisualize = (e) => {
//     e.preventDefault();
//     setConfig((prev) => ({
//       ...prev,
//       particleCount: Math.max(searchInput.length, 1),
//     }));
//   };

//   return (
//     <VisualizationLayout
//       header={
//         <Header 
//           searchInput={searchInput}
//           setSearchInput={setSearchInput}
//           handleVisualize={handleVisualize}
//         />
//       }
//       controls={
//         <Controls 
//           config={config}
//           setConfig={setConfig}
//         />
//       }
//     >
//       <div 
//         ref={d3Container}
//         className="w-full h-full bg-gray-900 overflow-hidden"
//         style={{ 
//           margin: 'auto',
//           width: '50%',
//           height: '50%',
//           minHeight: 0,
//           maxHeight: '70%',
//           aspectRatio: '1/1'
//         }}
//       />
//     </VisualizationLayout>
//   );
// };

// export default CoordinateSpace;