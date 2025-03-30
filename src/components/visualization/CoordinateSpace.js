// src/components/visualization/CoordinateSpace.js
// objective: fix container growth issue and restore context variable definitions.

import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import VisualizationLayout from '../layout/VisualizationLayout';
import { Controls, Header } from './VisualizationComponents';
import { usePoints, useProjection, useAnimation } from '../../hooks/useVisualization';
import { useWorkflowData } from '../../context/WorkflowDataContext'; // Make sure this import is present

// helper function for sampling arrays for logging
const sampleArray = (arr, count = 3) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, count);
};

const CoordinateSpace = () => {
  const d3Container = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const [isD3Initialized, setIsD3Initialized] = useState(false);

  // --- Local Config State ---
  const [config, setConfig] = useState({
    rotationSpeed: 0.5,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    zoom: 1,
    particleCount: 50,
  });

  // --- Context Data ---
  // !!!!! THIS WAS THE MISSING PIECE !!!!! -> Restore the destructuring
  const {
    workflowData,
    loading,
    error,
    searchInput,
    selectedPcaIteration,
    setSearchInput,
    setSelectedPcaIteration,
    handleVisualize
  } = useWorkflowData();
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // --- Derived Data ---
  const points = usePoints(config.particleCount, workflowData); // Now workflowData is defined
  const project = useProjection();

  // --- Logging Hooks (keep logging) ---
  const loggedWorkflowRef = useRef(false);
  useEffect(() => {
      if (!workflowData) { loggedWorkflowRef.current = false; return; }
      if (workflowData && !loggedWorkflowRef.current) {
          console.groupCollapsed(`[Workflow Data Inspection] Domain: ${workflowData.domain}`);
          // ... (rest of workflow log) ...
          const rated = workflowData.ratedAttributes || [];
          const successfulRatings = rated.filter(item => item.success);
          const failedRatings = rated.filter(item => !item.success);
          console.log(`Domain Members Found: ${workflowData.domainMembers?.length || 0}`);
          console.log(`Rated Attributes: Total=${rated.length}, Success=${successfulRatings.length}, Failed=${failedRatings.length}`);
          console.log(`Global Attributes:`, workflowData.globalAttributes || 'Not Fetched');
          console.log(`Batches Processed (Images): ${workflowData.batches?.length || 0}`);
          if (successfulRatings.length > 0) console.log("Sample Success Item (ratedAttributes[0]):", successfulRatings[0]);
          else console.log("No successful ratings found.");
          if (failedRatings.length > 0) console.log(`First ${Math.min(3, failedRatings.length)} Failed Item(s):`, sampleArray(failedRatings, 3));
          else console.log("No failed ratings found.");
          const pcaKeys = Object.keys(rated[0] || {}).filter(k => k.startsWith('batch') && k.endsWith('_pca')).sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10));
          console.log("Available PCA Keys:", pcaKeys);
          console.log("Selected PCA Iteration (at log time):", selectedPcaIteration);
          console.groupEnd();
          loggedWorkflowRef.current = true;
      }
   }, [workflowData, selectedPcaIteration]);
  useEffect(() => {
      if (points && points.length > 0) {
          console.groupCollapsed("[Points Array Inspection]");
          console.log(`Source: ${workflowData ? 'Derived from WorkflowData (usePcaPoints)' : 'Dummy Points'}`);
          console.log(`Length: ${points.length}`);
          console.log("Sample Raw Points Structure (first 3):", sampleArray(points, 3));
          console.groupEnd();
      } else if (!loading) { // Now loading is defined
          console.log("[Points Array Inspection] Points array is currently empty.");
      }
  }, [points, workflowData, loading]); // Now loading is defined

  // --- D3 Drawing Function (Handles enter/update/exit) ---
  const drawPoints = (gElement, pointsData, rotation, projConfig) => {
     const g = d3.select(gElement);
     if (g.empty()) { console.error("[D3 Draw] G element ref is empty!"); return; }

     const pcaDataKey = selectedPcaIteration || ''; // Now selectedPcaIteration is defined

     const mappedPoints = pointsData.map((p, index) => {
        if (workflowData && pcaDataKey && p && typeof p === 'object' && p[pcaDataKey] && Array.isArray(p[pcaDataKey]) && p[pcaDataKey].length === 3) { // Now workflowData defined
             const [px, py, pz] = p[pcaDataKey];
             if (typeof px !== 'number' || isNaN(px) || typeof py !== 'number' || isNaN(py) || typeof pz !== 'number' || isNaN(pz)) return null;
             return { id: p.member || `pca-${index}-${pcaDataKey}`, x: px, y: py, z: pz, imageUrl: p.attributes?.imageUrl || null, member: p.member, radius: 5, color: d3.interpolateSpectral(index / pointsData.length) };
        }
        if (!workflowData && typeof p?.x === 'number' && typeof p?.y === 'number' && typeof p?.z === 'number') { // Now workflowData defined
             return { id: p?.member || `dummy-${index}`, x: p.x, y: p.y, z: p.z, imageUrl: p?.imageUrl || null, member: p?.member || null, radius: p?.radius || 5, color: p?.color || d3.interpolateSpectral(index / pointsData.length)};
        }
        return null;
     }).filter(p => p !== null);

     const circles = g.selectAll('circle')
       .data(mappedPoints, d => d.id);

     circles.exit().remove();

     circles.enter()
       .append('circle')
       .attr('r', 0)
       .attr('fill', (d) => d.color)
       .attr('filter', 'url(#glow)')
       .attr('cx', d => project(d, rotation, projConfig.zoom)[0])
       .attr('cy', d => project(d, rotation, projConfig.zoom)[1])
       .attr('r', (d) => d.radius)
       .merge(circles)
       .attr('r', (d) => d.radius)
       .attr('fill', (d) => d.color)
       .attr('cx', (d) => {
           const projected = project(d, rotation, projConfig.zoom);
           return isNaN(projected[0]) ? 0 : projected[0];
       })
       .attr('cy', (d) => {
           const projected = project(d, rotation, projConfig.zoom);
           return isNaN(projected[1]) ? 0 : projected[1];
       });
  };

  // --- D3 Initialization Effect ---
  // Added drawPoints/config back to dependency array for initial draw
  useEffect(() => {
    if (d3Container.current && !isD3Initialized) {
      console.log("[D3 Init] Initializing SVG and G elements.");
      const container = d3.select(d3Container.current);
      container.select('svg').remove();

      const svg = container.append('svg')
        .attr('width', '100%').attr('height', '100%')
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
  }, [isD3Initialized, points, config, drawPoints]); // drawPoints added here

  // --- D3 Animation Hook (Refactored for Update only) ---
  // Added drawPoints to dependency array
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

    const rotation = frameRotation * config.rotationSpeed;
    drawPoints(gNode, points, rotation, config); // Update points

  }, [isD3Initialized, points, config, project, selectedPcaIteration, workflowData, drawPoints]); // drawPoints added here


  // --- Component Render ---
  const availablePcaKeys = workflowData?.ratedAttributes?.length > 0 // Now workflowData is defined
    ? Object.keys(workflowData.ratedAttributes[0] || {})
        .filter((k) => k.startsWith('batch') && k.endsWith('_pca'))
        .sort((a, b) => parseInt(a.match(/\d+/)?.[0] || '0', 10) - parseInt(b.match(/\d+/)?.[0] || '0', 10))
    : [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleVisualize(searchInput); // Now handleVisualize and searchInput are defined
  };

  // --- RETURN STATEMENT ---
  return (
    <VisualizationLayout
      header={<Header searchInput={searchInput} setSearchInput={setSearchInput} handleVisualize={handleFormSubmit}/>} // Now vars defined
      controls={<Controls config={config} setConfig={setConfig} />}
    >
       <div
         ref={d3Container}
         id="d3-visualization-container"
         className="relative w-full h-full bg-gray-800 overflow-hidden"
       >
          {/* SVG will be appended here by D3 */}

          {/* Overlays are positioned relative to THIS container */}
          {!loading && availablePcaKeys.length > 0 && ( // Now loading defined
            <div className="absolute top-4 left-4 z-10 bg-gray-800 bg-opacity-75 p-2 rounded shadow">
              <label className="block text-white text-xs mb-1 font-semibold">PCA Iteration:</label>
              <select
                value={selectedPcaIteration} // Now var defined
                onChange={(e) => setSelectedPcaIteration(e.target.value)} // Now func defined
                className="p-1 bg-gray-700 text-white text-xs rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              >
                {availablePcaKeys.map((key) => (
                  <option key={key} value={key}>{key.replace('_pca', '').replace('batch', 'B')}</option>
                ))}
              </select>
            </div>
          )}

          {loading && <div className="absolute bottom-4 left-4 text-yellow-400 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Loading workflow data...</div>} {/* Now loading defined */}
          {error && <div className="absolute bottom-4 left-4 text-red-500 z-10 bg-gray-800 bg-opacity-75 px-2 py-1 rounded text-sm">Error: {error}</div>} {/* Now error defined */}
       </div>
    </VisualizationLayout>
  );
};

export default CoordinateSpace;