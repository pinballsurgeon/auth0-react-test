// src/components/visualization/CoordinateSpace.js
// objective: fix container growth issue by simplifying layout and relying on parent flex constraints.

import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';
import { useWorkflowData } from '../../context/WorkflowDataContext';

// helper function for sampling arrays for logging
const sampleArray = (arr, count = 3) => { /* ... keep helper ... */ };

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const [isD3Initialized, setIsD3Initialized] = useState(false);

  const [config, setConfig] = useState({ /* ... keep config state ... */ });

  const { /* ... keep context consumption ... */ } = useWorkflowData();
  const points = usePoints(config.particleCount, workflowData);
  const project = useProjection();

  // --- Logging Hooks (keep logging) ---
  const loggedWorkflowRef = useRef(false);
  useEffect(() => { /* ... keep existing workflow log effect ... */ }, [workflowData, selectedPcaIteration]);
  useEffect(() => { /* ... keep existing points log effect ... */ }, [points, workflowData, loading]);

  // --- D3 Drawing Function (keep as is from previous step) ---
  const drawPoints = (gElement, pointsData, rotation, projConfig) => { /* ... keep drawPoints logic ... */ };

  // --- D3 Initialization Effect (keep as is from previous step) ---
  useEffect(() => {
      if (d3Container.current && !isD3Initialized) {
          console.log("[D3 Init] Initializing SVG and G elements.");
          const container = d3.select(d3Container.current);
          container.select('svg').remove();

          const svg = container.append('svg')
            .attr('width', '100%').attr('height', '100%') // Ensure SVG fills container
            .attr('preserveAspectRatio', 'xMidYMid meet');
          svgRef.current = svg.node();

          const defs = svg.append('defs');
           /* ... glow filter setup ... */
           const filter = defs.append('filter').attr('id', 'glow');
           filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'coloredBlur');
           const feMerge = filter.append('feMerge');
           feMerge.append('feMergeNode').attr('in', 'coloredBlur');
           feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

          const g = svg.append('g');
          gRef.current = g.node();

          const initialWidth = d3Container.current.clientWidth;
          const initialHeight = d3Container.current.clientHeight;
          if(initialWidth > 0 && initialHeight > 0) {
             svg.attr('viewBox', `${-initialWidth / 2} ${-initialHeight / 2} ${initialWidth} ${initialHeight}`);
             console.log("[D3 Init] Performing initial draw with initial points.");
             drawPoints(gRef.current, points, 0, config); // Draw initial state
          } else {
             console.warn("[D3 Init] Container zero dimensions during init.");
          }

          console.log("[D3 Init] SVG and G elements created.");
          setIsD3Initialized(true);
      }
      // Ensure dependencies allow initial draw correctly
  }, [isD3Initialized, points, config, drawPoints]); // Added drawPoints/config to dep array for initial draw consistency


  // --- D3 Animation Hook (keep as is from previous step) ---
  useAnimation((frameRotation) => {
    const container = d3Container.current;
    const svgNode = svgRef.current;
    const gNode = gRef.current;

    if (!isD3Initialized || !container || !svgNode || !gNode) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const svg = d3.select(svgNode);
    svg.attr('viewBox', `${-containerWidth / 2} ${-containerHeight / 2} ${containerWidth} ${containerHeight}`);

    // --- NO LONGER clearing G here, drawPoints handles enter/update/exit ---

    const rotation = frameRotation * config.rotationSpeed;
    drawPoints(gNode, points, rotation, config); // Update points

  }, [isD3Initialized, points, config, project, selectedPcaIteration, workflowData, drawPoints]); // Added drawPoints


  // --- Component Render ---
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10))
    : [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    // Resetting D3 init flag might still be useful if SVG structure needs change on new data type, but try without first
    // setIsD3Initialized(false);
    handleVisualize(searchInput);
  };

  // --- RETURN STATEMENT REVISED ---
  return (
    <VisualizationLayout
      header={<Header searchInput={searchInput} setSearchInput={setSearchInput} handleVisualize={handleFormSubmit}/>}
      controls={<Controls config={config} setConfig={setConfig} />}
    >
       {/*
          The direct child of VisualizationLayout's content area.
          This div will be the flex item that grows/shrinks (`flex-1 min-h-0`).
          Make IT the relative container for overlays.
       */}
       <div
         ref={d3Container}
         id="d3-visualization-container"
         className="relative w-full h-full bg-gray-800 overflow-hidden" // Takes full space given by VisualizationLayout; acts as relative parent
         // style={{ border: '1px dashed cyan' }} // Optional new border color for debugging this container
       >
          {/* SVG will be appended here by D3, width/height 100% will fill this container */}

          {/* Overlays are positioned relative to THIS container */}
          {!loading && availablePcaKeys.length > 0 && (
            <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded shadow">
              <label className="block text-white text-xs mb-1 font-semibold">PCA Iteration:</label>
              <select
                value={selectedPcaIteration}
                onChange={(e) => setSelectedPcaIteration(e.target.value)}
                className="p-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              >
                {availablePcaKeys.map((key) => (
                  <option key={key} value={key}>{key.replace('_pca', '').replace('batch', 'B')}</option>
                ))}
              </select>
            </div>
          )}

          {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>}
          {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;